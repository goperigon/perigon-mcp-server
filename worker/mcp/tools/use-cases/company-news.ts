import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../../lib/perigon";
import { ToolCallback, ToolDefinition } from "../types";
import { toolResult } from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";

/**
 * Schema for company news search arguments
 */
export const companyNewsArgs = z.object({
  companyName: z
    .string()
    .min(1)
    .describe("Name of the company to search for news about"),
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
 * Get recent news about a specific company
 * 
 * This tool simplifies finding recent news about any company by:
 * 1. First searching for the company to get accurate information
 * 2. Then searching for recent news articles mentioning that company
 * 3. Automatically filtering by recency using today's date
 * 
 * Perfect for:
 * - Getting latest company updates and announcements
 * - Tracking company performance and market news
 * - Monitoring corporate developments and changes
 * - Research on specific businesses and their recent activities
 * 
 * @param perigon - The Perigon API client instance
 * @returns Tool callback function for MCP
 */
export function getCompanyNews(perigon: Perigon): ToolCallback {
  return async ({
    companyName,
    days,
    limit,
    country,
  }: z.infer<typeof companyNewsArgs>): Promise<CallToolResult> => {
    try {
      // Calculate the date range for recent news
      const today = new Date();
      const fromDate = new Date(today);
      fromDate.setDate(today.getDate() - days);
      
      const todayStr = today.toISOString().split('T')[0];

      // First, try to find the company to get more context
      let companyInfo = "";
      try {
        const companyResult = await perigon.searchCompanies({
          q: companyName,
          size: 1,
        });
        
        if (companyResult.numResults > 0) {
          const company = companyResult.results[0];
          companyInfo = `\n<company-context>
Company: ${company.name}
Industry: ${company.industry || 'N/A'}
CEO: ${company.ceo || 'N/A'}
Description: ${company.description || 'N/A'}
</company-context>\n`;
        }
      } catch (error) {
        // Continue even if company search fails
        console.warn("Company search failed, continuing with news search:", error);
      }

      // Search for recent news about the company
      const newsResult = await perigon.searchArticles({
        q: companyName,
        from: fromDate,
        to: today,
        country: [country],
        size: limit,
        sortBy: "date",
        showNumResults: true,
        showReprints: false,
      });

      if (newsResult.numResults === 0) {
        return toolResult(`No recent news found for "${companyName}" in the last ${days} days.${companyInfo}`);
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

      let output = `Recent news for "${companyName}" (last ${days} days, as of ${todayStr}):`;
      output += companyInfo;
      output += `\nFound ${newsResult.numResults} articles:\n`;
      output += "\n<articles>\n";
      output += articles.join("\n\n");
      output += "\n</articles>";

      return toolResult(output);
    } catch (error) {
      console.error("Error getting company news:", error);
      return toolResult(
        `Error: Failed to get news for company "${companyName}": ${await createErrorMessage(error)}`
      );
    }
  };
}

/**
 * Tool definition for company news
 */
export const companyNewsTool: ToolDefinition = {
  name: "get_company_news",
  description:
    "Get recent news about a specific company. Searches for the company first to get context, then finds recent news articles mentioning that company. Includes today's date for proper temporal filtering.",
  parameters: companyNewsArgs,
  createHandler: (perigon: Perigon) => getCompanyNews(perigon),
};