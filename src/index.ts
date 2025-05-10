import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Hono } from "hono";
import { Configuration, V1Api } from "@goperigon/perigon-ts";
import {
  q,
  from,
  to,
  sevenDaysAgo,
  country,
  sortArticlesBy,
  defaultNewsFilter,
} from "./perigon";

type Bindings = Env;

const app = new Hono<{
  Bindings: Bindings;
}>();

type Props = {
  apiKey: string;
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
        apiKey: this.props.apiKey,
      }),
    );

    this.server.tool(
      "read_news_articles",
      `this is a powerful tool that can help be used to search across news articles.`,
      {
        q,
        from,
        to,
        sortBy: sortArticlesBy,
      },
      async ({ q, from, to, sortBy }) => {
        if (!from) {
          from = sevenDaysAgo();
        }
        const result = await perigon.searchArticles({
          q: q,
          from,
          to,
          sortBy,
          showReprints: false,
          ...defaultNewsFilter,
        });

        if (result.numResults === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No results found",
              },
            ],
          };
        }

        const simplifiedResult = result.articles.map((article) => {
          const description = article.summary ?? article.content;
          return {
            pubDate: article.pubDate,
            title: article.title,
            description: description,
          };
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(simplifiedResult),
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

  const apiKey = authHeader.replace("bearer ", "");
  if (!apiKey) {
    return new Response("Unauthorized", { status: 401 });
  }

  ctx.props = {
    apiKey,
  };

  try {
    const response = await MyMCP.mount("/v1/sse").fetch(req, env, ctx);
    return response ?? new Response("No Results", { status: 200 });
  } catch (error) {
    return new Response(
      "Error: " + (error instanceof Error ? error.message : String(error)),
      { status: 500 },
    );
  }
});

export default app;
