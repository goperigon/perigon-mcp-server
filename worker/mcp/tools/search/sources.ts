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
      `Filter sources by specific publisher domains or subdomains. Supports wildcards (* and ?) for pattern matching (e.g., *cnn.com)`
    ),
  name: createSearchField("source name or alternative names"),
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
    .describe("Filter for sources with at least this many monthly visits"),
  maxMonthlyVisits: z
    .number()
    .int()
    .optional()
    .describe("Filter for sources with no more than this many monthly visits"),
  minMonthlyPosts: z
    .number()
    .int()
    .optional()
    .describe("Filter for sources with at least this many monthly posts"),
  maxMonthlyPosts: z
    .number()
    .int()
    .optional()
    .describe("Filter for sources with no more than this many monthly posts"),
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
  }: z.infer<typeof sourcesArgs>): Promise<CallToolResult> => {
    try {
      const result = await perigon.searchSources({
        name: name,
        domain: domains,
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
    "Discover news publications and media outlets by name, domain, location, or audience size. Returns source details including monthly visits, top topics, and geographic focus.",
  parameters: sourcesArgs,
  createHandler: (perigon: Perigon) => searchSources(perigon),
};