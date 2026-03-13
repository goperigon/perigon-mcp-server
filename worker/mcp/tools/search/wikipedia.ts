import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../../lib/perigon";
import { ToolCallback, ToolDefinition } from "../types";
import { paginationArgs } from "../schemas/base";
import { createSearchField, sortByEnum } from "../schemas/search";
import { toolResult, noResults, createPaginationHeader } from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";
import { SortBy } from "@goperigon/perigon-ts";

/**
 * Schema for Wikipedia search arguments
 */
function parseTime(str: string) {
  if (str === "") return undefined;
  return new Date(str);
}

export const wikipediaArgs = z.object({
  ...paginationArgs.shape,
  query: createSearchField("Wikipedia article content and titles"),
  title: createSearchField("Wikipedia page titles"),
  summary: createSearchField("Wikipedia page summary"),
  text: createSearchField("Wikipedia page content (across all sections)"),
  reference: createSearchField("Wikipedia page references"),
  wikiCode: z
    .array(z.string())
    .optional()
    .describe(
      "Wiki project codes (e.g., enwiki). Currently only 'enwiki' is supported."
    ),
  wikidataId: z
    .array(z.string())
    .optional()
    .describe("Filter by Wikidata entity IDs (e.g., Q42, Q937)."),
  wikidataInstanceOfId: z
    .array(z.string())
    .optional()
    .describe(
      "Filter pages whose Wikidata entities are instances of these IDs."
    ),
  wikidataInstanceOfLabel: z
    .array(z.string())
    .optional()
    .describe(
      "Filter pages whose Wikidata entities are instances of these labels (e.g., human, city, country)."
    ),
  category: z
    .array(z.string())
    .optional()
    .describe("Filter by Wikipedia categories."),
  withPageviews: z
    .boolean()
    .optional()
    .describe("Only return pages that have viewership statistics."),
  pageviewsFrom: z
    .number()
    .optional()
    .describe("Minimum average daily page views."),
  pageviewsTo: z
    .number()
    .optional()
    .describe("Maximum average daily page views."),
  wikiRevisionFrom: z
    .string()
    .transform(parseTime)
    .optional()
    .describe(
      "Pages modified on Wikipedia after this date. ISO 8601 or yyyy-mm-dd."
    ),
  wikiRevisionTo: z
    .string()
    .transform(parseTime)
    .optional()
    .describe(
      "Pages modified on Wikipedia before this date. ISO 8601 or yyyy-mm-dd."
    ),
  scrapedAtFrom: z
    .string()
    .transform(parseTime)
    .optional()
    .describe(
      "Pages scraped/indexed by Perigon after this date. ISO 8601 or yyyy-mm-dd."
    ),
  scrapedAtTo: z
    .string()
    .transform(parseTime)
    .optional()
    .describe(
      "Pages scraped/indexed by Perigon before this date. ISO 8601 or yyyy-mm-dd."
    ),
  sortBy: sortByEnum.default(SortBy.Relevance).optional(),
});

/**
 * Search Wikipedia pages for information on any topic
 * 
 * This tool provides comprehensive search capabilities across Wikipedia content,
 * allowing you to find relevant articles and information on virtually any topic.
 * 
 * Search capabilities:
 * - Full-text search across article content and titles
 * - Targeted searches in specific sections (title, summary, text, references)
 * - Wikidata integration for precise entity identification
 * - Category-based filtering for topic organization
 * - Page popularity filtering using view statistics
 * - Advanced Elasticsearch query syntax support
 * 
 * Filtering options:
 * - Wikidata entity IDs for precise identification
 * - Wikipedia categories for topic-based filtering
 * - Page view statistics for popularity-based filtering
 * - Instance-of relationships for entity type filtering
 * - Multiple wiki project support (currently English Wikipedia)
 * 
 * Returns comprehensive page information including:
 * - Page titles and URLs
 * - Article summaries and content excerpts
 * - Wikidata identifiers for cross-referencing
 * - Category classifications
 * - Page view statistics and popularity metrics
 * - Last modification timestamps
 * 
 * @param perigon - The Perigon API client instance
 * @returns Tool callback function for MCP
 */
export function searchWikipedia(perigon: Perigon): ToolCallback {
  return async ({
    query,
    title,
    summary,
    text,
    reference,
    page,
    size,
    wikiCode,
    wikidataId,
    wikidataInstanceOfId,
    wikidataInstanceOfLabel,
    category,
    withPageviews,
    pageviewsFrom,
    pageviewsTo,
    wikiRevisionFrom,
    wikiRevisionTo,
    scrapedAtFrom,
    scrapedAtTo,
    sortBy,
  }: z.infer<typeof wikipediaArgs>): Promise<CallToolResult> => {
    try {
      const result = await perigon.searchWikipedia({
        q: query,
        title,
        summary,
        text,
        reference,
        page,
        size,
        wikiCode,
        wikidataId,
        wikidataInstanceOfId,
        wikidataInstanceOfLabel,
        category,
        withPageviews,
        pageviewsFrom,
        pageviewsTo,
        wikiRevisionFrom,
        wikiRevisionTo,
        scrapedAtFrom,
        scrapedAtTo,
        sortBy,
        showNumResults: true,
      });

      if (result.numResults === 0) return noResults;

      const articles = result.results.map((page) => {
        return `<wikipedia_page id="${page.id}" title="${page.wikiTitle}">
URL: ${page.url}
Summary: ${page.summary}
Wikidata ID: ${page.wikidataId}
Categories: ${page.categories?.join(", ") || "N/A"}
Page Views: ${page.pageviews || "N/A"}
Last Modified: ${page.wikiRevisionTs}
</wikipedia_page>`;
      });

      let output = createPaginationHeader(
        result.numResults,
        page,
        size,
        "Wikipedia pages"
      );
      output += "\n<wikipedia_pages>\n";
      output += articles.join("\n\n");
      output += "\n</wikipedia_pages>";

      return toolResult(output);
    } catch (error) {
      console.error("Error searching Wikipedia:", error);
      return toolResult(
        `Error: Failed to search Wikipedia: ${await createErrorMessage(error)}`
      );
    }
  };
}

/**
 * Tool definition for Wikipedia search
 */
export const wikipediaTool: ToolDefinition = {
  name: "search_wikipedia",
  description:
    "Search Wikipedia pages using keyword-based queries with advanced filtering. Use this for factual background information, encyclopedia-style lookups, or when you need structured Wikipedia data. Filter by title, summary, content, Wikidata entity IDs, categories, page views, and revision dates. Returns page summaries, URLs, Wikidata IDs, categories, page view statistics, and last modification dates.",
  parameters: wikipediaArgs,
  createHandler: (perigon: Perigon) => searchWikipedia(perigon),
};