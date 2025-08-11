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
    .describe("Filter by Wikidata entity IDs (e.g., Q7747, Q937)"),
  wikidataInstanceOfId: z
    .array(z.string())
    .optional()
    .describe(
      "Filter pages whose Wikidata entities are instances of these IDs"
    ),
  wikidataInstanceOfLabel: z
    .array(z.string())
    .optional()
    .describe(
      "Filter pages whose Wikidata entities are instances of these labels"
    ),
  category: z
    .array(z.string())
    .optional()
    .describe("Filter by Wikipedia categories"),
  withPageviews: z
    .boolean()
    .optional()
    .describe("Whether to include only pages with viewership statistics"),
  pageviewsFrom: z
    .number()
    .optional()
    .describe("Minimum average daily page views"),
  pageviewsTo: z
    .number()
    .optional()
    .describe("Maximum average daily page views"),
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
    "Search Wikipedia pages for information on any topic. Returns page summaries, content, categories, and metadata with support for advanced filtering by Wikidata entities, categories, and page views.",
  parameters: wikipediaArgs,
  createHandler: (perigon: Perigon) => searchWikipedia(perigon),
};