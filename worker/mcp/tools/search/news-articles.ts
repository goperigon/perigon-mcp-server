import { AllEndpointSortBy } from "@goperigon/perigon-ts";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../../lib/perigon";
import { ToolCallback, ToolDefinition } from "../types";
import { createBaseSearchArgs } from "../schemas/base";
import { createSearchField } from "../schemas/search";
import {
  toolResult,
  noResults,
  createPaginationHeader,
} from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";

/**
 * Schema for news articles search arguments
 */
export const newsArticlesArgs = createBaseSearchArgs().extend({
  query: createSearchField("article content"),
  sortBy: z
    .enum([
      AllEndpointSortBy.Date,
      AllEndpointSortBy.ReverseDate,
      AllEndpointSortBy.Relevance,
      AllEndpointSortBy.PubDate,
      AllEndpointSortBy.RefreshDate,
      AllEndpointSortBy.AddDate,
      AllEndpointSortBy.ReverseAddDate,
    ])
    .describe(
      `Sort order for Articles search results. Options:
      • ${AllEndpointSortBy.Date}: Sort by date of article publication (newest first)
      • ${AllEndpointSortBy.ReverseDate}: Sort by date of article publication (oldest first)
      • ${AllEndpointSortBy.Relevance}: Sort by search relevance score (most relevant first)
      • ${AllEndpointSortBy.PubDate}: Sort by date of article publication (newest first)
      • ${AllEndpointSortBy.RefreshDate}: Sort by date of article refresh (most recently refreshed first)
      • ${AllEndpointSortBy.AddDate}: Sort by date of article addition (newest first)
      • ${AllEndpointSortBy.ReverseAddDate}: Sort by date of article addition (oldest first)`
    )
    .default(AllEndpointSortBy.Date)
    .optional(),
  articleIds: z
    .array(z.string())
    .optional()
    .describe("Filter for a specific articles by ID."),
  journalistIds: z
    .array(z.string())
    .optional()
    .describe("Filter for a specific articles by journalist ID."),
  newsStoryIds: z
    .array(z.string())
    .optional()
    .describe(
      `Filter for a specific articles by news story IDs they belong to (id of the "headlines" or news clusters).`
    ),
  sources: z
    .array(z.string())
    .optional()
    .describe(
      `Filter articles by specific publisher domains or subdomains. Supports wildcards (* and ?) for pattern matching (e.g., *cnn.com)`
    ),
  summarize: z
    .boolean()
    .default(true)
    .describe(
      "Read the article summary instead of full content, defaults to true"
    ),
});

/**
 * Search for individual news articles with advanced filtering capabilities
 *
 * This tool allows you to search through news articles using various filters including:
 * - Keywords and search queries with Elasticsearch syntax
 * - Location-based filtering (countries, states, cities)
 * - Time range filtering
 * - Source and journalist filtering
 * - Article ID and news story ID filtering
 *
 * @param perigon - The Perigon API client instance
 * @returns Tool callback function for MCP
 */
export function searchNewsArticles(perigon: Perigon): ToolCallback {
  return async ({
    query,
    page,
    size,
    states,
    cities,
    countries,
    from,
    to,
    sortBy,
    articleIds,
    journalistIds,
    newsStoryIds,
    sources,
    summarize,
  }: z.infer<typeof newsArticlesArgs>): Promise<CallToolResult> => {
    try {
      const result = await perigon.searchArticles({
        q: query,
        page,
        size,
        state: states,
        city: cities,
        country: countries,
        from,
        to,
        sortBy,
        articleId: articleIds,
        journalistId: journalistIds,
        clusterId: newsStoryIds,
        source: sources,
        showNumResults: true,
        showReprints: false,
      });

      if (result.numResults === 0) return noResults;

      const articles = result.articles.map((article) => {
        const journalistIds =
          article.journalists?.map((journalist) => journalist.id).join(", ") ??
          "";

        return `<article id="${article.articleId}" title="${article.title}">
Content: ${summarize ? article.summary : article.content}
Pub Date: ${article.pubDate} (utc)
Source: ${article.source?.domain}
Story Id: ${article.clusterId}
Journalist Ids: ${journalistIds}
</article>`;
      });

      let output = createPaginationHeader(
        result.numResults,
        page,
        size,
        "articles"
      );
      output += "\n<articles>\n";
      output += articles.join("\n\n");
      output += "\n</articles>";

      return toolResult(output);
    } catch (error) {
      console.error("Error searching news articles:", error);
      return toolResult(
        `Error: Failed to search news articles: ${await createErrorMessage(
          error
        )}`
      );
    }
  };
}

/**
 * Tool definition for news articles search
 */
export const newsArticlesTool: ToolDefinition = {
  name: "search_news_articles",
  description:
    "Search individual news articles with advanced filtering by keywords, location, time range, sources, and journalists. Returns full article content or summaries with metadata.",
  parameters: newsArticlesArgs,
  createHandler: (perigon: Perigon) => searchNewsArticles(perigon),
};
