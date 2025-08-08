import { SortBy } from "@goperigon/perigon-ts";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../../lib/perigon";
import { ToolCallback, ToolDefinition } from "../types";
import { createBaseSearchArgs, categories, topics } from "../schemas/base";
import { createSearchField } from "../schemas/search";
import {
  toolResult,
  noResults,
  createPaginationHeader,
} from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";

/**
 * Schema for news stories search arguments
 */
export const newsStoriesArgs = createBaseSearchArgs().extend({
  query: createSearchField("story/headline content"),
  categories,
  topics,
  newsStoryIds: z
    .array(z.string())
    .optional()
    .describe(
      `Filter for a specific articles by news story IDs they belong to (id of the "headlines" or news clusters).`
    ),
  sortBy: z
    .enum([
      SortBy.Count,
      SortBy.CreatedAt,
      SortBy.Relevance,
      SortBy.TotalCount,
      SortBy.UpdatedAt,
    ])
    .default(SortBy.CreatedAt)
    .optional(),
  sources: z
    .array(z.string())
    .optional()
    .describe(
      `Filter news stories by specific publisher domains or subdomains. Supports wildcards (* and ?) for pattern matching (e.g., *cnn.com)`
    ),
  isTopHeadlines: z
    .boolean()
    .optional()
    .describe("Whether to return only top headlines or all stories"),
});

/**
 * Search for clustered news stories and headlines
 *
 * This tool searches through news stories that are clustered together from multiple sources.
 * It provides story summaries, sentiment analysis, and metadata for understanding major
 * news events and trends across multiple sources.
 *
 * Features:
 * - Story clustering across multiple sources
 * - Sentiment analysis for each story
 * - Category and topic filtering
 * - Time-based and location-based filtering
 * - Source filtering with wildcard support
 *
 * @param perigon - The Perigon API client instance
 * @returns Tool callback function for MCP
 */
export function searchNewsStories(perigon: Perigon): ToolCallback {
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
    newsStoryIds,
    sources,
    categories,
    topics,
    isTopHeadlines,
  }: z.infer<typeof newsStoriesArgs>): Promise<CallToolResult> => {
    try {
      let fromDate = from;

      if (isTopHeadlines) {
        let now: Date = new Date();
        fromDate = new Date(now);
        fromDate.setHours(now.getHours() - 24);
      }

      const result = await perigon.searchStories({
        q: query,
        page,
        size,
        state: states,
        city: cities,
        country: countries,
        from: fromDate,
        to,
        sortBy,
        clusterId: newsStoryIds,
        source: sources,
        showNumResults: false,
        showDuplicates: true,
        category: categories,
        topic: topics,
      });

      if (result.numResults === 0) return noResults;

      const stories = result.results.map((story) => {
        return `<news_story id="${story.id}" title="${story.name}">
Content: ${story.summary}
Created At: ${story.createdAt} (utc)
Updated At: ${story.updatedAt} (utc)
Sentiment: ${JSON.stringify(story.sentiment)}
</news_story>`;
      });

      let output = createPaginationHeader(
        result.numResults,
        page,
        size,
        "stories"
      );

      output += "\n<stories>\n";
      output += stories.join("\n\n");
      output += "\n</stories>";

      return toolResult(output);
    } catch (error) {
      console.error("Error searching news stories:", error);
      return toolResult(
        `Error: Failed to search news stories: ${await createErrorMessage(
          error
        )}`
      );
    }
  };
}

/**
 * Tool definition for news stories search
 */
export const newsStoriesTool: ToolDefinition = {
  name: "search_news_stories",
  description:
    "Search clustered news stories and headlines. Returns story summaries, sentiment analysis, and metadata for understanding major news events and trends across multiple sources.",
  parameters: newsStoriesArgs,
  createHandler: (perigon: Perigon) => searchNewsStories(perigon),
};
