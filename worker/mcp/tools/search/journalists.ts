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
  name: createSearchField("name").describe("Like query, name only."),
  categories,
  topics,
  labels: z
    .array(z.string())
    .optional()
    .describe(
      "Type of content they typically produce (e.g. Opinion, Paid-news, Non-news).",
    ),
  journalistIds: z
    .array(z.string())
    .optional()
    .describe("Journalist IDs."),
  sources: z
    .array(z.string())
    .optional()
    .describe(
      "Publisher domains they write for; wildcards supported (e.g. *.cnn.com).",
    ),
  twitter: z
    .string()
    .optional()
    .describe("Exact Twitter/X handle, without @."),
  maxMonthlyPosts: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Maximum articles per month."),
  minMonthlyPosts: z
    .number()
    .min(0)
    .int()
    .positive()
    .optional()
    .describe("Minimum articles per month."),
  countries: z
    .array(z.string())
    .optional()
    .transform((countries) => {
      if (!countries) return undefined;
      return countries.map((country) => country.toLowerCase());
    })
    .describe(
      "Reporting focus: countries they commonly cover, not where they are based (use locationCountry). Lowercase 2-letter codes (e.g. us, gb). No default.",
    ),
  locationCountry: z
    .array(z.string())
    .optional()
    .transform((values) => values?.map((v) => v.toLowerCase()))
    .describe(
      "Profile location: country they are based in. Exact match, lowercase 2-letter code (e.g. us, gb; uk is accepted). Wrong casing returns zero results.",
    ),
  locationState: z
    .array(z.string())
    .optional()
    .describe(
      "Profile location: US state they are based in. Exact match, uppercase 2-letter code (e.g. NY).",
    ),
  locationCounty: z
    .array(z.string())
    .optional()
    .describe(
      "Profile location: county they are based in. Exact full name (e.g. 'Los Angeles County').",
    ),
  locationCity: z
    .array(z.string())
    .optional()
    .describe(
      "Profile location: city they are based in. Exact match, proper-cased (London, not london).",
    ),
  locationArea: z
    .array(z.string())
    .optional()
    .describe(
      "Profile location: neighborhood, borough, or district they are based in. Exact match, stored casing.",
    ),
  updatedAtFrom: z
    .string()
    .optional()
    .describe("Profile updated after this date."),
  updatedAtTo: z
    .string()
    .optional()
    .describe("Profile updated before this date."),
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
Email: ${journalist.email ?? "N/A"}
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
  title: "Journalists",
  description:
    "Search 230k+ journalist profiles to find who covers a topic, publication, or region, or who is based in a place. `countries` filters reporting focus (what they cover); `locationCountry`/`locationState`/`locationCounty`/`locationCity`/`locationArea` filter where they are based — these AND together, so pass only the narrowest level the user named. Returns top sources, profile locations, reporting-focus countries, monthly posting frequency, and email when the key has journalist email access. An empty location result is usually a casing mismatch, not an absence of journalists.",
  parameters: journalistsArgs,
  annotations: {
    readOnlyHint: true,
    openWorldHint: true,
    destructiveHint: false,
  },
  createHandler: (perigon: Perigon) => searchJournalists(perigon),
} satisfies ToolDefinition<typeof journalistsArgs>;
