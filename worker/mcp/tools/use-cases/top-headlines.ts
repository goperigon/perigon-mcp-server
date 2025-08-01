import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../../lib/perigon";
import { ToolCallback, ToolDefinition } from "../types";
import { toolResult } from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";
/**
 * Schema for top headlines search arguments
 */
export const topHeadlinesArgs = z.object({
  country: z
    .string()
    .length(2)
    .default("us")
    .describe("Country code to filter news sources (default: 'us')"),
  category: z
    .string()
    .optional()
    .describe("Filter by news category (e.g., Politics, Tech, Sports, Business, Finance)"),
  hours: z
    .number()
    .int()
    .min(1)
    .max(168)
    .default(24)
    .describe("Number of hours back to search for headlines (default: 24 hours)"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(10)
    .describe("Maximum number of headlines to return (default: 10)"),
});

/**
 * Get current top headlines
 * 
 * This tool provides the most important and trending news stories by:
 * 1. Searching for recent news stories (clustered headlines)
 * 2. Filtering by recency using today's date and time
 * 3. Sorting by relevance and story count to surface top stories
 * 4. Optionally filtering by category and country
 * 
 * Perfect for:
 * - Getting current breaking news and top stories
 * - Staying updated on the most important news of the day
 * - Filtering headlines by specific categories or regions
 * - Quick overview of trending news topics
 * 
 * @param perigon - The Perigon API client instance
 * @returns Tool callback function for MCP
 */
export function getTopHeadlines(perigon: Perigon): ToolCallback {
  return async ({
    country,
    category,
    hours,
    limit,
  }: z.infer<typeof topHeadlinesArgs>): Promise<CallToolResult> => {
    try {
      // Calculate the date range for recent headlines
      const now = new Date();
      const fromDate = new Date(now);
      fromDate.setHours(now.getHours() - hours);
      
      const nowStr = now.toISOString();
      const timeRange = hours <= 24 ? `${hours} hours` : `${Math.round(hours / 24)} days`;

      // Search for recent top news stories
      const storiesResult = await perigon.searchStories({
        from: fromDate,
        to: now,
        country: [country],
        category: category ? [category] : undefined,
        size: limit,
        sortBy: "count", // Sort by story count to get most covered stories
      });

      if (storiesResult.numResults === 0) {
        const categoryFilter = category ? ` in ${category}` : "";
        return toolResult(`No top headlines found${categoryFilter} for ${country.toUpperCase()} in the last ${timeRange}.`);
      }

      const headlines = storiesResult.results.map((story, index) => {
        const sentiment = story.sentiment ? JSON.stringify(story.sentiment) : 'N/A';
        
        return `<headline rank="${index + 1}" id="${story.id}">
Title: ${story.name}
Summary: ${story.summary}
Created: ${story.createdAt} (UTC)
Updated: ${story.updatedAt} (UTC)
Sentiment: ${sentiment}
</headline>`;
      });

      const categoryFilter = category ? ` (${category})` : "";
      let output = `Top ${storiesResult.numResults} headlines for ${country.toUpperCase()}${categoryFilter} (last ${timeRange}, as of ${nowStr}):`;
      output += "\n\n<headlines>\n";
      output += headlines.join("\n\n");
      output += "\n</headlines>";

      return toolResult(output);
    } catch (error) {
      console.error("Error getting top headlines:", error);
      return toolResult(
        `Error: Failed to get top headlines: ${await createErrorMessage(error)}`
      );
    }
  };
}

/**
 * Tool definition for top headlines
 */
export const topHeadlinesTool: ToolDefinition = {
  name: "get_top_headlines",
  description:
    "Get current top headlines and breaking news stories. Searches for the most important and trending news by story count and recency. Includes today's date and time for proper temporal filtering.",
  parameters: topHeadlinesArgs,
  createHandler: (perigon: Perigon) => getTopHeadlines(perigon),
};