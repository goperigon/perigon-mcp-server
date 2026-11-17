import { SortBy } from "@goperigon/perigon-ts";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../../lib/perigon";
import { ToolCallback, ToolDefinition } from "../types";
import {
  createBaseSearchArgs,
  categories,
  topics,
  resolveCountries,
} from "../schemas/base";
import { createSearchField } from "../schemas/search";
import {
  toolResult,
  createPaginationHeader,
  withDefaultCountryNote,
  describeDefaultCountry,
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
      "Story (cluster) IDs.",
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
      "Publisher domains or subdomains; wildcards * ? (e.g. *.cnn.com).",
    ),
  sourceGroup: z
    .array(z.string())
    .optional()
    .describe(
      "Curated publisher bundles: top10, top25, top50, top100, top25tech, top25crypto.",
    ),
  personName: z
    .string()
    .optional()
    .describe("Mentioned person, exact name."),
  companyDomain: z
    .array(z.string())
    .optional()
    .describe(
      "Mentioned companies, by domain (e.g. apple.com).",
    ),
  companySymbol: z
    .array(z.string())
    .optional()
    .describe(
      "Mentioned companies, by ticker (e.g. AAPL).",
    ),
  isTopHeadlines: z
    .boolean()
    .optional()
    .describe("Only top headlines from the last 24 hours."),
  minSourceDiversity: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe(
      "Minimum distinct publishers ÷ total articles (incl. reprints), 0–1. Drops stories inflated by a few publishers posting many articles (e.g. SEC filing or press-release repost sites). Use 0.2 (1 publisher per 5 articles) for top headlines, most-covered, or trending requests; 0.05 is too loose. Unset by default.",
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

      const { country, defaultCountryApplied } = resolveCountries(
        countries,
        cities,
        states,
      );
      const result = await perigon.searchStoriesFull({
        q: query,
        page,
        size,
        state: states,
        city: cities,
        country,
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
        ...(minSourceDiversity !== undefined ? { minSourceDiversity } : {}),
      });

      if (result.numResults === 0) {
        return toolResult(
          withDefaultCountryNote("No results found", defaultCountryApplied),
        );
      }

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
Articles: ${story.totalCount ?? "N/A"} total, ${story.uniqueCount ?? "N/A"} unique
Publishers: ${story.uniqueSourcesCount ?? "N/A"}
Source Diversity: ${story.sourceDiversity?.toFixed(2) ?? "N/A"}
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

      return toolResult(withDefaultCountryNote(output, defaultCountryApplied));
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
  title: "Stories",
  description:
    "Search news stories: clusters of related articles across sources (headlines). Use for major events, top headlines, and story arcs rather than individual articles. Returns summaries, key points, unique/total article counts, sentiment, and the cluster's top topics, categories, people, companies, and locations. Pass the id to search_story_history to see how a story evolved, or to search_news_articles(newsStoryIds) for its articles." +
    " " +
    describeDefaultCountry(["countries", "cities", "states"]),
  parameters: newsStoriesArgs,
  annotations: {
    readOnlyHint: true,
    openWorldHint: true,
    destructiveHint: false,
  },
  createHandler: (perigon: Perigon) => searchNewsStories(perigon),
} satisfies ToolDefinition<typeof newsStoriesArgs>;
