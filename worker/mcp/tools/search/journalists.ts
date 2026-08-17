import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../../lib/perigon";
import { ToolCallback, ToolDefinition } from "../types";
import { paginationArgs, categories, topics } from "../schemas/base";
import { createSearchField } from "../schemas/search";
import {
  toolResult,
  noResults,
  createPaginationHeader,
} from "../utils/formatting";
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
      "Filter journalists by the type of content they typically produce (e.g., Opinion, Paid-news, Non-news).",
    ),
  journalistIds: z
    .array(z.string())
    .optional()
    .describe("Filter for specific journalists by their unique IDs."),
  sources: z
    .array(z.string())
    .optional()
    .describe(
      "Filter journalists by publisher domains or subdomains. Supports wildcards (e.g., *.cnn.com).",
    ),
  twitter: z
    .string()
    .optional()
    .describe("Filter by exact Twitter/X handle (without the @ symbol)."),
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
    .transform((countries) => {
      if (!countries) return undefined;
      return countries.map((country) => country.toLowerCase());
    })
    .describe(
      "Reporting focus: countries this journalist commonly covers in their published articles (derived from topCountries), not where they are based. Two-letter codes, lowercase (e.g., us, gb, jp). For 'based in' use locationCountry instead. No default — omit for global results.",
    ),
  locationCountry: z
    .array(z.string())
    .optional()
    .transform((values) => values?.map((v) => v.toLowerCase()))
    .describe(
      "Profile location: country the journalist is personally based in (locations.country), distinct from `countries` (reporting focus). Exact match, lowercase ISO 3166-1 alpha-2 (e.g., us, gb, jp); 'uk' is accepted as an alias for 'gb'. Wrong casing returns zero results, not an error.",
    ),
  locationState: z
    .array(z.string())
    .optional()
    .describe(
      "Profile location: US state the journalist is based in (locations.state). Exact match, two-letter code, uppercase (e.g., NY, CA).",
    ),
  locationCounty: z
    .array(z.string())
    .optional()
    .describe(
      "Profile location: county the journalist is based in (locations.county). Exact match against the full stored name (e.g., 'Los Angeles County').",
    ),
  locationCity: z
    .array(z.string())
    .optional()
    .describe(
      "Profile location: city the journalist is based in (locations.city). Exact match, proper-cased (e.g., London, not london).",
    ),
  locationArea: z
    .array(z.string())
    .optional()
    .describe(
      "Profile location: neighborhood, borough, or district the journalist is based in (locations.area). Exact match against stored casing.",
    ),
  updatedAtFrom: z
    .string()
    .optional()
    .describe("Filter for journalist profiles updated after this date (ISO 8601 or yyyy-mm-dd)."),
  updatedAtTo: z
    .string()
    .optional()
    .describe("Filter for journalist profiles updated before this date (ISO 8601 or yyyy-mm-dd)."),
});

/**
 * Search for journalists and reporters
 *
 * This tool helps you find journalists and reporters by various criteria including:
 * - Name and title search
 * - Publication/source filtering
 * - Reporting-focus filtering by countries they cover (`countries`)
 * - Profile-location filtering by where they are based (`locationCountry`/`locationState`/`locationCounty`/`locationCity`/`locationArea`)
 * - Activity level filtering (monthly posts)
 * - Content type filtering (opinion, news, etc.)
 * - Category and topic specialization
 *
 * Returns detailed journalist profiles including:
 * - Top sources they write for
 * - All five levels of their own profile location
 * - Reporting-focus countries (topCountries), labelled distinctly from profile location
 * - Monthly posting activity
 * - Content categories and topics
 *
 * Uses the raw `/v1/journalists/all` fetch rather than the SDK, since
 * `SearchJournalistsRequest` in `@goperigon/perigon-ts@1.1.2` does not declare
 * the five `location*` parameters.
 *
 * @param perigon - The Perigon API client instance
 * @returns Tool callback function for MCP
 */
export function searchJournalists(
  perigon: Perigon,
): ToolCallback<typeof journalistsArgs> {
  return async ({
    query,
    name,
    page,
    size,
    countries,
    journalistIds,
    maxMonthlyPosts,
    minMonthlyPosts,
    sources,
    twitter,
    categories,
    topics,
    labels,
    locationCountry,
    locationState,
    locationCounty,
    locationCity,
    locationArea,
    updatedAtFrom,
    updatedAtTo,
  }: z.infer<typeof journalistsArgs>): Promise<CallToolResult> => {
    try {
      const result = await perigon.searchJournalistsFull({
        id: journalistIds,
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
        locationCountry,
        locationState,
        locationCounty,
        locationCity,
        locationArea,
        updatedAtFrom,
        updatedAtTo,
      });

      if (result.numResults === 0) return noResults;

      const journalists = result.results.map((journalist) => {
        const locations = journalist.locations
          ?.map((location) => {
            const levels = [
              location.area,
              location.city,
              location.county,
              location.state,
              location.country,
            ].filter(Boolean);
            return levels.length > 0 ? `<location>${levels.join(", ")}</location>` : null;
          })
          .filter(Boolean)
          .join("\n  ");

        return `<journalist id="${journalist.id}" name="${journalist.name}">
Headline: ${journalist.headline}
Full Name: ${journalist.fullName ?? "N/A"}
Title: ${journalist.title ?? "N/A"}
Avg Monthly Posts: ${journalist.avgMonthlyPosts ?? "N/A"}
Sources:
  ${journalist?.topSources
    ?.map(
      (source) =>
        `\t- Source: ${source.name}, Articles they wrote for Source: ${source.count}`,
    )
    .join("\n")}
Based in (profile location):
  ${locations || "N/A"}
Reporting focus (countries commonly covered, not necessarily where based): ${
          journalist.topCountries?.map((c) => c.name).join(", ") || "N/A"
        }
Top Topics: ${journalist.topTopics?.map((t) => t.name).join(", ") || "N/A"}
Top Categories: ${journalist.topCategories?.map((c) => c.name).join(", ") || "N/A"}
Twitter: ${journalist.twitterHandle ?? "N/A"}
LinkedIn: ${journalist.linkedinUrl ?? "N/A"}
</journalist>`;
      });

      let output = createPaginationHeader(
        result.numResults,
        page,
        size,
        "journalists",
      );
      output += "\n<journalists>\n";
      output += journalists.join("\n\n");
      output += "\n</journalists>";

      return toolResult(output);
    } catch (error) {
      console.error("Error searching journalists:", error);
      return toolResult(
        `Error: Failed to search journalists: ${await createErrorMessage(error)}`,
      );
    }
  };
}

/**
 * Tool definition for journalists search
 */
export const journalistsTool = {
  name: "search_journalists",
  description:
    "Search 230k+ journalist and reporter profiles in the Perigon database. Use this to find who covers specific topics, publications, or regions — or who is personally based in a place. Two distinct location concepts: `countries` filters reporting focus (what they cover, derived from their published articles), while `locationCountry`/`locationState`/`locationCounty`/`locationCity`/`locationArea` filter their own profile location (where they are based) — these levels AND together, so pass only the narrowest level the user named. Also filter by name, Twitter handle, publication, content category, topic, or posting activity. Returns journalist profiles with their top sources, profile locations, reporting-focus countries, and monthly posting frequency. A location query returning nothing is usually a casing mismatch (exact-term matching), not an absence of journalists.",
  parameters: journalistsArgs,
  createHandler: (perigon: Perigon) => searchJournalists(perigon),
} satisfies ToolDefinition<typeof journalistsArgs>;
