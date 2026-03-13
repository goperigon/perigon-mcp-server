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
  query: createSearchField("journalist name, title, and Twitter bio"),
  name: createSearchField("journalist name specifically"),
  categories,
  topics,
  labels: z
    .array(z.string())
    .optional()
    .describe(
      "Filter journalists by the type of content they typically produce (e.g., Opinion, Paid-news, Non-news)."
    ),
  journalistIds: z
    .array(z.string())
    .optional()
    .describe("Filter for specific journalists by their unique IDs."),
  sources: z
    .array(z.string())
    .optional()
    .describe(
      "Filter journalists by publisher domains or subdomains. Supports wildcards (e.g., *.cnn.com)."
    ),
  twitter: z
    .string()
    .optional()
    .describe(
      "Filter by exact Twitter/X handle (without the @ symbol)."
    ),
  maxMonthlyPosts: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Maximum articles per month threshold."),
  minMonthlyPosts: z
    .number()
    .min(0)
    .int()
    .positive()
    .optional()
    .describe("Minimum articles per month threshold."),
  countries: z
    .array(z.string())
    .optional()
    .default(() => [...CONSTANTS.DEFAULT_COUNTRIES])
    .transform((countries) => {
      if (!countries) return undefined;
      return countries.map((country) => country.toLowerCase());
    })
    .describe(
      "Filter journalists by countries they commonly cover. Two-letter codes in lowercase (e.g., us, gb, jp)."
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
    name,
    page,
    size,
    countries,
    maxMonthlyPosts,
    minMonthlyPosts,
    sources,
    twitter,
    categories,
    topics,
    labels,
  }: z.infer<typeof journalistsArgs>): Promise<CallToolResult> => {
    try {
      const result = await perigon.searchJournalists({
        q: query,
        name,
        page,
        size,
        country: countries,
        source: sources,
        twitter,
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
    "Search 230k+ journalist and reporter profiles in the Perigon database. Use this to find who covers specific topics, publications, or regions. Filter by name, Twitter handle, publication, country, content category, topic, or posting activity. Returns journalist profiles with their top sources, geographic coverage areas, and monthly posting frequency.",
  parameters: journalistsArgs,
  createHandler: (perigon: Perigon) => searchJournalists(perigon),
};