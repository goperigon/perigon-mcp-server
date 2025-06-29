import { HttpError } from "./types/types";
import { createAnthropic } from "@ai-sdk/anthropic";
import {
  streamText,
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
      return new Response(JSON.stringify({ error }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
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
        return new Response("Unauthorized", { status: 401 });
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
        return new Response(
          JSON.stringify({
            error: "Invalid arguments",
            details: error instanceof Error ? error.message : String(error),
          }),
          {
            status: 400,
            headers: { "content-type": "application/json" },
          },
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
      return new Response("Method not allowed", { status: 405 });
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
    return new Response("Method not allowed", { status: 405 });
  }
  try {
    // if (env.VITE_USE_TURNSTILE) {
    //   const token = request.headers.get("cf-turnstile-response");
    //   const ip = request.headers.get("CF-Connecting-IP");
    //   // Validate the token by calling the
    //   // "/siteverify" API endpoint.
    //   const idempotencyKey = crypto.randomUUID();
    //   const url = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
    //   const verify = await fetch(url, {
    //     body: JSON.stringify({
    //       secret: env.TURNSTILE_SECRET_KEY,
    //       response: token,
    //       remoteip: ip,
    //       idempotency_key: idempotencyKey,
    //     }),
    //     method: "POST",
    //     headers: {
    //       "Content-Type": "application/json",
    //     },
    //   });
    //   if (!((await verify.json()) as any).success) {
    //     return Response.json(
    //       {
    //         error: "Bad Request",
    //         details: "Missing or invalid turnstile token",
    //       },
    //       {
    //         status: 400,
    //       },
    //     );
    //   }
    // }

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
      maxSteps: 10,
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
