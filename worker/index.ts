import { HttpError, TurnstileVerificationResponse } from "./types/types";
import { createAnthropic } from "@ai-sdk/anthropic";
import {
  streamText,
  generateObject,
  generateText,
  NoSuchToolError,
  InvalidToolArgumentsError,
  ToolExecutionError,
  CoreMessage,
} from "ai";
import { PerigonMCP, Props } from "./mcp/mcp";
// import { PerigonMCP } from "./mcp/temp";
import { convertMCPResult, createAISDKTools } from "./mcp/ai-sdk-adapter";
import { Perigon } from "./lib/perigon";
import { TOOL_DEFINITIONS } from "./mcp/tools";
import { zodToJsonSchema } from "zod-to-json-schema";
import { hashKey } from "./lib/hash";
import { handleError } from "./lib/handle-error";
import { authenticate } from "./lib/auth";
import {
  fetchPerigonApiKeys,
  parseApiKeysResponse,
  getFirstApiKey,
} from "./lib/api-keys-utils";

export { PerigonMCP };

const SYSTEM_PROMPT = `
You are Cerebro, a helpful, intelligent ai agent made by Perigon to assist users with their queries.
You have access to realtime information
You should always respond to the user, never leave off on a tool call, summarize the results after calling all your tools.

Follow instructions outlined in the <instructions> section.
Consider the <context> section when making decisions.s

<instructions>
- Utilize the provided tools when needed to answer the user's question.
- Try to follow the tool schemas as best as possible to ensure best results when calling them
- Never refer to yourself as an Openai, Anthropic, or any other llm model.
- When querying using the Perigon API tools try to use location related fields when filtering by
location, similarly do the same with time related fields when filtering by time.
- When doing a search for stories, articles, etc, try to be mindful of the sorting you are doing
relative to the date. For instance if you are trying to sort by count, consider setting the "from"
parameter to some time in the past week or so to ensure the results are more relevant to today.
- If someone asks something about in the past day, you should try to set from to yesterday
- You should never direct users to other products besides the Perigon API.
- If customers ask questions directly about Perigon API, docs, or pricing refer them to our documentation: https://docs.perigon.io.
</instructions>

<context>
Ignore everything you think you know about the current date. The following information is realtime
and accurate:

Today is: {{date}} (in UTC)

Common date references for filtering:
- Today: {{date}}
- Yesterday: {{yesterday}}
- 3 days ago: {{threeDaysAgo}}
- 1 week ago: {{oneWeekAgo}}
- 2 weeks ago: {{twoWeeksAgo}}
- 1 month ago: {{oneMonthAgo}}

You work at Perigon and have access to a variety of tools that allow you to search
across various news related datasets such as:
- News Articles
- News Stories (Headlines)
- News Sources (Publishers: cnn, fox, nytimes, etc)
- Journalists
- People
- Companies

Use these tools to help answer questions the user may ask.
</context>

<important>
Call your tools relentlessly to find the best answer, only give up if the tools are not
well suited to answer the question or if you have done too many attempts.
</important>

<critical>
Assume any news articles you find are accurate and up to date unless they conflict with other information present in conversation.
</critical>
`.trimStart();

export default {
  /**
   * Main request handler for the Worker
   */
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    // API keys are now optional - can be provided by users via headers
    // Only log warnings if both env vars are missing
    if (!env.PERIGON_API_KEY && !env.ANTHROPIC_API_KEY) {
      console.warn(
        "No default API keys configured - users must provide their own keys"
      );
    }

    const url = new URL(request.url);

    if (url.pathname === "/v1/auth") {
      return handleAuthRequest(request, env);
    }

    if (url.pathname === "/v1/validate-user") {
      return handleValidateUserRequest(request, env);
    }

    if (url.pathname === "/v1/perigon-api-keys") {
      return handlePerigonApiKeysRequest(request, env);
    }

    if (url.pathname === "/v1/api/chat") {
      return handleChatRequest(request, env);
    }

    if (url.pathname === "/v1/api/tools") {
      return handleToolRequest(request, env);
    }

    console.log("url.pathname", url.pathname);

    if (
      url.pathname === "/v1/sse" ||
      url.pathname === "/v1/sse/message" ||
      url.pathname === "/v1/mcp"
    ) {
      return handleMCPRequest(request, env, ctx);
    }

    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;

/**
 * AUTH HELPER
 */
async function validatePerigonAuth(request: Request): Promise<boolean> {
  try {
    const response = await fetch("https://api.perigon.io/v1/user", {
      headers: {
        Cookie: request.headers.get("Cookie") || "",
      },
    });
    return response.ok;
  } catch (error) {
    console.error("Error validating Perigon auth:", error);
    return false;
  }
}

/**
 * VALIDATE USER PROXY
 */
async function handleValidateUserRequest(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method !== "GET") {
    return handleError("Method not allowed", 405);
  }

  try {
    const response = await fetch("https://api.perigon.io/v1/user", {
      headers: {
        Cookie: request.headers.get("Cookie") || "",
        "User-Agent": request.headers.get("User-Agent") || "",
        Accept: "application/json",
      },
    });

    if (response.ok) {
      const userData = await response.json();
      // Return clean response without Set-Cookie headers to prevent cookie clearing
      return Response.json(userData);
    } else {
      return new Response(null, { status: response.status });
    }
  } catch (error) {
    console.error("Error validating user:", error);
    return handleError("User validation failed", 500);
  }
}

/**
 * PERIGON API KEYS
 */
async function handlePerigonApiKeysRequest(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method !== "GET") {
    return handleError("Method not allowed", 405);
  }

  // Validate authentication first
  if (!(await validatePerigonAuth(request))) {
    return handleError("Authentication required", 401);
  }

  try {
    const apiKeys = await fetchPerigonApiKeys(
      request.headers.get("Cookie") || ""
    );
    return Response.json(apiKeys);
  } catch (error) {
    console.error("Error fetching API keys:", error);
    return handleError("Failed to fetch API keys", 500);
  }
}

/**
 * AUTH
 */
async function handleAuthRequest(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method !== "POST") {
    return handleError("Method not allowed", 405);
  }
  const token = request.headers.get("cf-turnstile-response");
  const ip = request.headers.get("CF-Connecting-IP");
  // Validate the token by calling the
  // "/siteverify" API endpoint.
  const idempotencyKey = crypto.randomUUID();
  const url = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
  const verify = await fetch(url, {
    body: JSON.stringify({
      secret: env.TURNSTILE_SECRET_KEY,
      response: token,
      remoteip: ip,
      idempotency_key: idempotencyKey,
    }),
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!((await verify.json()) as TurnstileVerificationResponse).success) {
    return handleError(
      "Bad Request",
      400,
      "Missing or invalid turnstile token"
    );
  }
  const secret = crypto.randomUUID(); // mint a secret key for FE to use
  await env.AUTH_KV.put(secret, "valid", {
    expirationTtl: 60 * 30, // 30 minutes
  });

  return Response.json({
    secret,
  });
}

/**
 * TOOLs
 */
async function handleToolRequest(
  request: Request,
  env: Env
): Promise<Response> {
  switch (request.method) {
    case "GET":
      const tools = [];
      for (const [tool, def] of Object.entries(TOOL_DEFINITIONS)) {
        tools.push({
          name: tool,
          description: def.description,
          args: zodToJsonSchema(def.parameters),
        });
      }

      return new Response(JSON.stringify({ tools }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    case "POST":
      try {
        // Validate Perigon authentication first
        const isPerigonAuthenticated = await validatePerigonAuth(request);

        const body = (await request.json()) as { tool: string; args: any };
        const tool = body.tool;
        const args = body.args;

        if (!tool || !args) {
          return new Response("Invalid request", { status: 400 });
        }

        const toolDef = TOOL_DEFINITIONS[tool];
        if (!toolDef) {
          return new Response("Tool not found", { status: 404 });
        }

        let perigonApiKey: string | null = null;

        // For authenticated Perigon users, get their selected API key
        if (isPerigonAuthenticated) {
          // Get user's selected Perigon API key from header
          const userPerigonKey = request.headers.get("X-Perigon-API-Key");

          if (userPerigonKey && userPerigonKey.trim().length > 0) {
            perigonApiKey = userPerigonKey;
          } else {
            // Fallback: fetch user's first available API key
            try {
              const apiKeys = await fetchPerigonApiKeys(
                request.headers.get("Cookie") || ""
              );
              perigonApiKey = getFirstApiKey(apiKeys);
            } catch (error) {
              console.error(
                "Error fetching Perigon API keys in tools endpoint:",
                error
              );
            }
          }
        } else {
          // For non-authenticated users, require manual API key
          const userPerigonKey = request.headers.get("X-Perigon-API-Key");
          console.log("Tools endpoint - userPerigonKey 2:", userPerigonKey);

          if (!userPerigonKey || userPerigonKey.trim().length === 0) {
            return handleError(
              "Authentication required. Please sign in with Perigon or provide a valid API key.",
              401,
              "Authentication required"
            );
          }

          perigonApiKey = userPerigonKey;
        }

        // Validate that we have a Perigon API key
        if (!perigonApiKey) {
          return handleError(
            "No Perigon API key available. Please create an API key in your Perigon dashboard or select one from the dropdown.",
            400,
            "No Perigon API key available"
          );
        }

        // Validate and transform args using the tool's Zod schema
        let validatedArgs;
        try {
          validatedArgs = toolDef.parameters.parse(args);
        } catch (error) {
          console.error("Validation error for tool", tool, ":", error);
          return handleError(
            "Invalid Arguments",
            400,
            error instanceof Error ? error.message : String(error)
          );
        }
        const result = await toolDef.createHandler(new Perigon(perigonApiKey))(
          validatedArgs
        );
        return new Response(
          JSON.stringify({ result: convertMCPResult(result) }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          }
        );
      } catch (error) {
        if (error instanceof HttpError) {
          return handleError(
            error.responseBody,
            error.statusCode,
            error.message
          );
        }
        console.error("Error executing tool:", error);
        return handleError(
          "Failed to execute tool",
          500,
          error instanceof Error ? error.message : String(error)
        );
      }
    default:
      return new Response("Method not allowed", { status: 405 });
  }
}

/**
 * CHAT
 */
async function handleChatRequest(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  try {
    // Validate Perigon authentication first
    const isPerigonAuthenticated = await validatePerigonAuth(request);

    const { messages = [] } = (await request.json()) as {
      messages: CoreMessage[];
    };

    let anthropicApiKey: string;
    let perigonApiKey: string | null = null;

    // For authenticated Perigon users, always use internal Anthropic key
    if (isPerigonAuthenticated) {
      anthropicApiKey = env.ANTHROPIC_API_KEY;

      // Get user's selected Perigon API key or fetch first available
      const userPerigonKey = request.headers.get("X-Perigon-API-Key");

      if (userPerigonKey && userPerigonKey.trim().length > 0) {
        perigonApiKey = userPerigonKey;
      } else {
        // Fetch user's API keys from Perigon
        try {
          const apiKeys = await fetchPerigonApiKeys(
            request.headers.get("Cookie") || ""
          );
          perigonApiKey = getFirstApiKey(apiKeys);
          if (!perigonApiKey) {
            console.log("Chat endpoint - no API keys found in fallback");
          }
        } catch (error) {
          console.error("Error fetching Perigon API keys:", error);
        }
      }
    } else {
      // For non-authenticated users, require manual API keys
      const userAnthropicKey = request.headers.get("X-Anthropic-API-Key");
      const userPerigonKey = request.headers.get("X-Perigon-API-Key");

      if (!userAnthropicKey || !userPerigonKey) {
        return handleError(
          "Authentication required. Please sign in with Perigon or provide API keys.",
          401,
          "Authentication required"
        );
      }

      anthropicApiKey = userAnthropicKey;
      perigonApiKey = userPerigonKey;
    }

    // Validate required keys
    if (!anthropicApiKey) {
      return handleError(
        "Internal server error: Anthropic API key not configured",
        500,
        "Missing internal Anthropic API key"
      );
    }

    if (!perigonApiKey) {
      return handleError(
        "No Perigon API key available. Please create an API key in your Perigon dashboard.",
        400,
        "No Perigon API key available"
      );
    }

    // Validate API key formats
    if (!anthropicApiKey.startsWith("sk-ant-")) {
      return handleError(
        "Invalid Anthropic API key format",
        500,
        "Invalid internal Anthropic API key"
      );
    }

    // Basic validation - just check if key is not empty
    if (perigonApiKey.trim().length === 0) {
      return handleError(
        "Invalid Perigon API key",
        400,
        "Invalid Perigon API key"
      );
    }

    // Add system prompt if not present
    if (!messages.some((msg) => msg.role === "system")) {
      const now = new Date();
      const today = now.toISOString().split("T")[0];
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      messages.unshift({
        role: "system",
        content: SYSTEM_PROMPT.replaceAll("{{date}}", today)
          .replaceAll("{{yesterday}}", yesterday)
          .replaceAll("{{threeDaysAgo}}", threeDaysAgo)
          .replaceAll("{{oneWeekAgo}}", oneWeekAgo)
          .replaceAll("{{twoWeeksAgo}}", twoWeeksAgo)
          .replaceAll("{{oneMonthAgo}}", oneMonthAgo),
      });
    }

    const anthropic = createAnthropic({
      apiKey: anthropicApiKey,
    });

    const tools = createAISDKTools(perigonApiKey);

    const result = streamText({
      model: anthropic("claude-4-sonnet-20250514"),
      tools,
      messages,
      maxSteps: 20,
      experimental_repairToolCall: async ({
        toolCall,
        tools,
        error,
        messages,
        system,
        parameterSchema,
      }) => {
        console.log(`Attempting to repair tool call: ${toolCall.toolName}`, {
          error: error.message,
          args: toolCall.args,
        });

        // For invalid arguments, use structured generation to fix them
        if (InvalidToolArgumentsError.isInstance(error)) {
          try {
            const tool = tools[toolCall.toolName as keyof typeof tools];
            if (!tool) {
              console.error(
                `Tool ${toolCall.toolName} not found in tools object`
              );
              return null;
            }

            const { object: repairedArgs } = await generateObject({
              model: anthropic("claude-4-sonnet-20250514"),
              schema: tool.parameters,
              prompt: [
                `The AI model tried to call the tool "${toolCall.toolName}" with invalid arguments:`,
                JSON.stringify(toolCall.args),
                `The tool accepts the following schema:`,
                JSON.stringify(parameterSchema(toolCall)),
                `Please fix the arguments to match the schema exactly. Focus on:`,
                `- Correct data types (string, number, boolean, array, object)`,
                `- Required fields that may be missing`,
                `- Proper formatting and structure`,
                `- Valid enum values if applicable`,
              ].join("\n"),
            });

            console.log(
              `Successfully repaired arguments for ${toolCall.toolName}:`,
              repairedArgs
            );
            return { ...toolCall, args: JSON.stringify(repairedArgs) };
          } catch (repairError) {
            console.error(
              `Failed to repair tool call ${toolCall.toolName}:`,
              repairError
            );
            return null;
          }
        }

        // For unknown tools, don't attempt repair
        if (NoSuchToolError.isInstance(error)) {
          console.log(`Tool ${toolCall.toolName} not found, cannot repair`);
          return null;
        }

        // For execution errors, retry with conversation context
        if (ToolExecutionError.isInstance(error)) {
          try {
            console.log(
              `Attempting to retry tool call ${toolCall.toolName} with context`
            );

            const retryResult = await generateText({
              model: anthropic("claude-4-sonnet-20250514"),
              system:
                system ||
                SYSTEM_PROMPT.replaceAll(
                  "{{date}}",
                  new Date().toISOString().split("T")[0]
                )
                  .replaceAll(
                    "{{yesterday}}",
                    new Date(Date.now() - 24 * 60 * 60 * 1000)
                      .toISOString()
                      .split("T")[0]
                  )
                  .replaceAll(
                    "{{threeDaysAgo}}",
                    new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
                      .toISOString()
                      .split("T")[0]
                  )
                  .replaceAll(
                    "{{oneWeekAgo}}",
                    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                      .toISOString()
                      .split("T")[0]
                  )
                  .replaceAll(
                    "{{twoWeeksAgo}}",
                    new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
                      .toISOString()
                      .split("T")[0]
                  )
                  .replaceAll(
                    "{{oneMonthAgo}}",
                    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                      .toISOString()
                      .split("T")[0]
                  ),
              messages: [
                ...messages,
                {
                  role: "assistant",
                  content: [
                    {
                      type: "tool-call",
                      toolCallId: toolCall.toolCallId,
                      toolName: toolCall.toolName,
                      args: toolCall.args,
                    },
                  ],
                },
                {
                  role: "tool",
                  content: [
                    {
                      type: "tool-result",
                      toolCallId: toolCall.toolCallId,
                      toolName: toolCall.toolName,
                      result: `Error: ${String(
                        error
                      )}. Please try again with corrected parameters or a different approach.`,
                    },
                  ],
                },
              ],
              tools,
            });

            const newToolCall = retryResult.toolCalls.find(
              (newCall) => newCall.toolName === toolCall.toolName
            );

            if (newToolCall) {
              console.log(
                `Successfully generated new tool call for ${toolCall.toolName}`
              );
              return {
                toolCallType: "function" as const,
                toolCallId: toolCall.toolCallId,
                toolName: toolCall.toolName,
                args: JSON.stringify(newToolCall.args),
              };
            } else {
              console.log(
                `No new tool call generated for ${toolCall.toolName}`
              );
              return null;
            }
          } catch (retryError) {
            console.error(
              `Failed to retry tool call ${toolCall.toolName}:`,
              retryError
            );
            return null;
          }
        }

        console.log(
          `Unknown error type for tool call ${toolCall.toolName}, cannot repair`
        );
        return null;
      },
    });

    return result.toDataStreamResponse({
      sendReasoning: false,
      headers: {
        "Transfer-Encoding": "chunked",
        Connection: "keep-alive",
      },
      getErrorMessage: (error) => {
        // Errs is a tuple of error user will see and error backend will log
        const errs = NoSuchToolError.isInstance(error)
          ? ([
              "Model tried to call an unknown tool",
              `Model tried to call unknown tool: ${error.toolName} - ${error.message}`,
            ] as const)
          : InvalidToolArgumentsError.isInstance(error)
          ? ([
              "Model called a tool with invalid arguments",
              `Model called tool: ${error.toolName} with invalid args: ${error.toolArgs} - ${error.message}`,
            ] as const)
          : ToolExecutionError.isInstance(error)
          ? ([
              "An error occurred during tool execution",
              `Tool execution failed: ${error.toolName} with args: ${error.toolArgs} - ${error.message}`,
            ] as const)
          : (["An unknown error occurred", `Unknown error: ${error}`] as const);

        console.error("Error while processing chat response:", errs[1]);
        return errs[0];
      },
    });
  } catch (error) {
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
}

/**
 * MCP
 */
async function handleMCPRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext
) {
  try {
    const url = new URL(request.url);
    const apiKey = request.headers.get("Authorization")?.split(" ")[1];
    if (!apiKey) {
      return handleError("Unauthorized", 401);
    }
    // Rate limiting is only available in production (Cloudflare Workers)
    // see: https://github.com/cloudflare/workers-sdk/issues/8661
    const key = await hashKey(apiKey);
    const { success } = await env.MCP_RATE_LIMITER.limit({ key });
    if (!success) {
      return handleError(
        "Rate limit exceeded",
        429,
        "You have exceeded allowed number of mcp related requests for this period"
      );
    }

    const perigon = new Perigon(apiKey);

    const apiKeyDetails = await perigon.introspection();

    console.log("apiKeyDetails", apiKeyDetails);

    const props: Props = {
      apiKey,
      scopes: apiKeyDetails.scopes,
    };
    ctx.props = props;

    if (url.pathname === "/v1/sse" || url.pathname === "/v1/sse/message") {
      return PerigonMCP.serveSSE("/v1/sse").fetch(request, env, ctx);
    }

    if (url.pathname === "/v1/mcp") {
      return PerigonMCP.serve("/v1/mcp").fetch(request, env, ctx);
    }

    return new Response("Not found", { status: 404 });
  } catch (error) {
    console.error("Failed to process MCP request:", error);
    if (!(error instanceof HttpError)) {
      return handleError(
        "Failed to process MCP request",
        500,
        "Error: " + (error instanceof Error ? error.message : String(error))
      );
    }

    return handleError(
      "Failed to process MCP request",
      error.statusCode,
      error.responseBody
    );
  }
}
