import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Hono } from "hono";
import { Configuration, V1Api } from "@goperigon/perigon-ts";

type Bindings = Env;

const app = new Hono<{
  Bindings: Bindings;
}>();

type Props = {
  bearerToken: string;
};

type State = null;

export class MyMCP extends McpAgent<Bindings, State, Props> {
  server = new McpServer({
    name: "Perigon News API",
    version: "1.0.0",
  });

  async init() {
    const perigon = new V1Api(
      new Configuration({
        apiKey: this.props.bearerToken,
      }),
    );

    this.server.tool(
      "Read articles",
      {
        q: z.string().describe("The query to search for articles."),
      },
      async ({ q }) => {
        const result = await perigon.searchArticles({
          q: q,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result),
            },
          ],
        };
      },
    );
  }
}

app.mount("/", async (req, env, ctx) => {
  const authHeader = req.headers.get("authorization")?.toLowerCase();
  if (!authHeader || !authHeader.startsWith("bearer ")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const token = authHeader.replace("bearer ", "");
  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  ctx.props = {
    bearerToken: token,
  };

  try {
    const response = await MyMCP.mount("/sse").fetch(req, env, ctx);
    return response ?? new Response("No Results", { status: 200 });
  } catch (error) {
    return new Response(
      "Error: " + (error instanceof Error ? error.message : String(error)),
      { status: 500 },
    );
  }
});

export default app;
