import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon, SpikeResult, TopicSpike } from "../../../lib/perigon";
import { ToolCallback, ToolDefinition } from "../types";
import { statsFilterArgs } from "../schemas/stats";
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
    .describe("Start of the current window. Default: 3 days ago."),
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
    .describe("End of the baseline window. Default: 3 days ago."),
  normalizeByDay: z
    .boolean()
    .optional()
    .default(true)
    .describe("Compare daily mention rates instead of raw counts. Default: true."),
  size: z
    .number()
    .min(1)
    .max(100)
    .optional()
    .default(10)
    .describe("Number of top topics to return (1-100). Default: 10."),
  minBaseline: z
    .number()
    .optional()
    .describe("Minimum baseline mentions required to be eligible for ranking."),
  minCurrent: z
    .number()
    .optional()
    .describe("Minimum current-window mentions required to be eligible for ranking."),
  smoothingAlpha: z
    .number()
    .optional()
    .describe("Smoothing factor applied to the baseline rate to reduce noise from small counts."),
});

export function getTopTopics(
  perigon: Perigon,
): ToolCallback<typeof topTopicsArgs> {
  return async (
    args: z.infer<typeof topTopicsArgs>,
  ): Promise<CallToolResult> => {
    try {
      const result: SpikeResult<TopicSpike> = await perigon.getTopTopics({
        q: args.q,
        from: args.from,
        to: args.to,
        source: args.source,
        sourceGroup: args.sourceGroup,
        category: args.category,
        topic: args.topic,
        language: args.language,
        country: args.country,
        personName: args.personName,
        companyDomain: args.companyDomain,
        companySymbol: args.companySymbol,
        journalistId: args.journalistId,
        personWikidataId: args.personWikidataId,
        companyId: args.companyId,
        taxonomy: args.taxonomy,
        excludeSource: args.excludeSource,
        excludeCategory: args.excludeCategory,
        excludeTopic: args.excludeTopic,
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
  description:
    "Get the topics whose news coverage is spiking — mentioned significantly more in a recent window than a prior baseline period. Use this alongside get_top_people and get_top_companies when the user asks 'what topics are trending?' The comparison window defaults to last 3 days vs. last 30 days; override with currentFrom/To and baselineFrom/To. Supports the same curated article filters as the other stats tools.",
  parameters: topTopicsArgs,
  createHandler: (perigon: Perigon) => getTopTopics(perigon),
} satisfies ToolDefinition<typeof topTopicsArgs>;
