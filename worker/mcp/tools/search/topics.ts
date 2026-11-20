import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../../lib/perigon";
import { ToolCallback, ToolDefinition } from "../types";
import { paginationArgs } from "../schemas/base";
import {
  toolResult,
  noResults,
  createPaginationHeader,
} from "../utils/formatting";
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
      "Exact or partial topic name, no wildcards (e.g. Markets, Climate Change).",
    ),
  category: z
    .string()
    .optional()
    .describe(
      "Parent category (e.g. Politics, Tech, Sports, Business, Finance).",
    ),
  subcategory: z
    .string()
    .optional()
    .describe(
      "Subcategory within a category.",
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
export function searchTopics(
  perigon: Perigon,
): ToolCallback<typeof topicsArgs> {
  return async ({
    page,
    size,
    name,
    category,
    subcategory,
  }: z.infer<typeof topicsArgs>): Promise<CallToolResult> => {
    try {
      const result = await perigon.searchTopics({
        page,
        size,
        name,
        category,
        subcategory,
      });

      if (result.total === 0) return noResults;

      const topics = result.data.map((topic) => {
        return `<topic id="${topic.id ?? ""}" name="${topic.name}">
Created At: ${topic.createdAt ?? "N/A"}
Updated At: ${topic.updatedAt ?? "N/A"}
Category: ${topic.labels?.category ?? "N/A"}
Sub Category: ${topic.labels?.subcategory ?? "N/A"}
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
        `Error: Failed to search topics: ${await createErrorMessage(error)}`,
      );
    }
  };
}

/**
 * Tool definition for topics search
 */
export const topicsTool = {
  name: "search_topics",
  title: "Topics",
  description:
    "Browse the topic taxonomy to find exact topic names for the topic filters of other tools. Topics are more granular than categories. Returns topic names with category and subcategory.",
  parameters: topicsArgs,
  annotations: {
    readOnlyHint: true,
    openWorldHint: false,
    destructiveHint: false,
  },
  createHandler: (perigon: Perigon) => searchTopics(perigon),
} satisfies ToolDefinition<typeof topicsArgs>;
