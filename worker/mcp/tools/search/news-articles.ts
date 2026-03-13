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
import { applyLocationFilter, createLocationSchema } from "../utils/location";

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
    .describe("Filter for specific articles by their unique article IDs."),
  journalistIds: z
    .array(z.string())
    .optional()
    .describe("Filter for articles written by specific journalist IDs."),
  newsStoryIds: z
    .array(z.string())
    .optional()
    .describe(
      `Filter for articles by news story/cluster IDs they belong to (the "headlines" or grouped news clusters).`
    ),
  sources: z
    .array(z.string())
    .optional()
    .describe(
      "Filter by publisher domains or subdomains. Supports wildcards (* and ?) for pattern matching (e.g., *.cnn.com)."
    ),
  sourceGroup: z
    .array(z.string())
    .optional()
    .describe(
      "Filter using Perigon's curated publisher bundles for quality-filtered results: top10, top25, top50, top100, top25tech, top25crypto, etc."
    ),
  category: z
    .array(z.string())
    .optional()
    .describe(
      "Filter by content categories (e.g., Politics, Tech, Sports, Business, Finance, Entertainment). Use 'none' for uncategorized. Multiple values use OR logic."
    ),
  topic: z
    .array(z.string())
    .optional()
    .describe(
      "Filter by specific topics (e.g., Markets, Crime, Cryptocurrency, Climate Change, College Sports). More granular than categories. Multiple values use OR logic."
    ),
  language: z
    .array(z.string())
    .optional()
    .describe(
      "Filter by language using ISO-639 two-letter codes in lowercase (e.g., en, es, fr, de, ja). Multiple values use OR logic."
    ),
  label: z
    .array(z.string())
    .optional()
    .describe(
      "Filter by editorial labels: Opinion, Paid-news, Non-news, Fact Check, Press Release."
    ),
  medium: z
    .array(z.string())
    .optional()
    .describe("Filter by content medium: Article or Video."),
  personName: z
    .array(z.string())
    .optional()
    .describe(
      "Filter for articles mentioning specific people by exact name match."
    ),
  companyDomain: z
    .array(z.string())
    .optional()
    .describe(
      "Filter for articles mentioning specific companies by domain (e.g., apple.com, microsoft.com)."
    ),
  companySymbol: z
    .array(z.string())
    .optional()
    .describe(
      "Filter for articles mentioning specific companies by stock ticker symbol (e.g., AAPL, MSFT)."
    ),
  showReprints: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "Include wire-service reprints (AP, Reuters) that appear on multiple sites. Default false for deduplication."
    ),
  addDateFrom: z
    .string()
    .transform((str) => (str === "" ? undefined : new Date(str)))
    .optional()
    .describe(
      "Filter for articles added/ingested to Perigon after this date. ISO 8601 or yyyy-mm-dd."
    ),
  addDateTo: z
    .string()
    .transform((str) => (str === "" ? undefined : new Date(str)))
    .optional()
    .describe(
      "Filter for articles added/ingested to Perigon before this date. ISO 8601 or yyyy-mm-dd."
    ),
  positiveSentimentFrom: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("Minimum positive sentiment score (0.0 to 1.0)."),
  positiveSentimentTo: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("Maximum positive sentiment score (0.0 to 1.0)."),
  negativeSentimentFrom: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("Minimum negative sentiment score (0.0 to 1.0)."),
  negativeSentimentTo: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("Maximum negative sentiment score (0.0 to 1.0)."),
  summarize: z
    .boolean()
    .default(true)
    .describe(
      "Return article summary instead of full content. Defaults to true."
    ),
  ...createLocationSchema(),
});

/**
 * Search for individual news articles with advanced filtering capabilities
 *
 * This tool allows you to search through news articles using various filters including:
 * - Keywords and search queries with Elasticsearch syntax
 * - Location-based filtering (countries, states, cities) with smart location detection
 * - Time range filtering
 * - Source and journalist filtering
 * - Article ID and news story ID filtering
 *
 * Location filtering supports both explicit arrays (states, cities, countries) and
 * intelligent parsing via the 'location' parameter with automatic type detection.
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
    sourceGroup,
    category,
    topic,
    language,
    label,
    medium,
    personName,
    companyDomain,
    companySymbol,
    showReprints,
    addDateFrom,
    addDateTo,
    positiveSentimentFrom,
    positiveSentimentTo,
    negativeSentimentFrom,
    negativeSentimentTo,
    summarize,
    location,
    locationType,
  }: z.infer<typeof newsArticlesArgs>): Promise<CallToolResult> => {
    try {
      let searchParams: any = {
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
        sourceGroup,
        category,
        topic,
        language,
        label,
        medium,
        personName,
        companyDomain,
        companySymbol,
        showNumResults: true,
        showReprints,
        addDateFrom,
        addDateTo,
        positiveSentimentFrom,
        positiveSentimentTo,
        negativeSentimentFrom,
        negativeSentimentTo,
      };

      searchParams = applyLocationFilter(
        searchParams,
        location,
        locationType,
        query
      );

      const result = await perigon.searchArticles(searchParams);

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
    "Search and filter individual news articles from 200k+ global sources. Use this for finding specific articles by keyword, topic, category, source, location, person, company, journalist, sentiment, or time range. Supports Boolean query syntax (AND, OR, NOT), exact phrases, and wildcards. Returns article content or summaries with publication dates, sources, story cluster IDs, and journalist metadata.",
  parameters: newsArticlesArgs,
  createHandler: (perigon: Perigon) => searchNewsArticles(perigon),
};
