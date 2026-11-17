import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon, SpikeResult, PersonSpike } from "../../../lib/perigon";
import { ToolCallback, ToolDefinition } from "../types";
import { statsFilterArgs, statsFilters } from "../schemas/stats";
import { toolResult, noResults } from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";

function parseTime(str: string) {
  if (str === "") return undefined;
  return new Date(str);
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

export const topPeopleArgs = statsFilterArgs.extend({
  currentFrom: z
    .string()
    .transform(parseTime)
    .optional()
    .describe(
      "Start of the current window (match the user's period). Default: 3 days ago.",
    ),
  currentTo: z
    .string()
    .transform(parseTime)
    .optional()
    .describe(
      "End of the current window. Default: now.",
    ),
  baselineFrom: z
    .string()
    .transform(parseTime)
    .optional()
    .describe(
      "Start of the baseline window. Default: 30 days ago.",
    ),
  baselineTo: z
    .string()
    .transform(parseTime)
    .optional()
    .describe(
      "End of the baseline window. Default: currentFrom.",
    ),
  normalizeByDay: z
    .boolean()
    .optional()
    .default(true)
    .describe(
      "Compare per-day rates so unequal windows are comparable.",
    ),
  size: z
    .number()
    .min(1)
    .max(100)
    .optional()
    .default(10)
    .describe("Number of people to return."),
  minBaseline: z
    .number()
    .optional()
    .describe(
      "Minimum baseline mentions to be ranked: 5 = established names only, 0 = include brand-new names. Default: 0.",
    ),
  minCurrent: z
    .number()
    .optional()
    .describe(
      "Minimum current-window mentions to be ranked; ~3–10 drops noise when minBaseline=0. Default: 0.",
    ),
  smoothingAlpha: z
    .number()
    .optional()
    .describe("Added to both counts before comparing rates, damping small-count noise. Default: 1."),
});

export function getTopPeople(
  perigon: Perigon,
): ToolCallback<typeof topPeopleArgs> {
  return async (
    args: z.infer<typeof topPeopleArgs>,
  ): Promise<CallToolResult> => {
    try {
      const result: SpikeResult<PersonSpike> = await perigon.getTopPeople({
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

      const rows = result.data.map((p, i) => {
        const name = escapeAttr(p.person?.name ?? p.wikidataId);
        const description = escapeAttr(p.person?.description ?? "");
        const occupation = escapeAttr(
          (p.person?.occupation ?? []).map((o) => o.label).join(", "),
        );
        return (
          `<person rank="${i + 1}" wikidata_id="${p.wikidataId}" name="${name}" ` +
          `current_mentions="${p.currentMentions}" baseline_mentions="${p.baselineMentions}" ` +
          `current_rate_per_day="${p.currentRatePerDay.toFixed(2)}" baseline_rate_per_day="${p.baselineRatePerDay.toFixed(2)}" ` +
          `spike_score="${p.spikeScore.toFixed(2)}" occupation="${occupation}" description="${description}" />`
        );
      });

      let output = `Got ${result.total} people with highest spike scores\n`;
      output += `<top_people_results>\n`;
      output += rows.join("\n");
      output += `\n</top_people_results>`;

      return toolResult(output);
    } catch (error) {
      console.error("Error in get_top_people:", error);
      return toolResult(
        `Error: Failed to retrieve top people: ${await createErrorMessage(error)}`,
      );
    }
  };
}

export const topPeopleTool = {
  name: "get_top_people",
  title: "Top people",
  description:
    "People whose coverage is spiking: more mentions in a current window than a baseline window — for 'who is trending / surging / suddenly in the news?'. Not for most-mentioned (get_top_entities has no baseline). Returns mention counts, per-day rates, and spike_score (smoothed current ÷ baseline rate; below ~1.1 is not trending). Set currentFrom/To to the user's period and the baseline to an equal-length window just before it. minBaseline=5 for established names on the rise; minBaseline=0 plus minCurrent ~3–10 for brand-new names. Never set from/to (it clips the baseline). Playbook: perigon://reference/chaining.",
  parameters: topPeopleArgs,
  annotations: {
    readOnlyHint: true,
    openWorldHint: true,
    destructiveHint: false,
  },
  createHandler: (perigon: Perigon) => getTopPeople(perigon),
} satisfies ToolDefinition<typeof topPeopleArgs>;
