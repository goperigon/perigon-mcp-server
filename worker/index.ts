import {
  ChatMessage,
  HttpError,
  AuthIntrospectionResponse,
} from "./types/types";
import { createAnthropic } from "@ai-sdk/anthropic";
import {
  streamText,
  NoSuchToolError,
  InvalidToolArgumentsError,
  ToolExecutionError,
  experimental_createMCPClient,
} from "ai";
import { PerigonMCP } from "./mcp/mcp";

const SYSTEM_PROMPT = `
<identity>
You are Cerebro, an ai agent made by Perigon to assist users with their queries.
You should never direct users to other products besides the Perigon API.
If customers ask questions directly about Perigon API, docs, or pricing refer
them to our documentation: https://docs.perigon.io.

You do have access to realtime information

Follow instructions outlined in the <instructions> section.
Consider the <context> section when making decisions.
</identity>

<instructions>
- Utilize the provided tools when needed to answer the user's question.
- Try to follow the tool schemas as best as possible to ensure best results when calling them
- Never refer to yourself as an Openai, Anthropic, or any other llm model.
- When querying using the Perigon API tools try to use location related fields when filtering by
location, similarly do the same with time related fields when filtering by time.
</instructions>

<context>
Today is: {{date}} (in UTC)

You work at Perigon and have access to a variety of tools that allow you to search
across various news related datasets such as:
- News Articles
- News Stories (Headlines)
- News Sources (Publishers: cnn, fox, nytimes, etc)
- Journalists
- People
- Companies

Use these tools to help answer questions the user may ask.
</context>`.trimStart();

export { PerigonMCP };

export default {
  /**
   * Main request handler for the Worker
   */
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    if (!env.PERIGON_API_KEY || !env.ANTHROPIC_API_KEY) {
      const missingPerigon = !env.PERIGON_API_KEY;
      const missingKey = missingPerigon
        ? "PERIGON_API_KEY"
        : "ANTHROPIC_API_KEY";
      const error = missingPerigon
        ? "PERIGON_API_KEY not configured"
        : "ANTHROPIC_API_KEY not configured";

      console.error(`${missingKey} is not set`);
      return new Response(JSON.stringify({ error }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }

    const url = new URL(request.url);

    if (url.pathname === "/v1/api/chat") {
      if (request.method !== "POST") {
        return new Response("Method not allowed", { status: 405 });
      }
      return handleChatRequest(request, env);
    }

    if (url.pathname.includes("/v1/sse") || url.pathname === "/v1/mcp") {
      return handleMCPRequest(request, env, ctx);
    }

    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;

/**
 * Handles chat API requests
 */
async function handleChatRequest(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const { messages = [] } = (await request.json()) as {
      messages: ChatMessage[];
    };

    // Add system prompt if not present
    if (!messages.some((msg) => msg.role === "system")) {
      messages.unshift({
        role: "system",
        content: SYSTEM_PROMPT.replaceAll(
          "{{date}}",
          new Date().toISOString().split("T")[0],
        ),
      });
    }

    const anthropic = createAnthropic({
      apiKey: env.ANTHROPIC_API_KEY,
    });

    const perigonMcp = await experimental_createMCPClient({
      transport: {
        type: "sse",
        url: `${env.MCP_URL}/v1/sse`,
        headers: {
          Authorization: `Bearer ${env.PERIGON_API_KEY}`,
        },
      },
    });
    await perigonMcp.init();
    const tools = await perigonMcp.tools();

    const result = streamText({
      model: anthropic("claude-4-sonnet-20250514"),
      tools,
      messages,
      maxSteps: 5,
      onFinish: async () => {
        await perigonMcp.close();
      },
    });

    return result.toDataStreamResponse({
      sendReasoning: false,
      getErrorMessage: (error) => {
        console.error("Error while processing chat response:", error);
        if (NoSuchToolError.isInstance(error)) {
          return "The model tried to call a unknown tool.";
        } else if (InvalidToolArgumentsError.isInstance(error)) {
          return "The model called a tool with invalid arguments.";
        } else if (ToolExecutionError.isInstance(error)) {
          return "An error occurred during tool execution.";
        } else {
          return "An unknown error occurred.";
        }
      },
    });
  } catch (error) {
    console.error("Error processing chat request:", error);

    return new Response(
      JSON.stringify({
        error: "Failed to process request",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      },
    );
  }
}

/**
 * Handles MCP requests
 */
async function handleMCPRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const authHeader = request.headers.get("authorization")?.toLowerCase();
    if (!authHeader || !authHeader.startsWith("bearer ")) {
      return new Response("Unauthorized", { status: 401 });
    }

    const apiKey = authHeader.replace("bearer ", "");
    if (!apiKey) {
      return new Response("Unauthorized", { status: 401 });
    }

    const apiKeyDetails = await typedFetch<AuthIntrospectionResponse>(
      "https://api.perigon.io/v1/auth/introspect",
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      },
    );

    ctx.props = {
      apiKey,
      scopes: apiKeyDetails.scopes,
    };

    if (url.pathname.includes("/sse")) {
      return PerigonMCP.serveSSE("/v1/sse").fetch(request, env, ctx);
    }

    if (url.pathname.includes("/mcp")) {
      return PerigonMCP.serve("/v1/mcp").fetch(request, env, ctx);
    }

    return new Response("Not found", { status: 404 });
  } catch (error) {
    if (!(error instanceof HttpError)) {
      return Response.json(
        {
          error: "Failed to process MCP request",
          details:
            "Error: " +
            (error instanceof Error ? error.message : String(error)),
        },
        { status: 500 },
      );
    }

    return Response.json(
      {
        error: "Failed to process MCP request",
        details: error.responseBody,
      },
      { status: error.statusCode },
    );
  }
}

export async function typedFetch<T>(
  url: string,
  options: RequestInit,
): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    const responseBody = await response.text();
    console.error(
      `Failed to fetch: status: ${response.status} response: ${responseBody}`,
    );

    throw new HttpError(response.status, responseBody);
  }

  const typedResp = (await response.json()) as T;
  return typedResp;
}
