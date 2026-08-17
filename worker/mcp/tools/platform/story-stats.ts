import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../../lib/perigon";
import { ToolCallback, ToolDefinition } from "../types";
import { toolResult, noResults } from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";

function parseTime(str: string) {
  if (str === "") return undefined;
  return new Date(str);
}

export const storyStatsArgs = z.object({
  metric: z
    .enum(["volume", "velocity"])
    .describe(
      "volume: story publication counts over time, bucketed by splitBy. velocity: per-cluster mention counts over time (requires clusterId).",
    ),
  clusterId: z
    .array(z.string())
    .optional()
    .describe("Cluster IDs to scope the metric to. Required for velocity (max 100)."),
  from: z.string().transform(parseTime).optional().describe("Start of the date range."),
  to: z.string().transform(parseTime).optional().describe("End of the date range."),
  splitBy: z
    .enum(["hour", "day", "week", "month", "none"])
    .optional()
    .default("month")
    .describe("Bucket size for volume. Ignored for velocity."),
  bucketSize: z
    .number()
    .int()
    .min(1)
    .optional()
    .default(1)
    .describe("Bucket size multiplier for velocity (paired with bucketTimeUnit)."),
  bucketTimeUnit: z
    .enum(["minute", "hour", "day"])
    .optional()
    .default("day")
    .describe("Bucket time unit for velocity."),
});

export function getStoryStats(
  perigon: Perigon,
): ToolCallback<typeof storyStatsArgs> {
  return async (
    args: z.infer<typeof storyStatsArgs>,
  ): Promise<CallToolResult> => {
    try {
      if (args.metric === "velocity") {
        if (!args.clusterId || args.clusterId.length === 0) {
          return toolResult(
            "Error: metric='velocity' requires at least one clusterId.",
          );
        }
        const result = await perigon.getStoryVelocity({
          clusterId: args.clusterId,
          from: args.from,
          to: args.to,
          bucketSize: args.bucketSize,
          bucketTimeUnit: args.bucketTimeUnit,
        });
        if (!result.results || result.results.length === 0) return noResults;
        const rows = result.results.map(
          (r) =>
            `<bucket cluster_id="${r.clusterId}" date="${r.date}" count="${r.count}" />`,
        );
        return toolResult(
          `<story_velocity>\n${rows.join("\n")}\n</story_velocity>`,
        );
      }

      const result = await perigon.getStoryStats({
        clusterId: args.clusterId,
        from: args.from,
        to: args.to,
        splitBy: args.splitBy,
      });
      if (!result.results || result.results.length === 0) return noResults;
      const rows = result.results.map(
        (r) => `<bucket date="${r.date}" count="${r.numResults}" />`,
      );
      return toolResult(`<story_volume>\n${rows.join("\n")}\n</story_volume>`);
    } catch (error) {
      console.error("Error in get_story_stats:", error);
      return toolResult(
        `Error: Failed to retrieve story stats: ${await createErrorMessage(error)}`,
      );
    }
  };
}

export const storyStatsTool = {
  name: "get_story_stats",
  description:
    "Get story-level (clustered headline) volume or velocity over time — the story equivalent of get_article_counts. Use metric='volume' for publication counts bucketed by time, or metric='velocity' for how fast specific clusters are accumulating mentions (requires clusterId from search_news_stories). Requires the CLUSTERS permission.",
  parameters: storyStatsArgs,
  createHandler: (perigon: Perigon) => getStoryStats(perigon),
} satisfies ToolDefinition<typeof storyStatsArgs>;
