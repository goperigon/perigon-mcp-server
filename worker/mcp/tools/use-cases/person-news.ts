import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../../lib/perigon";
import { ToolCallback, ToolDefinition } from "../types";
import { toolResult } from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";

/**
 * Schema for person news search arguments
 */
export const personNewsArgs = z.object({
  personName: z
    .string()
    .min(1)
    .describe("Name of the person to search for news about"),
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
  country: z
    .string()
    .length(2)
    .default("us")
    .describe("Country code to filter news sources (default: 'us')"),
});

/**
 * Get recent news about a specific person
 * 
 * This tool simplifies finding recent news about any person by:
 * 1. First searching for the person to get accurate information
 * 2. Then searching for recent news articles mentioning that person
 * 3. Automatically filtering by recency using today's date
 * 
 * Perfect for:
 * - Tracking news about public figures, politicians, celebrities
 * - Getting latest updates on business leaders and executives
 * - Monitoring mentions of specific individuals in the news
 * - Research on newsworthy people and their recent activities
 * 
 * @param perigon - The Perigon API client instance
 * @returns Tool callback function for MCP
 */
export function getPersonNews(perigon: Perigon): ToolCallback {
  return async ({
    personName,
    days,
    limit,
    country,
  }: z.infer<typeof personNewsArgs>): Promise<CallToolResult> => {
    try {
      // Calculate the date range for recent news
      const today = new Date();
      const fromDate = new Date(today);
      fromDate.setDate(today.getDate() - days);
      
      const todayStr = today.toISOString().split('T')[0];

      // First, try to find the person to get more context
      let personInfo = "";
      try {
        const personResult = await perigon.searchPeople({
          name: personName,
          size: 1,
        });
        
        if (personResult.numResults > 0) {
          const person = personResult.results[0];
          personInfo = `\n<person-context>
Name: ${person.name}
Occupation: ${person.occupation || 'N/A'}
Position: ${person.position || 'N/A'}
Description: ${person.description || 'N/A'}
</person-context>\n`;
        }
      } catch (error) {
        // Continue even if person search fails
        console.warn("Person search failed, continuing with news search:", error);
      }

      // Search for recent news about the person
      const newsResult = await perigon.searchArticles({
        q: personName,
        from: fromDate,
        to: today,
        country: [country],
        size: limit,
        sortBy: "date",
        showNumResults: true,
        showReprints: false,
      });

      if (newsResult.numResults === 0) {
        return toolResult(`No recent news found for "${personName}" in the last ${days} days.${personInfo}`);
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

      let output = `Recent news for "${personName}" (last ${days} days, as of ${todayStr}):`;
      output += personInfo;
      output += `\nFound ${newsResult.numResults} articles:\n`;
      output += "\n<articles>\n";
      output += articles.join("\n\n");
      output += "\n</articles>";

      return toolResult(output);
    } catch (error) {
      console.error("Error getting person news:", error);
      return toolResult(
        `Error: Failed to get news for person "${personName}": ${await createErrorMessage(error)}`
      );
    }
  };
}

/**
 * Tool definition for person news
 */
export const personNewsTool: ToolDefinition = {
  name: "get_person_news",
  description:
    "Get recent news about a specific person. Searches for the person first to get context, then finds recent news articles mentioning that person. Includes today's date for proper temporal filtering.",
  parameters: personNewsArgs,
  createHandler: (perigon: Perigon) => getPersonNews(perigon),
};