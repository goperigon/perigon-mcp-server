import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../../lib/perigon";
import { ToolCallback, ToolDefinition, CONSTANTS } from "../types";
import {
  toolResult,
  noResults,
  createPaginationHeader,
} from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";

function parseTime(str: string) {
  if (str === "") return undefined;
  return new Date(str);
}

export const storyHistoryArgs = z.object({
  clusterIds: z
    .array(z.string())
    .optional()
    .describe(
      "Filter to specific stories by their cluster IDs. Only history entries for the specified clusters will be returned."
    ),
  from: z
    .string()
    .transform(parseTime)
    .optional()
    .describe(
      "Filter stories created after this date. Accepts ISO 8601 format (e.g., 2023-03-01T00:00:00) or yyyy-mm-dd format."
    ),
  to: z
    .string()
    .transform(parseTime)
    .optional()
    .describe(
      "Filter stories created before this date. Accepts ISO 8601 format (e.g., 2023-03-01T23:59:59) or yyyy-mm-dd format."
    ),
  sortBy: z
    .enum(["createdAt", "triggeredAt"])
    .default("createdAt")
    .optional()
    .describe(
      "Sort stories by creation date (createdAt) or story refresh trigger date (triggeredAt)."
    ),
  page: z
    .number()
    .min(0)
    .default(0)
    .describe(
      "Zero-based page number for pagination. From 0 to 10000."
    ),
  size: z
    .number()
    .min(1)
    .max(100)
    .default(CONSTANTS.DEFAULT_PAGE_SIZE)
    .describe("Number of story history results per page, from 1 to 100."),
  changelogExists: z
    .boolean()
    .optional()
    .describe(
      "When set, filter to only include clusters that have a changelog (true) or don't have one (false)."
    ),
});

/**
 * Search story history to track how news stories evolve over time.
 *
 * Returns timestamped snapshots of story clusters including summaries,
 * key points, changelogs, and metadata showing how stories developed.
 */
export function searchStoryHistory(perigon: Perigon): ToolCallback {
  return async ({
    clusterIds,
    from,
    to,
    sortBy,
    page,
    size,
    changelogExists,
  }: z.infer<typeof storyHistoryArgs>): Promise<CallToolResult> => {
    try {
      const result = await perigon.searchStoriesHistory({
        clusterId: clusterIds,
        from,
        to,
        sortBy,
        page,
        size,
        changelogExists,
      });

      if (result.numResults === 0) return noResults;

      const entries = result.results.map((entry) => {
        let content = `<story_history cluster_id="${entry.clusterId}">`;
        if (entry.name) content += `\nTitle: ${entry.name}`;
        content += `\nCreated At: ${entry.createdAt} (utc)`;
        content += `\nTriggered At: ${entry.triggeredAt} (utc)`;
        content += `\nSummary: ${entry.summary}`;
        content += `\nShort Summary: ${entry.shortSummary}`;

        if (entry.changelog) {
          content += `\nChangelog: ${entry.changelog}`;
        }

        if (entry.keyPoints && entry.keyPoints.length > 0) {
          content += `\nKey Points:`;
          for (const kp of entry.keyPoints) {
            content += `\n  - ${kp.point}`;
          }
        }

        content += `\n</story_history>`;
        return content;
      });

      let output = createPaginationHeader(
        result.numResults,
        page,
        size,
        "story history entries"
      );

      output += "\n<story_history_results>\n";
      output += entries.join("\n\n");
      output += "\n</story_history_results>";

      return toolResult(output);
    } catch (error) {
      console.error("Error searching story history:", error);
      return toolResult(
        `Error: Failed to search story history: ${await createErrorMessage(error)}`
      );
    }
  };
}

export const storyHistoryTool: ToolDefinition = {
  name: "search_story_history",
  description:
    "Search story history to track how news stories evolve over time. Returns timestamped snapshots of story clusters including summaries, short summaries, key points, and changelogs. Use this to understand how a story has developed, what changed between updates, and to review the timeline of a news event. Filter by cluster ID, date range, sort order, or changelog presence. Only use this tool instead of search_news_stories tool when you need to understand the history of a story.",
  parameters: storyHistoryArgs,
  createHandler: (perigon: Perigon) => searchStoryHistory(perigon),
};
