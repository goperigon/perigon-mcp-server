import { AllEndpointSortBy } from "@goperigon/perigon-ts";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../../lib/perigon";
import { ToolCallback, ToolDefinition } from "../types";
import { createBaseSearchArgs, parseDateParam } from "../schemas/base";
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
      `Sort order: ${AllEndpointSortBy.Date}/${AllEndpointSortBy.PubDate} (newest published first), ${AllEndpointSortBy.ReverseDate} (oldest first), ${AllEndpointSortBy.Relevance}, ${AllEndpointSortBy.AddDate} (newest ingested first), ${AllEndpointSortBy.ReverseAddDate} (oldest ingested first), ${AllEndpointSortBy.RefreshDate} (most recently refreshed first).`,
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
      `Filter for articles by news story/cluster IDs they belong to (the "headlines" or grouped news clusters).`,
    ),
  sources: z
    .array(z.string())
    .optional()
    .describe(
      "Filter by publisher domains or subdomains. Supports wildcards (* and ?) for pattern matching (e.g., *.cnn.com).",
    ),
  sourceGroup: z
    .array(z.string())
    .optional()
    .describe(
      "Filter using Perigon's curated publisher bundles for quality-filtered results: top10, top25, top50, top100, top25tech, top25crypto, etc.",
    ),
  category: z
    .array(z.string())
    .optional()
    .describe(
      "Filter by content categories (e.g., Politics, Tech, Sports, Business, Finance, Entertainment). Use 'none' for uncategorized. Multiple values use OR logic.",
    ),
  topic: z
    .array(z.string())
    .optional()
    .describe(
      "Filter by specific topics (e.g., Markets, Crime, Cryptocurrency, Climate Change, College Sports). More granular than categories. Multiple values use OR logic.",
    ),
  language: z
    .array(z.string())
    .optional()
    .describe(
      "Filter by language using ISO-639 two-letter codes in lowercase (e.g., en, es, fr, de, ja). Multiple values use OR logic.",
    ),
  label: z
    .array(z.string())
    .optional()
    .describe(
      "Filter by editorial labels: Opinion, Paid-news, Non-news, Fact Check, Press Release.",
    ),
  medium: z
    .array(z.string())
    .optional()
    .describe("Filter by content medium: Article or Video."),
  personName: z
    .array(z.string())
    .optional()
    .describe(
      "Filter for articles mentioning specific people by exact name match.",
    ),
  companyDomain: z
    .array(z.string())
    .optional()
    .describe(
      "Filter for articles mentioning specific companies by domain (e.g., apple.com, microsoft.com).",
    ),
  companySymbol: z
    .array(z.string())
    .optional()
    .describe(
      "Filter for articles mentioning specific companies by stock ticker symbol (e.g., AAPL, MSFT).",
    ),
  showReprints: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "Include wire-service reprints (AP, Reuters) that appear on multiple sites. Default false for deduplication.",
    ),
  addDateFrom: z
    .string()
    .transform(parseDateParam)
    .optional()
    .describe(
      "Filter for articles added/ingested to Perigon after this date. ISO 8601 or yyyy-mm-dd.",
    ),
  addDateTo: z
    .string()
    .transform(parseDateParam)
    .optional()
    .describe(
      "Filter for articles added/ingested to Perigon before this date. ISO 8601 or yyyy-mm-dd.",
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
      "Return article summary instead of full content. Defaults to true.",
    ),
  title: createSearchField("article headline/title only"),
  desc: createSearchField("article description field only"),
  content: createSearchField("full article body content only"),
  url: createSearchField(
    "the article URL (e.g. source=cnn.com with url=travel for a section)",
  ),
  taxonomy: z
    .array(z.string())
    .optional()
    .describe(
      "Filter by Google Content Category, full path (e.g. /Finance/Banking/Other).",
    ),
  prefixTaxonomy: z
    .string()
    .optional()
    .describe("Filter by Google Content Category prefix (e.g. /Finance)."),
  lat: z
    .number()
    .min(-90)
    .max(90)
    .optional()
    .describe("Geo radius search: center latitude."),
  lon: z
    .number()
    .min(-180)
    .max(180)
    .optional()
    .describe("Geo radius search: center longitude."),
  maxDistance: z
    .number()
    .min(1)
    .max(300)
    .optional()
    .describe("Geo radius search: max distance in km from lat/lon."),
  sourceCountry: z
    .array(z.string())
    .optional()
    .describe("Filter by the country the publishing source is located in."),
  sourceState: z
    .array(z.string())
    .optional()
    .describe("Filter by the US state the publishing source is located in."),
  sourceCity: z
    .array(z.string())
    .optional()
    .describe("Filter by the city the publishing source is located in."),
  byline: z
    .array(z.string())
    .optional()
    .describe("Filter by exact author byline text."),
  author: z
    .array(z.string())
    .optional()
    .describe("Filter by exact author name."),
  linkTo: z
    .string()
    .optional()
    .describe("Filter to articles linking to this URL pattern."),
  reprintGroupId: z
    .string()
    .optional()
    .describe(
      "Return every article in one reprint group, original plus reprints.",
    ),
  searchTranslation: z
    .boolean()
    .optional()
    .describe(
      "Also match translated title/description/content for non-English articles.",
    ),
  neutralSentimentFrom: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("Minimum neutral sentiment score (0.0 to 1.0)."),
  neutralSentimentTo: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("Maximum neutral sentiment score (0.0 to 1.0)."),
  refreshDateFrom: z
    .string()
    .transform(parseDateParam)
    .optional()
    .describe("Filter for articles refreshed in Perigon after this date."),
  refreshDateTo: z
    .string()
    .transform(parseDateParam)
    .optional()
    .describe("Filter for articles refreshed in Perigon before this date."),
  personWikidataId: z
    .array(z.string())
    .optional()
    .describe(
      "Filter by Wikidata ID of a mentioned person — prefer this over personName to avoid ambiguity.",
    ),
  companyId: z
    .array(z.string())
    .optional()
    .describe("Filter for articles mentioning specific company IDs."),
  companyName: z
    .string()
    .optional()
    .describe("Filter for articles by exact company name match."),
  watchlist: z
    .array(z.string())
    .optional()
    .describe(
      "Filter to articles mentioning any entity from these watchlist IDs.",
    ),
  excludeWatchlist: z
    .array(z.string())
    .optional()
    .describe("Exclude articles mentioning entities from these watchlist IDs."),
  paywall: z
    .boolean()
    .optional()
    .describe("Filter by whether the publishing source has a paywall."),
  excludeSources: z
    .array(z.string())
    .optional()
    .describe("Exclude publisher domains or subdomains (supports wildcards)."),
  excludeSourceGroup: z
    .array(z.string())
    .optional()
    .describe("Exclude Perigon curated source-group bundles."),
  excludeCategory: z
    .array(z.string())
    .optional()
    .describe("Exclude content categories."),
  excludeTopic: z.array(z.string()).optional().describe("Exclude topics."),
  excludeLabel: z
    .array(z.string())
    .optional()
    .describe("Exclude editorial labels."),
  excludeLanguage: z
    .array(z.string())
    .optional()
    .describe("Exclude languages by ISO-639 two-letter code."),
  excludeJournalistId: z
    .array(z.string())
    .optional()
    .describe("Exclude articles written by specific journalist IDs."),
  excludePersonName: z
    .array(z.string())
    .optional()
    .describe("Exclude articles mentioning these exact person names."),
  excludePersonWikidataId: z
    .array(z.string())
    .optional()
    .describe("Exclude articles mentioning these person Wikidata IDs."),
  excludeCompanyId: z
    .array(z.string())
    .optional()
    .describe("Exclude articles mentioning these company IDs."),
  excludeCompanyDomain: z
    .array(z.string())
    .optional()
    .describe("Exclude articles mentioning companies with these domains."),
  excludeCompanySymbol: z
    .array(z.string())
    .optional()
    .describe(
      "Exclude articles mentioning companies with these ticker symbols.",
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
export function searchNewsArticles(
  perigon: Perigon,
): ToolCallback<typeof newsArticlesArgs> {
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
    title,
    desc,
    content,
    url,
    taxonomy,
    prefixTaxonomy,
    lat,
    lon,
    maxDistance,
    sourceCountry,
    sourceState,
    sourceCity,
    byline,
    author,
    linkTo,
    reprintGroupId,
    searchTranslation,
    neutralSentimentFrom,
    neutralSentimentTo,
    refreshDateFrom,
    refreshDateTo,
    personWikidataId,
    companyId,
    companyName,
    watchlist,
    excludeWatchlist,
    paywall,
    excludeSources,
    excludeSourceGroup,
    excludeCategory,
    excludeTopic,
    excludeLabel,
    excludeLanguage,
    excludeJournalistId,
    excludePersonName,
    excludePersonWikidataId,
    excludeCompanyId,
    excludeCompanyDomain,
    excludeCompanySymbol,
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
        title,
        desc,
        content,
        url,
        taxonomy,
        prefixTaxonomy,
        lat,
        lon,
        maxDistance,
        sourceCountry,
        sourceState,
        sourceCity,
        byline,
        author,
        linkTo,
        reprintGroupId,
        searchTranslation,
        neutralSentimentFrom,
        neutralSentimentTo,
        refreshDateFrom,
        refreshDateTo,
        personWikidataId,
        companyId,
        companyName,
        watchlist,
        excludeWatchlist,
        paywall,
        excludeSource: excludeSources,
        excludeSourceGroup,
        excludeCategory,
        excludeTopic,
        excludeLabel,
        excludeLanguage,
        excludeJournalistId,
        excludePersonName,
        excludePersonWikidataId,
        excludeCompanyId,
        excludeCompanyDomain,
        excludeCompanySymbol,
      };

      searchParams = applyLocationFilter(
        searchParams,
        location,
        locationType,
        query,
      );

      // Raw fetch rather than the SDK's `searchArticles`, since the v1 SDK's
      // `Article` type drops `enContentWordCount` entirely during
      // deserialization. `searchParams` already uses the exact query-param
      // field names the raw endpoint expects.
      const result = await perigon.searchArticlesFull(searchParams);

      if (result.numResults === 0) return noResults;

      const articles = result.articles.map((article) => {
        const journalistIds =
          article.matchedAuthors?.map((a) => a.id).join(", ") ?? "";
        const categories =
          article.categories?.map((c) => c.name).join(", ") ?? "";
        const topics = article.topics?.map((t) => t.name).join(", ") ?? "";
        const labels = article.labels?.map((l) => l.name).join(", ") ?? "";
        const keywords = article.keywords?.map((k) => k.name).join(", ") ?? "";
        const taxonomies =
          article.taxonomies?.map((t) => t.name).join(", ") ?? "";
        const entities = article.entities?.map((e) => e.name).join(", ") ?? "";
        const eventTypes =
          article.eventTypes?.map((e) => e.name).join(", ") ?? "";
        const people =
          article.people
            ?.map((p) => p.name)
            .filter(Boolean)
            .join(", ") ?? "";
        const companies =
          article.companies
            ?.map((c) => c.name)
            .filter(Boolean)
            .join(", ") ?? "";
        const places =
          article.places
            ?.map((p) =>
              [p.city, p.state, p.country].filter(Boolean).join(", "),
            )
            .filter(Boolean)
            .join("; ") ?? "";
        const locations =
          article.locations
            ?.map((l) =>
              [l.city, l.state, l.country].filter(Boolean).join(", "),
            )
            .filter(Boolean)
            .join("; ") ?? "";
        const links = article.links?.join(", ") ?? "";

        return `<article id="${article.articleId}" title="${article.title}">
URL: ${article.url}
Description: ${article.description ?? "N/A"}
Content: ${summarize ? (article.summary ?? article.shortSummary) : article.content}
Word Count: ${article.enContentWordCount ?? "N/A"}
Pub Date: ${article.pubDate} (utc)
Add Date: ${article.addDate} (utc)
Refresh Date: ${article.refreshDate} (utc)
Source: ${article.source?.domain}
Author: ${article.authorsByline}
Language: ${article.language}
Country: ${article.country}
Medium: ${article.medium}
Image URL: ${article.imageUrl ?? "N/A"}
Relevance Score: ${article.score ?? "N/A"}
Reprint: ${article.reprint ?? false}
Reprint Group Id: ${article.reprintGroupId ?? "N/A"}
Claim/Verdict: ${article.claim ? `${article.claim} → ${article.verdict ?? "N/A"}` : "N/A"}
Sentiment: ${JSON.stringify(article.sentiment)}
Categories: ${categories}
Topics: ${topics}
Taxonomies: ${taxonomies}
Entities: ${entities}
Event Types: ${eventTypes}
Labels: ${labels}
Keywords: ${keywords}
People: ${people}
Companies: ${companies}
Places: ${places}
Locations: ${locations}
Links: ${links}
Story Id: ${article.clusterId}
Journalist Ids (matchedAuthors): ${journalistIds}
</article>`;
      });

      let output = createPaginationHeader(
        result.numResults,
        page,
        size,
        "articles",
      );
      output += "\n<articles>\n";
      output += articles.join("\n\n");
      output += "\n</articles>";

      return toolResult(output);
    } catch (error) {
      console.error("Error searching news articles:", error);
      return toolResult(
        `Error: Failed to search news articles: ${await createErrorMessage(
          error,
        )}`,
      );
    }
  };
}

/**
 * Tool definition for news articles search
 */
export const newsArticlesTool = {
  name: "search_news_articles",
  description:
    "Search and filter individual news articles from 200k+ global sources. Use this for finding specific articles by keyword, topic, category, source, location, person, company, journalist, sentiment, or time range. Supports Boolean query syntax (AND, OR, NOT), exact phrases, and wildcards. Returns full article metadata: content/summary, entities, topics, taxonomies, keywords, sentiment, story cluster ID, and matchedAuthors (journalist IDs — feed into search_journalists(journalistIds) to profile who wrote it). A null field here may reflect this key's plan rather than absent data — see get_api_access.",
  parameters: newsArticlesArgs,
  createHandler: (perigon: Perigon) => searchNewsArticles(perigon),
} satisfies ToolDefinition<typeof newsArticlesArgs>;
