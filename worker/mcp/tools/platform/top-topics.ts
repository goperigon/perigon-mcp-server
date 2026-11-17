import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon, SpikeResult, TopicSpike } from "../../../lib/perigon";
import { ToolCallback, ToolDefinition } from "../types";
import { statsFilterArgs, statsFilters } from "../schemas/stats";
import { toolResult, noResults } from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";

function parseTime(str: string) {
  if (str === "") return undefined;
  return new Date(str);
}

export const topTopicsArgs = statsFilterArgs.extend({
  currentFrom: z
    .string()
    .transform(parseTime)
    .optional()
    .describe("Start of the current window (match the user's period). Default: 3 days ago."),
  currentTo: z
    .string()
    .transform(parseTime)
    .optional()
    .describe("End of the current window. Default: now."),
  baselineFrom: z
    .string()
    .transform(parseTime)
    .optional()
    .describe("Start of the baseline window. Default: 30 days ago."),
  baselineTo: z
    .string()
    .transform(parseTime)
    .optional()
    .describe("End of the baseline window. Default: currentFrom."),
  normalizeByDay: z
    .boolean()
    .optional()
    .default(true)
    .describe("Compare per-day rates so unequal windows are comparable."),
  size: z
    .number()
    .min(1)
    .max(100)
    .optional()
    .default(10)
    .describe("Number of topics to return."),
  minBaseline: z
    .number()
    .optional()
    .describe("Minimum baseline mentions to be ranked: 5 = established topics only, 0 = include new topics. Default: 0."),
  minCurrent: z
    .number()
    .optional()
    .describe("Minimum current-window mentions to be ranked; ~3–10 drops noise when minBaseline=0. Default: 0."),
  smoothingAlpha: z
    .number()
    .optional()
    .describe("Added to both counts before comparing rates, damping small-count noise. Default: 1."),
});

export function getTopTopics(
  perigon: Perigon,
): ToolCallback<typeof topTopicsArgs> {
  return async (
    args: z.infer<typeof topTopicsArgs>,
  ): Promise<CallToolResult> => {
    try {
      const result: SpikeResult<TopicSpike> = await perigon.getTopTopics({
        ...statsFilters(args),
        currentFrom: args.currentFrom,
        currentTo: args.currentTo,
        baselineFrom: args.baselineFrom,
        baselineTo: args.baselineTo,
        normalizeByDay: args.normalizeByDay,
        size: args.size,
        minBaseline: args.minBaseline,
        minCurrent: args.minCurrent,
        smoothingAlpha: args.smoothingAlpha,
      });

      if (!result.data || result.data.length === 0) return noResults;

      const rows = result.data.map(
        (t, i) =>
          `<topic rank="${i + 1}" wikidata_id="${t.wikidataId}" ` +
          `current_mentions="${t.currentMentions}" baseline_mentions="${t.baselineMentions}" ` +
          `current_rate_per_day="${t.currentRatePerDay.toFixed(2)}" baseline_rate_per_day="${t.baselineRatePerDay.toFixed(2)}" ` +
          `spike_score="${t.spikeScore.toFixed(2)}" />`,
      );

      let output = `Got ${result.total} topics with highest spike scores\n`;
      output += `<top_topics_results>\n`;
      output += rows.join("\n");
      output += `\n</top_topics_results>`;

      return toolResult(output);
    } catch (error) {
      console.error("Error in get_top_topics:", error);
      return toolResult(
        `Error: Failed to retrieve top topics: ${await createErrorMessage(error)}`,
      );
    }
  };
}

export const topTopicsTool = {
  name: "get_top_topics",
  title: "Top topics",
  description:
    "Topics whose coverage is spiking versus a baseline window — for 'what topics are trending?' (for most-covered topics, use get_top_entities). spike_score below ~1.1 is not trending. Set windows and thresholds as for get_top_people. Never set from/to (it clips the baseline).",
  parameters: topTopicsArgs,
  annotations: {
    readOnlyHint: true,
    openWorldHint: true,
    destructiveHint: false,
  },
  createHandler: (perigon: Perigon) => getTopTopics(perigon),
} satisfies ToolDefinition<typeof topTopicsArgs>;
