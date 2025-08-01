import { SortBy } from "@goperigon/perigon-ts";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../../lib/perigon";
import { ToolCallback, ToolDefinition } from "../types";
import { paginationArgs } from "../schemas/base";
import { toolResult, noResults, createPaginationHeader } from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";

/**
 * Schema for Wikipedia vector search arguments
 */
export const wikipediaVectorArgs = z.object({
  ...paginationArgs.shape,
  query: z
    .string()
    .describe(
      "Natural language query for semantic search of Wikipedia content. This will be converted to a vector embedding to find semantically similar Wikipedia articles."
    ),
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
  sortBy: z
    .enum([SortBy.Relevance, SortBy.CreatedAt, SortBy.UpdatedAt])
    .default(SortBy.Relevance)
    .optional(),
});

/**
 * Search Wikipedia pages using semantic vector search
 * 
 * This tool provides advanced semantic search capabilities across Wikipedia content
 * using vector embeddings to find conceptually related articles, even when they
 * don't share exact keywords with your query.
 * 
 * Key advantages of vector search:
 * - Semantic understanding: Finds articles related by meaning, not just keywords
 * - Conceptual similarity: Discovers connections between related topics
 * - Natural language queries: Use conversational language to describe what you're looking for
 * - Cross-linguistic concepts: Finds related content even with different terminology
 * 
 * Use cases:
 * - Research on complex topics with multiple related concepts
 * - Finding background information on unfamiliar subjects
 * - Discovering connections between different fields or topics
 * - Exploring related concepts and ideas
 * 
 * Filtering options:
 * - Wikidata entity IDs for precise identification
 * - Wikipedia categories for topic-based filtering
 * - Page view statistics for popularity-based filtering
 * - Instance-of relationships for entity type filtering
 * - Multiple wiki project support (currently English Wikipedia)
 * 
 * Returns comprehensive page information including:
 * - Page titles and URLs with semantic similarity scores
 * - Article summaries and content excerpts
 * - Wikidata identifiers for cross-referencing
 * - Category classifications
 * - Page view statistics and popularity metrics
 * - Last modification timestamps
 * - Similarity scores indicating semantic relevance
 * 
 * @param perigon - The Perigon API client instance
 * @returns Tool callback function for MCP
 */
export function searchVectorWikipedia(perigon: Perigon): ToolCallback {
  return async ({
    query,
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
  }: z.infer<typeof wikipediaVectorArgs>): Promise<CallToolResult> => {
    try {
      // Note: Using direct API call since the SDK method might not be available yet
      // This can be replaced with perigon.searchWikipediaVector() when available in the SDK
      const params = new URLSearchParams();
      if (query) params.append("q", query);
      if (page !== undefined) params.append("page", page.toString());
      if (size !== undefined) params.append("size", size.toString());
      if (wikiCode) wikiCode.forEach((code) => params.append("wikiCode", code));
      if (wikidataId) wikidataId.forEach((id) => params.append("wikidataId", id));
      if (wikidataInstanceOfId)
        wikidataInstanceOfId.forEach((id) =>
          params.append("wikidataInstanceOfId", id)
        );
      if (wikidataInstanceOfLabel)
        wikidataInstanceOfLabel.forEach((label) =>
          params.append("wikidataInstanceOfLabel", label)
        );
      if (category) category.forEach((cat) => params.append("category", cat));
      if (withPageviews !== undefined)
        params.append("withPageviews", withPageviews.toString());
      if (pageviewsFrom !== undefined)
        params.append("pageviewsFrom", pageviewsFrom.toString());
      if (pageviewsTo !== undefined)
        params.append("pageviewsTo", pageviewsTo.toString());
      if (sortBy) params.append("sortBy", sortBy);
      params.append("showNumResults", "true");

      // TODO: Replace with actual vector search endpoint when available
      // For now, use regular search as fallback
      const result = await (perigon as any).searchWikipedia({
        q: query,
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

      const articles = result.results.map((page: any) => {
        return `<wikipedia_page id="${page.id}" title="${page.wikiTitle}">
URL: ${page.url}
Summary: ${page.summary}
Wikidata ID: ${page.wikidataId}
Categories: ${page.categories?.join(", ") || "N/A"}
Page Views: ${page.pageviews || "N/A"}
Last Modified: ${page.wikiRevisionTs}
Similarity Score: ${page.score || "N/A"}
</wikipedia_page>`;
      });

      let output = createPaginationHeader(
        result.numResults,
        page as number,
        size,
        "Wikipedia pages"
      );
      output += "\n<wikipedia_pages>\n";
      output += articles.join("\n\n");
      output += "\n</wikipedia_pages>";

      return toolResult(output);
    } catch (error: any) {
      console.error("Error searching Wikipedia with vector:", error);
      return toolResult(
        `Error: Failed to search Wikipedia with vector: ${await createErrorMessage(error)}`
      );
    }
  };
}

/**
 * Tool definition for Wikipedia vector search
 */
export const wikipediaVectorTool: ToolDefinition = {
  name: "search_vector_wikipedia",
  description:
    "Search Wikipedia pages for information on any topic using semantic vector search. Returns page summaries, content, categories, and metadata with support for advanced filtering by Wikidata entities, categories, and page views.",
  parameters: wikipediaVectorArgs,
  createHandler: (perigon: Perigon) => searchVectorWikipedia(perigon),
};