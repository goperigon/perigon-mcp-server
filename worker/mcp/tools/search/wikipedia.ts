import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../../lib/perigon";
import { ToolCallback, ToolDefinition } from "../types";
import { paginationArgs } from "../schemas/base";
import { createSearchField } from "../schemas/search";
import {
  toolResult,
  noResults,
  createPaginationHeader,
} from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";
import type { SortBy } from "@goperigon/perigon-ts";

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
  title: createSearchField("title").describe("Like query, title only."),
  summary: createSearchField("summary").describe("Like query, summary only."),
  text: createSearchField("text").describe("Like query, page text (all sections)."),
  reference: createSearchField("references").describe("Like query, references only."),
  wikiCode: z
    .array(z.string())
    .optional()
    .describe(
      "Wiki project codes; only enwiki is supported.",
    ),
  wikidataId: z
    .array(z.string())
    .optional()
    .describe("Wikidata IDs (e.g. Q42)."),
  wikidataInstanceOfId: z
    .array(z.string())
    .optional()
    .describe("Pages whose Wikidata entity is an instance of these IDs."),
  wikidataInstanceOfLabel: z
    .array(z.string())
    .optional()
    .describe(
      "Pages whose Wikidata entity is an instance of these labels (e.g. human, city).",
    ),
  category: z
    .array(z.string())
    .optional()
    .describe("Wikipedia categories."),
  withPageviews: z
    .boolean()
    .optional()
    .describe("Only pages with page-view statistics."),
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
      "Edited on Wikipedia after this date.",
    ),
  wikiRevisionTo: z
    .string()
    .transform(parseTime)
    .optional()
    .describe(
      "Edited on Wikipedia before this date.",
    ),
  scrapedAtFrom: z
    .string()
    .transform(parseTime)
    .optional()
    .describe(
      "Indexed by Perigon after this date.",
    ),
  scrapedAtTo: z
    .string()
    .transform(parseTime)
    .optional()
    .describe(
      "Indexed by Perigon before this date.",
    ),
  sortBy: z
    .enum([
      "relevance",
      "revisionTsDesc",
      "revisionTsAsc",
      "pageViewsDesc",
      "pageViewsAsc",
      "scrapedAtDesc",
      "scrapedAtAsc",
    ])
    .default("relevance")
    .optional()
    .describe(
      "revisionTs = last edit; scrapedAt = Perigon indexing time.",
    ),
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
export function searchWikipedia(
  perigon: Perigon,
): ToolCallback<typeof wikipediaArgs> {
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
        // The SDK's `SortBy` type is the generic enum; the real endpoint
        // accepts a distinct Wikipedia-specific set documented in its own
        // JSDoc above but not reflected in the type.
        sortBy: sortBy as SortBy | undefined,
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
        "Wikipedia pages",
      );
      output += "\n<wikipedia_pages>\n";
      output += articles.join("\n\n");
      output += "\n</wikipedia_pages>";

      return toolResult(output);
    } catch (error) {
      console.error("Error searching Wikipedia:", error);
      return toolResult(
        `Error: Failed to search Wikipedia: ${await createErrorMessage(error)}`,
      );
    }
  };
}

/**
 * Tool definition for Wikipedia search
 */
export const wikipediaTool = {
  name: "search_wikipedia",
  title: "Wikipedia",
  description:
    "Keyword search over Wikipedia pages for factual background. Returns summaries, URLs, Wikidata IDs, categories, page views, and last edit dates.",
  parameters: wikipediaArgs,
  annotations: {
    readOnlyHint: true,
    openWorldHint: true,
    destructiveHint: false,
  },
  createHandler: (perigon: Perigon) => searchWikipedia(perigon),
} satisfies ToolDefinition<typeof wikipediaArgs>;
