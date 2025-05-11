import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Hono } from "hono";
import { Configuration, SortBy, V1Api } from "@goperigon/perigon-ts";
import {
  q,
  from,
  to,
  sevenDaysAgo,
  country,
  sortArticlesBy,
  defaultNewsFilter,
  numStories,
  sortStoriesBy,
  category,
} from "./types/perigon";
import { AuthIntrospectionResponse, Scopes } from "./types/scopes";
import { fetchWithResult } from "./fetch";

type Bindings = Env;

const app = new Hono<{
  Bindings: Bindings;
}>();

type Props = {
  apiKey: string;
  scopes: Scopes[];
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
    console.log(this.props.scopes);

    if (this.props.scopes.includes(Scopes.CLUSTERS)) {
      this.server.tool(
        "get_top_headlines",
        `use when you want to read top news headlines over some timeframe`,
        {
          from,
          to,
          sortBy: sortStoriesBy,
          country,
          size: numStories,
          category,
        },
        async ({ from, to, sortBy, country, size, category }) => {
          if (!from) {
            from = sevenDaysAgo();
          }
          const result = await perigon.searchStories({
            ...defaultNewsFilter,
            from,
            to,
            sortBy: sortBy ?? SortBy.Count,
            size: size ?? 5,
            country: country ?? undefined,
            category,
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

          const simplifiedResult = result.results.map((story) => {
            return {
              title: story.name,
              details: story.summary ?? story,
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

    this.server.tool(
      "read_news_articles",
      `this is a powerful tool that can be used to search across news articles.`,
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
          ...defaultNewsFilter,
          q: q,
          from,
          to,
          sortBy,
          showReprints: false,
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
  try {
    const authHeader = req.headers.get("authorization")?.toLowerCase();
    if (!authHeader || !authHeader.startsWith("bearer ")) {
      return new Response("Unauthorized", { status: 401 });
    }

    const apiKey = authHeader.replace("bearer ", "");
    if (!apiKey) {
      return new Response("Unauthorized", { status: 401 });
    }

    const scopesResp = await fetchWithResult<AuthIntrospectionResponse>(
      "https://api.perigon.io/v1/auth/introspect",
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      },
    );
    if (!scopesResp.success) {
      return new Response("Unauthorized", { status: 401 });
    }
    // console.log(scopesResp.value);

    ctx.props = {
      apiKey,
      scopes: scopesResp.value.scopes,
    };
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
