import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon, TableSearchResult, EntitySpike } from "../../../lib/perigon";
import { ToolCallback, ToolDefinition } from "../types";
import { statsFilterArgs } from "../schemas/stats";
import { toolResult, noResults } from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";

function parseTime(str: string) {
  if (str === "") return undefined;
  return new Date(str);
}

export const topPeopleArgs = statsFilterArgs.extend({
  currentFrom: z
    .string()
    .transform(parseTime)
    .optional()
    .describe(
      "Start of the current window for spike detection. Default: 3 days ago. ISO 8601 or yyyy-mm-dd."
    ),
  currentTo: z
    .string()
    .transform(parseTime)
    .optional()
    .describe(
      "End of the current window for spike detection. Default: now. ISO 8601 or yyyy-mm-dd."
    ),
  baselineFrom: z
    .string()
    .transform(parseTime)
    .optional()
    .describe(
      "Start of the baseline window for spike detection. Default: 30 days ago. ISO 8601 or yyyy-mm-dd."
    ),
  baselineTo: z
    .string()
    .transform(parseTime)
    .optional()
    .describe(
      "End of the baseline window for spike detection. Default: 3 days ago. ISO 8601 or yyyy-mm-dd."
    ),
  normalizeByDay: z
    .boolean()
    .optional()
    .default(true)
    .describe(
      "If true, compares daily mention rates between current and baseline windows (adjusts for window length differences). Default: true."
    ),
  size: z
    .number()
    .min(1)
    .max(100)
    .optional()
    .default(10)
    .describe("Number of top people to return (1–100). Default: 10."),
});

export function getTopPeople(perigon: Perigon): ToolCallback {
  return async (args: z.infer<typeof topPeopleArgs>): Promise<CallToolResult> => {
    try {
      const result: TableSearchResult<EntitySpike> = await perigon.getTopPeople({
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
        currentFrom: args.currentFrom,
        currentTo: args.currentTo,
        baselineFrom: args.baselineFrom,
        baselineTo: args.baselineTo,
        normalizeByDay: args.normalizeByDay,
        size: args.size,
      });

      if (!result.results || result.results.length === 0) return noResults;

      const rows = result.results.map((p, i) =>
        `<person rank="${i + 1}" name="${p.name}" current_count="${p.currentCount}" baseline_count="${p.baselineCount}" spike_score="${p.spikeScore?.toFixed(2) ?? "N/A"}" />`
      );

      let output = `Got ${result.numResults} people with highest spike scores\n`;
      output += `<top_people_results>\n`;
      output += rows.join("\n");
      output += `\n</top_people_results>`;

      return toolResult(output);
    } catch (error) {
      console.error("Error in get_top_people:", error);
      return toolResult(
        `Error: Failed to retrieve top people: ${await createErrorMessage(error)}`
      );
    }
  };
}

export const topPeopleTool: ToolDefinition = {
  name: "get_top_people",
  description:
    "Get the people whose news coverage is spiking — mentioned significantly more in a recent window than a prior baseline period. Use this when the user asks 'who is trending?', 'who suddenly got a lot of coverage?', or 'which people are in the news more than usual?' — NOT for simple most-mentioned frequency (use get_top_entities for that). Returns a ranked list with current mention count, baseline count, and a spike score (higher = bigger relative increase). The comparison window defaults to last 3 days vs. last 30 days; override with currentFrom/To and baselineFrom/To. Supports all standard article filters to scope the analysis to a specific topic, source, or date range.",
  parameters: topPeopleArgs,
  createHandler: (perigon: Perigon) => getTopPeople(perigon),
};
