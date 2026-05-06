import { createAnthropic } from "@ai-sdk/anthropic";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { HttpError } from "../types/types";
import { handleError } from "../lib/handle-error";
import { validatePerigonAuth } from "../lib/perigon-auth";
import { resolvePerigonApiKey } from "../lib/resolve-perigon-api-key";
import { buildSystemPrompt } from "../lib/system-prompt";
import { createRepairToolCall } from "../lib/repair-tool-call";
import {
  createStreamErrorHandler,
  logStreamTextError,
} from "../lib/stream-error-handler";
import { createAISDKTools } from "../mcp/ai-sdk-adapter";

const CHAT_MODEL_ID = "claude-opus-4-6";
const MAX_STEPS = 20;
const ANTHROPIC_KEY_PREFIX = "sk-ant-";
const ANTHROPIC_API_KEY_HEADER = "X-Anthropic-API-Key";

interface ChatRequestBody {
  messages?: UIMessage[];
}

interface ApiKeys {
  anthropicApiKey: string;
  perigonApiKey: string;
}

/**
 * Streams a Cerebro chat response using Anthropic + the Perigon tool set.
 * The frontend posts a UIMessage[] (v5 chat shape); we convert to ModelMessage[]
 * before handing them to `streamText`.
 */
export async function handleChat(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const isAuthenticated = await validatePerigonAuth(request);
    const { messages = [] } = (await request.json()) as ChatRequestBody;

    const apiKeys = await resolveApiKeys(request, env, isAuthenticated);
    if (apiKeys instanceof Response) return apiKeys;

    return runChat({ messages, ...apiKeys });
  } catch (error) {
    return handleChatError(error);
  }
}

async function resolveApiKeys(
  request: Request,
  env: Env,
  isAuthenticated: boolean
): Promise<ApiKeys | Response> {
  const anthropicApiKey = isAuthenticated
    ? env.ANTHROPIC_API_KEY
    : request.headers.get(ANTHROPIC_API_KEY_HEADER);

  if (!anthropicApiKey) {
    return handleError(
      isAuthenticated
        ? "Internal server error: Anthropic API key not configured"
        : "Authentication required. Please sign in with Perigon or provide API keys.",
      isAuthenticated ? 500 : 401,
      isAuthenticated
        ? "Missing internal Anthropic API key"
        : "Authentication required"
    );
  }

  if (isAuthenticated && !anthropicApiKey.startsWith(ANTHROPIC_KEY_PREFIX)) {
    return handleError(
      "Invalid Anthropic API key format",
      500,
      "Invalid internal Anthropic API key"
    );
  }

  const perigonApiKey = await resolvePerigonApiKey(request, isAuthenticated);
  if (!perigonApiKey || perigonApiKey.trim().length === 0) {
    return handleError(
      isAuthenticated
        ? "No Perigon API key available. Please create an API key in your Perigon dashboard."
        : "Authentication required. Please sign in with Perigon or provide API keys.",
      isAuthenticated ? 400 : 401,
      isAuthenticated
        ? "No Perigon API key available"
        : "Authentication required"
    );
  }

  return { anthropicApiKey, perigonApiKey };
}

interface RunChatArgs extends ApiKeys {
  messages: UIMessage[];
}

function runChat({
  messages,
  anthropicApiKey,
  perigonApiKey,
}: RunChatArgs): Response {
  const anthropic = createAnthropic({ apiKey: anthropicApiKey });
  const tools = createAISDKTools(perigonApiKey);
  const systemPrompt = resolveSystemPrompt(messages);

  const result = streamText({
    model: anthropic(CHAT_MODEL_ID),
    tools,
    // Spread `system` only when defined so we don't pass `undefined` to an
    // optional property (incompatible with `exactOptionalPropertyTypes`).
    ...(systemPrompt !== undefined ? { system: systemPrompt } : {}),
    messages: convertToModelMessages(messages),
    stopWhen: stepCountIs(MAX_STEPS),
    experimental_repairToolCall: createRepairToolCall(anthropic, CHAT_MODEL_ID),
    onError: logStreamTextError,
  });

  return result.toUIMessageStreamResponse({
    headers: {
      "Transfer-Encoding": "chunked",
      Connection: "keep-alive",
    },
    onError: createStreamErrorHandler(),
  });
}

/**
 * If the client already provided a system message, leave the conversation
 * alone. Otherwise generate a fresh dated system prompt for `streamText`.
 */
function resolveSystemPrompt(messages: UIMessage[]): string | undefined {
  const hasSystem = messages.some((msg) => msg.role === "system");
  return hasSystem ? undefined : buildSystemPrompt();
}

function handleChatError(error: unknown): Response {
  console.error("Error processing chat request:", error);
  if (error instanceof HttpError) {
    return handleError(error.responseBody, error.statusCode, error.message);
  }
  return handleError(
    "Failed to process request",
    500,
    error instanceof Error ? error.message : String(error)
  );
}
