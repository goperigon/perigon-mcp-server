import { AllEndpointSortBy } from "@goperigon/perigon-ts";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../../lib/perigon";
import { ToolCallback, ToolDefinition } from "../types";
import {
  createBaseSearchArgs,
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
      `${AllEndpointSortBy.Date}/${AllEndpointSortBy.PubDate}: newest published first; ${AllEndpointSortBy.ReverseDate}: oldest first; ${AllEndpointSortBy.AddDate}/${AllEndpointSortBy.ReverseAddDate}: by ingestion time; ${AllEndpointSortBy.RefreshDate}: most recently refreshed.`,
    )
    .default(AllEndpointSortBy.Date)
    .optional(),
  articleIds: z
    .array(z.string())
    .optional()
    .describe("Article IDs."),
  journalistIds: z
    .array(z.string())
    .optional()
    .describe("Author journalist IDs."),
  newsStoryIds: z
    .array(z.string())
    .optional()
    .describe("Story (cluster) IDs the articles belong to."),
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
      "Curated publisher bundles: top10, top25, top50, top100, top25tech, top25crypto, or an org source group.",
    ),
  category: z
    .array(z.string())
    .optional()
    .describe(
      "Content categories (e.g. Politics, Tech, Sports, Business, Finance); 'none' = uncategorized.",
    ),
  topic: z
    .array(z.string())
    .optional()
    .describe(
      "Topics, more granular than categories (e.g. Markets, Crime, Climate Change).",
    ),
  language: z
    .array(z.string())
    .optional()
    .describe(
      "ISO-639 lowercase language codes (e.g. en, es, ja).",
    ),
  label: z
    .array(z.string())
    .optional()
    .describe(
      "Editorial labels: Opinion, Paid-news, Non-news, Fact Check, Press Release.",
    ),
  medium: z
    .array(z.string())
    .optional()
    .describe("Article or Video."),
  personName: z
    .array(z.string())
    .optional()
    .describe("Mentioned people, exact name."),
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
  showReprints: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "Include wire-service reprints (AP, Reuters) duplicated across sites.",
    ),
  addDateFrom: z
    .string()
    .transform((str) => (str === "" ? undefined : new Date(str)))
    .optional()
    .describe(
      "Ingested by Perigon after this date.",
    ),
  addDateTo: z
    .string()
    .transform((str) => (str === "" ? undefined : new Date(str)))
    .optional()
    .describe(
      "Ingested by Perigon before this date.",
    ),
  positiveSentimentFrom: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("Min positive sentiment."),
  positiveSentimentTo: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("Max positive sentiment."),
  negativeSentimentFrom: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("Min negative sentiment."),
  negativeSentimentTo: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("Max negative sentiment."),
  summarize: z
    .boolean()
    .default(true)
    .describe("Return summaries instead of full content."),
  title: createSearchField("headline").describe("Like query, headline only."),
  desc: createSearchField("description").describe(
    "Like query, description only.",
  ),
  content: createSearchField("body").describe("Like query, body only."),
  url: createSearchField("URL").describe(
    "Like query, on the URL (e.g. source=cnn.com with url=travel for a section).",
  ),
  taxonomy: z
    .array(z.string())
    .optional()
    .describe("Google Content Category full path (e.g. /Finance/Banking/Other)."),
  prefixTaxonomy: z
    .string()
    .optional()
    .describe("Google Content Category prefix (e.g. /Finance)."),
  lat: z
    .number()
    .min(-90)
    .max(90)
    .optional()
    .describe("Geo radius center latitude."),
  lon: z
    .number()
    .min(-180)
    .max(180)
    .optional()
    .describe("Geo radius center longitude."),
  maxDistance: z
    .number()
    .min(1)
    .max(300)
    .optional()
    .describe("Geo radius in km from lat/lon."),
  sourceCountry: z
    .array(z.string())
    .optional()
    .describe("Country the publisher is located in."),
  sourceState: z
    .array(z.string())
    .optional()
    .describe("US state the publisher is located in."),
  sourceCity: z
    .array(z.string())
    .optional()
    .describe("City the publisher is located in."),
  byline: z
    .array(z.string())
    .optional()
    .describe("Exact byline text."),
  author: z
    .array(z.string())
    .optional()
    .describe("Exact author name."),
  linkTo: z
    .string()
    .optional()
    .describe("Articles linking to this URL pattern."),
  reprintGroupId: z
    .string()
    .optional()
    .describe("Every article in one reprint group (original plus reprints)."),
  searchTranslation: z
    .boolean()
    .optional()
    .describe("Also match translated text of non-English articles."),
  neutralSentimentFrom: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("Min neutral sentiment."),
  neutralSentimentTo: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("Max neutral sentiment."),
  refreshDateFrom: z
    .string()
    .transform((str) => (str === "" ? undefined : new Date(str)))
    .optional()
    .describe("Refreshed in Perigon after this date."),
  refreshDateTo: z
    .string()
    .transform((str) => (str === "" ? undefined : new Date(str)))
    .optional()
    .describe("Refreshed in Perigon before this date."),
  personWikidataId: z
    .array(z.string())
    .optional()
    .describe("Mentioned people, by Wikidata ID (preferred over personName)."),
  companyId: z
    .array(z.string())
    .optional()
    .describe("Mentioned companies, by company ID."),
  companyName: z
    .string()
    .optional()
    .describe("Mentioned company, exact name."),
  watchlist: z
    .array(z.string())
    .optional()
    .describe("Articles mentioning any entity in these watchlist IDs."),
  excludeWatchlist: z
    .array(z.string())
    .optional()
    .describe("Exclude articles mentioning entities in these watchlists."),
  paywall: z
    .boolean()
    .optional()
    .describe("Whether the publisher has a paywall."),
  excludeSources: z
    .array(z.string())
    .optional()
    .describe("Exclude publisher domains or subdomains (supports wildcards)."),
  excludeSourceGroup: z
    .array(z.string())
    .optional()
    .describe("Exclude source groups."),
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
    .describe("Exclude ISO-639 language codes."),
  excludeJournalistId: z
    .array(z.string())
    .optional()
    .describe("Exclude author journalist IDs."),
  excludePersonName: z
    .array(z.string())
    .optional()
    .describe("Exclude articles mentioning these person names."),
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
    .describe("Exclude articles mentioning these company domains."),
  excludeCompanySymbol: z
    .array(z.string())
    .optional()
    .describe("Exclude articles mentioning these tickers."),
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
      const { country, defaultCountryApplied } = resolveCountries(
        countries,
        cities,
        states,
        location,
        lat !== undefined || lon !== undefined,
      );
      let searchParams: any = {
        q: query,
        page,
        size,
        state: states,
        city: cities,
        country,
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

      if (result.numResults === 0) {
        return toolResult(
          withDefaultCountryNote("No results found", defaultCountryApplied),
        );
      }

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

      return toolResult(withDefaultCountryNote(output, defaultCountryApplied));
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
  title: "Articles",
  description:
    "Search individual news articles from 200k+ global sources by keyword, topic, category, source, location, person, company, journalist, sentiment, or time. Returns content or summary, entities, topics, taxonomies, keywords, sentiment, story ID, and matchedAuthors (journalist IDs for search_journalists(journalistIds)). A null field may reflect this key's plan rather than absent data — see get_api_access." +
    " " +
    describeDefaultCountry([
      "countries",
      "cities",
      "states",
      "location",
      "lat",
      "lon",
    ]),
  parameters: newsArticlesArgs,
  annotations: {
    readOnlyHint: true,
    openWorldHint: true,
    destructiveHint: false,
  },
  createHandler: (perigon: Perigon) => searchNewsArticles(perigon),
} satisfies ToolDefinition<typeof newsArticlesArgs>;
