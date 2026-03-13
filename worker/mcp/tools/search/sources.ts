import { SortBy } from "@goperigon/perigon-ts";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../../lib/perigon";
import { ToolCallback, ToolDefinition } from "../types";
import { paginationArgs, locationArgs } from "../schemas/base";
import { createSearchField } from "../schemas/search";
import { toolResult, noResults, createPaginationHeader } from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";

/**
 * Schema for sources search arguments
 */
export const sourcesArgs = z.object({
  ...paginationArgs.shape,
  ...locationArgs.shape,
  domains: z
    .array(z.string())
    .optional()
    .describe(
      "Filter by exact publisher domains or subdomains. Supports wildcards (* and ?) for pattern matching (e.g., *.cnn.com)."
    ),
  name: createSearchField("source name or alternative names"),
  sourceGroup: z
    .string()
    .optional()
    .describe(
      "Filter by curated source bundles: top10, top25, top50, top100, top25tech, top25crypto."
    ),
  paywall: z
    .boolean()
    .optional()
    .describe("Filter by paywall status: true for paywalled, false for free."),
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
  minMonthlyVisits: z
    .number()
    .int()
    .optional()
    .describe("Minimum monthly visitors threshold."),
  maxMonthlyVisits: z
    .number()
    .int()
    .optional()
    .describe("Maximum monthly visitors threshold."),
  minMonthlyPosts: z
    .number()
    .int()
    .optional()
    .describe("Minimum articles published per month."),
  maxMonthlyPosts: z
    .number()
    .int()
    .optional()
    .describe("Maximum articles published per month."),
});

/**
 * Search for news publications and media outlets
 * 
 * This tool helps you discover news publications and media outlets by various criteria:
 * - Name and domain search with wildcard support
 * - Geographic filtering (countries, states, cities)
 * - Audience size filtering (monthly visits)
 * - Publishing activity filtering (monthly posts)
 * - Domain-based filtering with pattern matching
 * 
 * Returns detailed source information including:
 * - Domain and website information
 * - Monthly visit statistics
 * - Top topics covered by the source
 * - Geographic focus areas
 * - Publishing frequency metrics
 * 
 * @param perigon - The Perigon API client instance
 * @returns Tool callback function for MCP
 */
export function searchSources(perigon: Perigon): ToolCallback {
  return async ({
    page,
    size,
    cities,
    states,
    countries,
    maxMonthlyPosts,
    minMonthlyPosts,
    maxMonthlyVisits,
    minMonthlyVisits,
    name,
    domains,
    sourceGroup,
    paywall,
  }: z.infer<typeof sourcesArgs>): Promise<CallToolResult> => {
    try {
      const result = await perigon.searchSources({
        name,
        domain: domains,
        sourceGroup,
        paywall,
        page,
        size,
        sourceCountry: countries,
        sourceState: states,
        sourceCity: cities,
        showNumResults: true,
        minMonthlyPosts,
        maxMonthlyPosts,
        maxMonthlyVisits,
        minMonthlyVisits,
      });

      if (result.numResults === 0) return noResults;

      const sources = result.results.map((source) => {
        return `<source name="${source.name}">
Domain: ${source.domain}
Monthly Visits: ${source.monthlyVisits}
Top Topics: ${source.topTopics?.map((topic) => topic.name).join(", ")}
</source>`;
      });

      let output = createPaginationHeader(
        result.numResults,
        page,
        size,
        "sources"
      );
      output += "\n<sources>\n";
      output += sources.join("\n\n");
      output += "\n</sources>";

      return toolResult(output);
    } catch (error) {
      console.error("Error searching sources:", error);
      return toolResult(
        `Error: Failed to search sources: ${await createErrorMessage(error)}`
      );
    }
  };
}

/**
 * Tool definition for sources search
 */
export const sourcesTool: ToolDefinition = {
  name: "search_sources",
  description:
    "Search 200k+ news publications and media outlets in the Perigon database. Use this to discover or compare news sources by name, domain, location, audience size, or publishing volume. Filter by curated bundles (top10, top100), paywall status, or geographic location. Returns source profiles with domain, monthly visits, top topics covered, and publishing frequency.",
  parameters: sourcesArgs,
  createHandler: (perigon: Perigon) => searchSources(perigon),
};