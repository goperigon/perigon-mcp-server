import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SortBy, V1Api } from "@goperigon/perigon-ts";
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
import { Scopes } from "./types/scopes";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export function registerTools(
  server: McpServer,
  perigon: V1Api,
  scopes: Scopes[],
) {
  if (scopes.includes(Scopes.CLUSTERS)) {
    storiesTool(server, perigon);
  }

  articlesTool(server, perigon);
}

function toolResult(result: string | object): CallToolResult {
  const text = typeof result === "string" ? result : JSON.stringify(result);

  return {
    content: [
      {
        type: "text",
        text,
      },
    ],
  };
}

const noResults = toolResult("No results found.");

function storiesTool(server: McpServer, perigon: V1Api) {
  server.tool(
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
        country,
        category,
      });

      if (result.numResults === 0) {
        return noResults;
      }

      const simplifiedResult = result.results.map((story) => {
        return {
          title: story.name,
          createdAt: story.createdAt,
          lastUpdated: story.updatedAt,
          details: story.summary,
        };
      });

      return toolResult(simplifiedResult);
    },
  );
}

function articlesTool(server: McpServer, perigon: V1Api) {
  server.tool(
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
        return noResults;
      }

      const simplifiedResult = result.articles.map((article) => {
        return {
          source: article.source?.domain,
          title: article.title,
          description: article.summary ?? article.content,
          pubDate: article.pubDate,
        };
      });

      return toolResult(simplifiedResult);
    },
  );
}
