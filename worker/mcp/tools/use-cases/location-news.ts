import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../../lib/perigon";
import { ToolCallback, ToolDefinition } from "../types";
import { toolResult } from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";
import { parseLocation } from "../utils/location";

/**
 * Schema for location news search arguments
 */
export const locationNewsArgs = z.object({
  location: z
    .string()
    .min(1)
    .describe(
      "Location to search for news about: a city, a US state name or code, or a country name or code. Names are resolved to codes (France → fr, Texas → TX).",
    ),
  days: z
    .number()
    .int()
    .min(1)
    .max(365)
    .default(7)
    .describe("Number of days back to search for news (default: 7 days)"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(10)
    .describe("Maximum number of articles to return (default: 10)"),
  locationType: z
    .enum(["auto", "city", "state", "country"])
    .default("auto")
    .describe("Type of location - 'auto' will try to detect automatically"),
});

/**
 * Get recent news by geographic location
 *
 * This tool simplifies finding recent news about any geographic location by:
 * 1. Intelligently parsing the location to determine if it's a city, state, or country
 * 2. Searching for recent news articles related to that location
 * 3. Automatically filtering by recency using today's date
 *
 * Perfect for:
 * - Getting local news for specific cities or regions
 * - Tracking news from particular states or countries
 * - Monitoring regional developments and events
 * - Research on location-specific news and activities
 *
 * @param perigon - The Perigon API client instance
 * @returns Tool callback function for MCP
 */
export function getLocationNews(
  perigon: Perigon,
): ToolCallback<typeof locationNewsArgs> {
  return async ({
    location,
    days,
    limit,
    locationType,
  }: z.infer<typeof locationNewsArgs>): Promise<CallToolResult> => {
    try {
      // Calculate the date range for recent news
      const today = new Date();
      const fromDate = new Date(today);
      fromDate.setDate(today.getDate() - days);

      const todayStr = today.toISOString().split("T")[0];

      // Determine location type and prepare search parameters
      const searchParams: any = {
        q: location, // Always include location in query
        from: fromDate,
        to: today,
        size: limit,
        sortBy: "date",
        showNumResults: true,
        showReprints: false,
      };

      Object.assign(searchParams, parseLocation(location, locationType).filter);

      // Search for recent news about the location
      const newsResult = await perigon.searchArticles(searchParams);

      if (newsResult.numResults === 0) {
        return toolResult(
          `No recent news found for "${location}" in the last ${days} days.`,
        );
      }

      const articles = newsResult.articles.map((article) => {
        const journalistIds =
          article.journalists?.map((journalist) => journalist.id).join(", ") ??
          "";

        return `<article id="${article.articleId}" title="${article.title}">
Content: ${article.summary || article.content}
Pub Date: ${article.pubDate} (UTC)
Source: ${article.source?.domain}
Story Id: ${article.clusterId}
Journalist Ids: ${journalistIds}
</article>`;
      });

      const detectedType = searchParams.city
        ? "city"
        : searchParams.state
          ? "state"
          : searchParams.country
            ? "country"
            : "location";

      let output = `Recent news for ${detectedType} "${location}" (last ${days} days, as of ${todayStr}):`;
      output += `\nFound ${newsResult.numResults} articles:\n`;
      output += "\n<articles>\n";
      output += articles.join("\n\n");
      output += "\n</articles>";

      return toolResult(output);
    } catch (error) {
      console.error("Error getting location news:", error);
      return toolResult(
        `Error: Failed to get news for location "${location}": ${await createErrorMessage(error)}`,
      );
    }
  };
}

/**
 * Tool definition for location news
 */
export const locationNewsTool = {
  name: "get_location_news",
  title: "Location news",
  description:
    "Quick shortcut to get recent news for a geographic location (city, state, or country). Automatically detects the location type and applies appropriate geographic filters. Use this for simple 'what's happening in [location]?' queries. For advanced filtering, use search_news_articles with explicit city/state/country parameters instead.",
  parameters: locationNewsArgs,
  annotations: {
    readOnlyHint: true,
    openWorldHint: true,
    destructiveHint: false,
  },
  createHandler: (perigon: Perigon) => getLocationNews(perigon),
} satisfies ToolDefinition<typeof locationNewsArgs>;
