import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../../lib/perigon";
import { CONSTANTS, ToolCallback, ToolDefinition } from "../types";
import {
  toolResult,
  formatLabelList,
  withDefaultCountryNote,
  SINGLE_COUNTRY_HINT,
  describeDefaultCountry,
} from "../utils/formatting";
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
    .optional()
    .describe(
      "Country code to filter news sources. Defaults to us; the response starts with a note when the default is applied.",
    ),
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
export function getPersonNews(
  perigon: Perigon,
): ToolCallback<typeof personNewsArgs> {
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

      const todayStr = today.toISOString().split("T")[0];

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
Name: ${person.name ?? "N/A"}
Occupation: ${formatLabelList(person.occupation)}
Position: ${formatLabelList(person.position)}
Description: ${person.description ?? "N/A"}
</person-context>\n`;
        }
      } catch (error) {
        // Continue even if person search fails
        console.warn(
          "Person search failed, continuing with news search:",
          error,
        );
      }

      // Search for recent news about the person
      const newsResult = await perigon.searchArticles({
        q: personName,
        from: fromDate,
        to: today,
        country: country
          ? [country.toLowerCase()]
          : [...CONSTANTS.DEFAULT_COUNTRIES],
        size: limit,
        sortBy: "date",
        showNumResults: true,
        showReprints: false,
      });

      if (newsResult.numResults === 0) {
        return toolResult(
          withDefaultCountryNote(
            `No recent news found for "${personName}" in the last ${days} days.${personInfo}`,
            !country,
            SINGLE_COUNTRY_HINT,
          ),
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

      let output = `Recent news for "${personName}" (last ${days} days, as of ${todayStr}):`;
      output += personInfo;
      output += `\nFound ${newsResult.numResults} articles:\n`;
      output += "\n<articles>\n";
      output += articles.join("\n\n");
      output += "\n</articles>";

      return toolResult(withDefaultCountryNote(output, !country, SINGLE_COUNTRY_HINT));
    } catch (error) {
      console.error("Error getting person news:", error);
      return toolResult(
        `Error: Failed to get news for person "${personName}": ${await createErrorMessage(error)}`,
      );
    }
  };
}

/**
 * Tool definition for person news
 */
export const personNewsTool = {
  name: "get_person_news",
  title: "Person news",
  description:
    "Quick shortcut to get recent news about a specific person by name. Automatically looks up the person's profile for context, then finds recent articles mentioning them within a configurable time window. Use this for simple 'what's the latest news about [person]?' queries. For advanced filtering, use search_news_articles with personName instead." +
    " " +
    describeDefaultCountry(
      ["country"],
      "pass country to choose another, or use search_news_articles with countries: [] for all countries",
    ),
  parameters: personNewsArgs,
  annotations: {
    readOnlyHint: true,
    openWorldHint: true,
    destructiveHint: false,
  },
  createHandler: (perigon: Perigon) => getPersonNews(perigon),
} satisfies ToolDefinition<typeof personNewsArgs>;
