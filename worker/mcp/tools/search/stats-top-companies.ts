import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon, SpikeResult, CompanySpike } from "../../../lib/perigon";
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

export const topCompaniesArgs = statsFilterArgs.extend({
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
    .describe("Number of companies to return."),
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

export function getTopCompanies(
  perigon: Perigon,
): ToolCallback<typeof topCompaniesArgs> {
  return async (
    args: z.infer<typeof topCompaniesArgs>,
  ): Promise<CallToolResult> => {
    try {
      const result: SpikeResult<CompanySpike> = await perigon.getTopCompanies({
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

      const rows = result.data.map((c, i) => {
        const name = escapeAttr(c.company?.name ?? c.wikidataId);
        const domains = escapeAttr((c.company?.domains ?? []).join(", "));
        const tickers = escapeAttr(
          (c.company?.symbols ?? [])
            .map((s) => s.symbol)
            .filter(Boolean)
            .join(", "),
        );
        const industry = escapeAttr(c.company?.industry ?? "");
        const sector = escapeAttr(c.company?.sector ?? "");
        return (
          `<company rank="${i + 1}" id="${c.wikidataId}" name="${name}" ` +
          `domains="${domains}" tickers="${tickers}" industry="${industry}" sector="${sector}" ` +
          `current_mentions="${c.currentMentions}" baseline_mentions="${c.baselineMentions}" ` +
          `current_rate_per_day="${c.currentRatePerDay.toFixed(2)}" baseline_rate_per_day="${c.baselineRatePerDay.toFixed(2)}" ` +
          `spike_score="${c.spikeScore.toFixed(2)}" />`
        );
      });

      let output = `Got ${result.total} companies with highest spike scores\n`;
      output += `<top_companies_results>\n`;
      output += rows.join("\n");
      output += `\n</top_companies_results>`;

      return toolResult(output);
    } catch (error) {
      console.error("Error in get_top_companies:", error);
      return toolResult(
        `Error: Failed to retrieve top companies: ${await createErrorMessage(error)}`,
      );
    }
  };
}

export const topCompaniesTool = {
  name: "get_top_companies",
  title: "Top companies",
  description:
    "Companies whose coverage is spiking: more mentions in a current window than a baseline window — for 'which companies are trending / surging / getting more coverage than usual?'. Not for most-mentioned (get_top_entities has no baseline). Returns mention counts, per-day rates, and spike_score (smoothed current ÷ baseline rate; below ~1.1 is not trending). Set currentFrom/To to the user's period and the baseline to an equal-length window just before it. minBaseline=5 for established names on the rise; minBaseline=0 plus minCurrent ~3–10 for brand-new names. Never set from/to (it clips the baseline). Playbook: perigon://reference/chaining.",
  parameters: topCompaniesArgs,
  annotations: {
    readOnlyHint: true,
    openWorldHint: true,
    destructiveHint: false,
  },
  createHandler: (perigon: Perigon) => getTopCompanies(perigon),
} satisfies ToolDefinition<typeof topCompaniesArgs>;
