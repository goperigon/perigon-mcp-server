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
import { typedFetch } from "./fetch";
import { HttpError } from "./types/error";

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

    if (this.props.scopes.includes(Scopes.CLUSTERS)) {
      this.server.tool(
        "get_top_headlines",
        `This tool is best used when you want the top headlines (news stories) for:
          - a given time frame
          - for a specific country
          - for a given "category" of News
        And if you just want the latest news, you can use this too!`,
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
      `This tool gives a bit more control when searching across lots of news articles.
      The q field will search across article title, content, and description and grab matching
      articles.`,
      {
        q,
        from,
        to,
        sortBy: sortArticlesBy,
        country,
      },
      async ({ q, from, to, sortBy, country }) => {
        if (!from) {
          from = sevenDaysAgo();
        }
        const result = await perigon.searchArticles({
          ...defaultNewsFilter,
          q: q,
          from,
          to,
          sortBy,
          country,
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
          return {
            source: article.source?.domain,
            title: article.title,
            description: article.summary ?? article.content,
            pubDate: article.pubDate,
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

    const response = await MyMCP.mount("/v1/sse").fetch(req, env, ctx);
    return response ?? new Response("No Results", { status: 200 });
  } catch (error) {
    if (!(error instanceof HttpError)) {
      return new Response(
        "Error: " + (error instanceof Error ? error.message : String(error)),
        { status: 500 },
      );
    }

    return new Response(error.responseBody, { status: error.statusCode });
  }
});

export default app;
