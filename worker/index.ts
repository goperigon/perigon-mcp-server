import { HttpError } from "./types/types";
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
import { convertMCPResult, createAISDKTools } from "./mcp/ai-sdk-adapter";
import { Perigon } from "./lib/perigon";
import { TOOL_DEFINITIONS } from "./mcp/tools";
import { zodToJsonSchema } from "zod-to-json-schema";
import { hashKey } from "./lib/hash";
import { handleError } from "./lib/handle-error";

export { PerigonMCP };

const SYSTEM_PROMPT = `
<identity>
You are Cerebro, a helpful, intelligent ai agent made by Perigon to assist users with their queries.
You have access to realtime information
You should always respond to the user, never leave off on a tool call, summarize the results after calling all your tools.

Follow instructions outlined in the <instructions> section.
Consider the <context> section when making decisions.
</identity>

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
`.trimStart();

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
      return handleError(error, 500);
    }

    const url = new URL(request.url);

    if (url.pathname === "/v1/api/chat") {
      return handleChatRequest(request, env);
    }

    if (url.pathname === "/v1/api/tools") {
      return handleToolRequest(request, env);
    }

    try {
      const apiKey = request.headers.get("Authorization")?.split(" ")[1];
      if (!apiKey) {
        return handleError("Unauthorized", 401);
      }
      // Rate limiting is only available in production (Cloudflare Workers)
      // see: https://github.com/cloudflare/workers-sdk/issues/8661
      if (env.MCP_RATE_LIMITER) {
        const key = await hashKey(apiKey);
        const { success } = await env.MCP_RATE_LIMITER.limit({ key });
        if (!success) {
          return handleError(
            "Rate limit exceeded",
            429,
            "You have exceeded allowed number of mcp related requests",
          );
        }
      }

      const perigon = new Perigon(apiKey);

      const apiKeyDetails = await perigon.introspection();

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
          "Error: " + (error instanceof Error ? error.message : String(error)),
        );
      }

      return handleError(
        "Failed to process MCP request",
        error.statusCode,
        error.responseBody,
      );
    }
  },
} satisfies ExportedHandler<Env>;

/**
 * Handles tool API requests
 */
async function handleToolRequest(
  request: Request,
  env: Env,
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

      // Validate and transform args using the tool's Zod schema
      let validatedArgs;
      try {
        validatedArgs = toolDef.parameters.parse(args);
      } catch (error) {
        console.error("Validation error for tool", tool, ":", error);
        return handleError(
          "Invalid Arguments",
          400,
          error instanceof Error ? error.message : String(error),
        );
      }

      const result = await toolDef.createHandler(
        new Perigon(env.PERIGON_API_KEY),
      )(validatedArgs);
      return new Response(
        JSON.stringify({ result: convertMCPResult(result) }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    default:
      return handleError("Method not allowed", 405);
  }
}

/**
 * Handles chat API requests
 */
async function handleChatRequest(
  request: Request,
  env: Env,
): Promise<Response> {
  if (request.method !== "POST") {
    return handleError("Method not allowed", 405);
  }
  try {
    const { messages = [] } = (await request.json()) as {
      messages: CoreMessage[];
    };

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
      apiKey: env.ANTHROPIC_API_KEY,
    });

    const tools = createAISDKTools(env.PERIGON_API_KEY);

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
                `Tool ${toolCall.toolName} not found in tools object`,
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
              repairedArgs,
            );
            return { ...toolCall, args: JSON.stringify(repairedArgs) };
          } catch (repairError) {
            console.error(
              `Failed to repair tool call ${toolCall.toolName}:`,
              repairError,
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
              `Attempting to retry tool call ${toolCall.toolName} with context`,
            );

            const retryResult = await generateText({
              model: anthropic("claude-4-sonnet-20250514"),
              system:
                system ||
                SYSTEM_PROMPT.replaceAll(
                  "{{date}}",
                  new Date().toISOString().split("T")[0],
                )
                  .replaceAll(
                    "{{yesterday}}",
                    new Date(Date.now() - 24 * 60 * 60 * 1000)
                      .toISOString()
                      .split("T")[0],
                  )
                  .replaceAll(
                    "{{threeDaysAgo}}",
                    new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
                      .toISOString()
                      .split("T")[0],
                  )
                  .replaceAll(
                    "{{oneWeekAgo}}",
                    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                      .toISOString()
                      .split("T")[0],
                  )
                  .replaceAll(
                    "{{twoWeeksAgo}}",
                    new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
                      .toISOString()
                      .split("T")[0],
                  )
                  .replaceAll(
                    "{{oneMonthAgo}}",
                    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                      .toISOString()
                      .split("T")[0],
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
                      result: `Error: ${String(error)}. Please try again with corrected parameters or a different approach.`,
                    },
                  ],
                },
              ],
              tools,
            });

            const newToolCall = retryResult.toolCalls.find(
              (newCall) => newCall.toolName === toolCall.toolName,
            );

            if (newToolCall) {
              console.log(
                `Successfully generated new tool call for ${toolCall.toolName}`,
              );
              return {
                toolCallType: "function" as const,
                toolCallId: toolCall.toolCallId,
                toolName: toolCall.toolName,
                args: JSON.stringify(newToolCall.args),
              };
            } else {
              console.log(
                `No new tool call generated for ${toolCall.toolName}`,
              );
              return null;
            }
          } catch (retryError) {
            console.error(
              `Failed to retry tool call ${toolCall.toolName}:`,
              retryError,
            );
            return null;
          }
        }

        console.log(
          `Unknown error type for tool call ${toolCall.toolName}, cannot repair`,
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
              : ([
                  "An unknown error occurred",
                  `Unknown error: ${error}`,
                ] as const);

        console.error("Error while processing chat response:", errs[1]);
        return errs[0];
      },
    });
  } catch (error) {
    console.error("Error processing chat request:", error);
    return handleError(
      "Failed to process request",
      500,
      error instanceof Error ? error.message : String(error),
    );
  }
}
