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
      `Filter for specific stories by their cluster IDs (the "headlines" or grouped news clusters).`,
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
      "Filter stories by publisher domains or subdomains. Supports wildcards (* and ?) for pattern matching (e.g., *.cnn.com).",
    ),
  sourceGroup: z
    .array(z.string())
    .optional()
    .describe(
      "Filter using curated publisher bundles: top10, top25, top50, top100, top25tech, top25crypto.",
    ),
  language: z
    .array(z.string())
    .optional()
    .describe(
      "Filter by language using ISO-639 two-letter codes (e.g., en, es, fr).",
    ),
  label: z
    .array(z.string())
    .optional()
    .describe(
      "Filter by editorial labels: Opinion, Paid-news, Non-news, Fact Check, Press Release.",
    ),
  personName: z
    .string()
    .optional()
    .describe("Filter for stories mentioning a specific person by exact name."),
  companyDomain: z
    .array(z.string())
    .optional()
    .describe(
      "Filter for stories mentioning companies by domain (e.g., apple.com).",
    ),
  companySymbol: z
    .array(z.string())
    .optional()
    .describe(
      "Filter for stories mentioning companies by ticker symbol (e.g., AAPL).",
    ),
  isTopHeadlines: z
    .boolean()
    .optional()
    .describe("When true, returns only top headlines from the last 24 hours."),
  minSourceDiversity: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe(
      "Minimum ratio of unique sources to unique articles (uniqueSources / uniqueCount), from 0 to 1. Filters out stories dominated by a single publisher (e.g., 0.05 requires at least 1 unique source per 20 articles). Not applied by default.",
    ),
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
export function searchNewsStories(
  perigon: Perigon,
): ToolCallback<typeof newsStoriesArgs> {
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
    sourceGroup,
    language,
    label,
    personName,
    companyDomain,
    companySymbol,
    categories,
    topics,
    isTopHeadlines,
    minSourceDiversity,
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
        sourceGroup,
        personName,
        companyDomain,
        companySymbol,
        showNumResults: false,
        showDuplicates: true,
        category: categories,
        topic: topics,
        // language, label, and minSourceDiversity are supported by the API but not typed in the SDK
        ...(language ? { language } : {}),
        ...(label ? { label } : {}),
        ...(minSourceDiversity !== undefined ? { minSourceDiversity } : {}),
      } as any);

      if (result.numResults === 0) return noResults;

      const stories = result.results.map((story) => {
        const keyPoints =
          story.keyPoints
            ?.map((kp) => kp.point)
            .filter(Boolean)
            .join("; ") || "N/A";
        const topTopics =
          story.topTopics?.map((t) => t.name).join(", ") || "N/A";
        const topCategories =
          story.topCategories?.map((c) => c.name).join(", ") || "N/A";
        const topPeople =
          story.topPeople?.map((p) => p.name).join(", ") || "N/A";
        const topCompanies =
          story.topCompanies?.map((c) => c.name).join(", ") || "N/A";
        const topLocations =
          story.topLocations
            ?.map((l) => [l.city, l.state, l.country].filter(Boolean).join(", "))
            .filter(Boolean)
            .join("; ") || "N/A";
        const topCountries = story.topCountries?.join(", ") || "N/A";

        return `<news_story id="${story.id}" title="${story.name}">
Summary: ${story.summary}
Short Summary: ${story.shortSummary ?? "N/A"}
Key Points: ${keyPoints}
Created At: ${story.createdAt} (utc)
Updated At: ${story.updatedAt} (utc)
Unique Article Count: ${story.uniqueCount ?? "N/A"}
Total Article Count: ${story.totalCount ?? "N/A"}
Unique Sources: ${story.uniqueSources?.join(", ") || "N/A"}
Sentiment: ${JSON.stringify(story.sentiment)}
Top Topics: ${topTopics}
Top Categories: ${topCategories}
Top People: ${topPeople}
Top Companies: ${topCompanies}
Top Locations: ${topLocations}
Top Countries: ${topCountries}
Image URL: ${story.imageUrl ?? "N/A"}
</news_story>`;
      });

      let output = createPaginationHeader(
        result.numResults,
        page,
        size,
        "stories",
      );

      output += "\n<stories>\n";
      output += stories.join("\n\n");
      output += "\n</stories>";

      return toolResult(output);
    } catch (error) {
      console.error("Error searching news stories:", error);
      return toolResult(
        `Error: Failed to search news stories: ${await createErrorMessage(
          error,
        )}`,
      );
    }
  };
}

/**
 * Tool definition for news stories search
 */
export const newsStoriesTool = {
  name: "search_news_stories",
  description:
    "Search clustered news stories (headlines) that group related articles across multiple sources into a single narrative. Use this to understand major news events, trending headlines, and story arcs rather than finding individual articles. Filter by category, topic, source, location, person, company, or time range. Returns summaries, key points, unique/total article counts, sentiment, and top topics/categories/people/companies/locations for the cluster. Feed the id into search_story_history to see how the story evolved, or search_news_articles(newsStoryIds) to pull its member articles.",
  parameters: newsStoriesArgs,
  createHandler: (perigon: Perigon) => searchNewsStories(perigon),
} satisfies ToolDefinition<typeof newsStoriesArgs>;
