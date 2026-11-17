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
      "Story (cluster) IDs.",
    ),
  from: z
    .string()
    .transform(parseTime)
    .optional()
    .describe(
      "Created after this date (ISO 8601 or yyyy-mm-dd).",
    ),
  to: z
    .string()
    .transform(parseTime)
    .optional()
    .describe(
      "Created before this date.",
    ),
  sortBy: z
    .enum(["createdAt", "triggeredAt"])
    .default("createdAt")
    .optional()
    .describe(
      "triggeredAt = story refresh time.",
    ),
  page: z
    .number()
    .min(0)
    .default(0)
    .describe("Page number, 0-based (max 10000)."),
  size: z
    .number()
    .min(1)
    .max(100)
    .default(CONSTANTS.DEFAULT_PAGE_SIZE)
    .describe("Results per page."),
  changelogExists: z
    .boolean()
    .optional()
    .describe(
      "true = only clusters with a changelog; false = only without.",
    ),
});

/**
 * Search story history to track how news stories evolve over time.
 *
 * Returns timestamped snapshots of story clusters including summaries,
 * key points, changelogs, and metadata showing how stories developed.
 */
export function searchStoryHistory(
  perigon: Perigon,
): ToolCallback<typeof storyHistoryArgs> {
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
        "story history entries",
      );

      output += "\n<story_history_results>\n";
      output += entries.join("\n\n");
      output += "\n</story_history_results>";

      return toolResult(output);
    } catch (error) {
      console.error("Error searching story history:", error);
      return toolResult(
        `Error: Failed to search story history: ${await createErrorMessage(error)}`,
      );
    }
  };
}

export const storyHistoryTool = {
  name: "search_story_history",
  title: "Story History",
  description:
    "Timestamped snapshots of a story (summaries, key points, changelogs) showing how it developed and what changed between updates. Use instead of search_news_stories only when you need a story's history.",
  parameters: storyHistoryArgs,
  annotations: {
    readOnlyHint: true,
    openWorldHint: true,
    destructiveHint: false,
  },
  createHandler: (perigon: Perigon) => searchStoryHistory(perigon),
} satisfies ToolDefinition<typeof storyHistoryArgs>;
