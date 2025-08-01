import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../../lib/perigon";
import { ToolCallback, ToolDefinition } from "../types";
import { paginationArgs } from "../schemas/base";
import { toolResult, noResults, createPaginationHeader } from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";

/**
 * Schema for topics search arguments
 */
export const topicsArgs = z.object({
  ...paginationArgs.shape,
  name: z
    .string()
    .optional()
    .describe(
      "Search for topics by exact name or partial text match. Does not support wildcards." +
        " Examples include Markets, Cryptocurrency, Climate Change, etc."
    ),
  category: z
    .string()
    .optional()
    .describe(
      "Filter topics by broad article categories such as Politics, Tech, Sports, Business," +
        " Finance, Entertainment, etc."
    ),
});

/**
 * Search for topics currently supported by the Perigon API
 * 
 * This tool helps you discover and explore the topics that are available for filtering
 * in other search tools. Topics are more granular than categories and provide specific
 * subject matter classification for news content.
 * 
 * Use this tool to:
 * - Discover available topics for use in other search filters
 * - Explore topic hierarchies and categorization
 * - Find specific topics by name or category
 * - Understand the topic taxonomy used by Perigon
 * 
 * Search capabilities:
 * - Name-based topic search (exact or partial matches)
 * - Category-based filtering to find topics within broad categories
 * - Browse all available topics with pagination
 * 
 * Returns topic information including:
 * - Topic name and identifiers
 * - Category and subcategory classification
 * - Creation and update timestamps
 * - Topic metadata and labels
 * 
 * @param perigon - The Perigon API client instance
 * @returns Tool callback function for MCP
 */
export function searchTopics(perigon: Perigon): ToolCallback {
  return async ({
    page,
    size,
    name,
    category,
  }: z.infer<typeof topicsArgs>): Promise<CallToolResult> => {
    try {
      const result = await perigon.searchTopics({
        page,
        size,
        name,
        category,
      });

      if (result.total === 0) return noResults;

      const topics = result.data.map((topic) => {
        return `<topic name="${topic.name}">
Created At: ${topic.createdAt}
Category: ${topic.labels?.category}
Sub Category: ${topic.labels?.subcategory}
</topic>`;
      });

      let output = createPaginationHeader(result.total, page, size, "topics");
      output += "\n<topics>\n";
      output += topics.join("\n\n");
      output += "\n</topics>";

      return toolResult(output);
    } catch (error) {
      console.error("Error searching topics:", error);
      return toolResult(
        `Error: Failed to search topics: ${await createErrorMessage(error)}`
      );
    }
  };
}

/**
 * Tool definition for topics search
 */
export const topicsTool: ToolDefinition = {
  name: "search_topics",
  description: "Search topics currently supported via Perigon API",
  parameters: topicsArgs,
  createHandler: (perigon: Perigon) => searchTopics(perigon),
};