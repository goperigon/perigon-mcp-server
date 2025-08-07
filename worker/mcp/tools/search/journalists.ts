import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../../lib/perigon";
import { ToolCallback, ToolDefinition, CONSTANTS } from "../types";
import { paginationArgs, categories, topics } from "../schemas/base";
import { createSearchField } from "../schemas/search";
import { toolResult, noResults, createPaginationHeader } from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";

/**
 * Schema for journalists search arguments
 */
export const journalistsArgs = z.object({
  ...paginationArgs.shape,
  query: createSearchField("journalist name and title"),
  categories,
  topics,
  labels: z
    .array(z.string())
    .optional()
    .describe(
      "Filter journalists by the type of content they typically produce (e.g., Opinion, Paid-news, Non-news)"
    ),
  journalistIds: z
    .array(z.string())
    .optional()
    .describe("Filter for specific journalists by journalist ID."),
  sources: z
    .array(z.string())
    .optional()
    .describe(
      `Filter journalists by specific publisher domains or subdomains. Supports wildcards (* and ?) for pattern matching (e.g., *cnn.com)`
    ),
  maxMonthlyPosts: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Filter journalists by maximum monthly posts."),
  minMonthlyPosts: z
    .number()
    .min(0)
    .int()
    .positive()
    .optional()
    .describe("Filter journalists by minimum monthly posts."),
  countries: z
    .array(z.string())
    .optional()
    .default(() => [...CONSTANTS.DEFAULT_COUNTRIES])
    .transform((countries) => {
      if (!countries) return undefined;
      return countries.map((country) => country.toLowerCase());
    })
    .describe(
      "Filter journalists by countries they commonly cover in their reporting. Uses ISO 3166-1 alpha-2 two-letter country codes in lowercase (e.g., us, gb, jp)"
    ),
});

/**
 * Search for journalists and reporters
 * 
 * This tool helps you find journalists and reporters by various criteria including:
 * - Name and title search
 * - Publication/source filtering
 * - Location-based filtering by countries they cover
 * - Activity level filtering (monthly posts)
 * - Content type filtering (opinion, news, etc.)
 * - Category and topic specialization
 * 
 * Returns detailed journalist profiles including:
 * - Top sources they write for
 * - Geographic coverage areas
 * - Monthly posting activity
 * - Content categories and topics
 * 
 * @param perigon - The Perigon API client instance
 * @returns Tool callback function for MCP
 */
export function searchJournalists(perigon: Perigon): ToolCallback {
  return async ({
    query,
    page,
    size,
    countries,
    maxMonthlyPosts,
    minMonthlyPosts,
    sources,
    categories,
    topics,
    labels,
  }: z.infer<typeof journalistsArgs>): Promise<CallToolResult> => {
    try {
      const result = await perigon.searchJournalists({
        q: query,
        page,
        size,
        country: countries,
        source: sources,
        showNumResults: true,
        minMonthlyPosts,
        maxMonthlyPosts,
        label: labels,
        category: categories,
        topic: topics,
      });

      if (result.numResults === 0) return noResults;

      const journalists = result.results.map((journalist) => {
        return `<journalist id="${journalist.id}" name="${journalist.name}">
Headline: ${journalist.headline}
Sources:
  ${journalist?.topSources
    ?.map(
      (source) =>
        `\t- Source: ${source.name}, Articles they wrote for Source: ${source.count}`
    )
    .join("\n")}
Locations: ${journalist?.locations
          ?.map(
            (location) =>
              `Country: ${location.country}, City: ${location.city}`
          )
          .join(", ")}
</journalist>`;
      });

      let output = createPaginationHeader(
        result.numResults,
        page,
        size,
        "journalists"
      );
      output += "\n<journalists>\n";
      output += journalists.join("\n\n");
      output += "\n</journalists>";

      return toolResult(output);
    } catch (error) {
      console.error("Error searching journalists:", error);
      return toolResult(
        `Error: Failed to search journalists: ${await createErrorMessage(error)}`
      );
    }
  };
}

/**
 * Tool definition for journalists search
 */
export const journalistsTool: ToolDefinition = {
  name: "search_journalists",
  description:
    "Find journalists and reporters by name, publication, location, or coverage area. Returns journalist profiles with their top sources, locations, and monthly posting activity.",
  parameters: journalistsArgs,
  createHandler: (perigon: Perigon) => searchJournalists(perigon),
};