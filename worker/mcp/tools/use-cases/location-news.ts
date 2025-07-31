import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../../lib/perigon";
import { ToolCallback, ToolDefinition } from "../types";
import { toolResult } from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";

/**
 * Schema for location news search arguments
 */
export const locationNewsArgs = z.object({
  location: z
    .string()
    .min(1)
    .describe("Location to search for news about (city, state, or country name)"),
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
export function getLocationNews(perigon: Perigon): ToolCallback {
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
      
      const todayStr = today.toISOString().split('T')[0];

      // Determine location type and prepare search parameters
      let searchParams: any = {
        q: location, // Always include location in query
        from: fromDate,
        to: today,
        size: limit,
        sortBy: "date",
        showNumResults: true,
        showReprints: false,
      };

      // Smart location detection and parameter setting
      if (locationType === "auto") {
        // Try to detect location type based on common patterns
        const locationLower = location.toLowerCase();
        
        // Common US state abbreviations and names
        const usStates = ['al', 'ak', 'az', 'ar', 'ca', 'co', 'ct', 'de', 'fl', 'ga', 'hi', 'id', 'il', 'in', 'ia', 'ks', 'ky', 'la', 'me', 'md', 'ma', 'mi', 'mn', 'ms', 'mo', 'mt', 'ne', 'nv', 'nh', 'nj', 'nm', 'ny', 'nc', 'nd', 'oh', 'ok', 'or', 'pa', 'ri', 'sc', 'sd', 'tn', 'tx', 'ut', 'vt', 'va', 'wa', 'wv', 'wi', 'wy'];
        const commonCountries = ['us', 'uk', 'ca', 'au', 'de', 'fr', 'jp', 'cn', 'in', 'br', 'mx', 'it', 'es', 'ru'];
        
        if (location.length === 2 && usStates.includes(locationLower)) {
          searchParams.state = [location.toUpperCase()];
        } else if (location.length === 2 && commonCountries.includes(locationLower)) {
          searchParams.country = [locationLower];
        } else if (locationLower.includes('county') || locationLower.includes('city') || 
                   locationLower.includes('town') || locationLower.includes('village')) {
          searchParams.city = [location];
        } else {
          // Default to treating as city for longer names
          searchParams.city = [location];
        }
      } else {
        // Use explicit location type
        switch (locationType) {
          case "city":
            searchParams.city = [location];
            break;
          case "state":
            searchParams.state = [location.toUpperCase()];
            break;
          case "country":
            searchParams.country = [location.toLowerCase()];
            break;
        }
      }

      // Search for recent news about the location
      const newsResult = await perigon.searchArticles(searchParams);

      if (newsResult.numResults === 0) {
        return toolResult(`No recent news found for "${location}" in the last ${days} days.`);
      }

      const articles = newsResult.articles.map((article) => {
        const journalistIds = article.journalists
          ?.map((journalist) => journalist.id)
          .join(", ") ?? "";

        return `<article id="${article.articleId}" title="${article.title}">
Content: ${article.summary || article.content}
Pub Date: ${article.pubDate} (UTC)
Source: ${article.source?.domain}
Story Id: ${article.clusterId}
Journalist Ids: ${journalistIds}
</article>`;
      });

      const detectedType = searchParams.city ? "city" : 
                          searchParams.state ? "state" : 
                          searchParams.country ? "country" : "location";

      let output = `Recent news for ${detectedType} "${location}" (last ${days} days, as of ${todayStr}):`;
      output += `\nFound ${newsResult.numResults} articles:\n`;
      output += "\n<articles>\n";
      output += articles.join("\n\n");
      output += "\n</articles>";

      return toolResult(output);
    } catch (error) {
      console.error("Error getting location news:", error);
      return toolResult(
        `Error: Failed to get news for location "${location}": ${await createErrorMessage(error)}`
      );
    }
  };
}

/**
 * Tool definition for location news
 */
export const locationNewsTool: ToolDefinition = {
  name: "get_location_news",
  description:
    "Get recent news by geographic location (city, state, or country). Intelligently detects location type and searches for relevant news articles. Includes today's date for proper temporal filtering.",
  parameters: locationNewsArgs,
  createHandler: (perigon: Perigon) => getLocationNews(perigon),
};