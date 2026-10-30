import { z } from "zod";
import { parseDateParam } from "./base";

/**
 * Shared article-filter arguments accepted by all /v1/stats/* endpoints.
 * These mirror the most useful subset of AllEndpointParams for LLM use.
 */
export const statsFilterArgs = z.object({
  q: z
    .string()
    .optional()
    .describe(
      "Keyword search across article titles, descriptions, and content. Supports Boolean operators (AND, OR, NOT), exact phrases with quotes, and wildcards (* and ?)."
    ),
  from: z
    .string()
    .transform(parseDateParam)
    .optional()
    .describe(
      "Filter articles published after this date. ISO 8601 or yyyy-mm-dd format."
    ),
  to: z
    .string()
    .transform(parseDateParam)
    .optional()
    .describe(
      "Filter articles published before this date. ISO 8601 or yyyy-mm-dd format."
    ),
  source: z
    .array(z.string())
    .optional()
    .describe(
      "Filter by publisher domains (e.g., cnn.com, nytimes.com). Wildcards supported."
    ),
  sourceGroup: z
    .array(z.string())
    .optional()
    .describe(
      "Filter using curated publisher bundles: top10, top25, top50, top100, top25tech, top25crypto."
    ),
  category: z
    .array(z.string())
    .optional()
    .describe(
      "Filter by content categories (e.g., Politics, Tech, Business, Finance). Multiple values use OR logic."
    ),
  topic: z
    .array(z.string())
    .optional()
    .describe(
      "Filter by specific topics (e.g., AI, Cryptocurrency, Climate Change). More granular than categories."
    ),
  language: z
    .array(z.string())
    .optional()
    .describe("Filter by language using ISO-639 two-letter codes (e.g., en, es, fr)."),
  country: z
    .array(z.string())
    .optional()
    .describe(
      "Filter by country where the news event is located, using two-letter codes (e.g., us, gb)."
    ),
  personName: z
    .array(z.string())
    .optional()
    .describe("Filter articles mentioning specific people by name."),
  companyDomain: z
    .array(z.string())
    .optional()
    .describe("Filter articles mentioning companies by domain (e.g., apple.com)."),
  companySymbol: z
    .array(z.string())
    .optional()
    .describe("Filter articles mentioning companies by stock ticker symbol (e.g., AAPL)."),
  journalistId: z
    .array(z.string())
    .optional()
    .describe("Filter articles written by specific journalist IDs."),
  personWikidataId: z
    .array(z.string())
    .optional()
    .describe("Filter articles mentioning a person by Wikidata ID (unambiguous vs. personName)."),
  companyId: z
    .array(z.string())
    .optional()
    .describe("Filter articles mentioning specific company IDs."),
  taxonomy: z
    .array(z.string())
    .optional()
    .describe("Filter by Google Content Category, full path (e.g. /Finance/Banking/Other)."),
  excludeSource: z
    .array(z.string())
    .optional()
    .describe("Exclude publisher domains (wildcards supported)."),
  excludeCategory: z
    .array(z.string())
    .optional()
    .describe("Exclude content categories."),
  excludeTopic: z.array(z.string()).optional().describe("Exclude topics."),
});

export type StatsFilterArgs = z.infer<typeof statsFilterArgs>;

export const splitByEnum = z
  .enum(["HOUR", "DAY", "WEEK", "MONTH", "NONE"])
  .default("DAY")
  .describe(
    "Time interval for bucketing results. HOUR = hourly, DAY = daily, WEEK = weekly, MONTH = monthly, NONE = single aggregate value across the whole date range."
  );

/** Convert the user-facing splitBy enum to the lowercase value the API expects, or undefined to omit (NONE). */
export function normalizeSplitBy(
  splitBy: "HOUR" | "DAY" | "WEEK" | "MONTH" | "NONE" | undefined
): "hour" | "day" | "week" | "month" | undefined {
  if (!splitBy || splitBy === "NONE") return undefined;
  return splitBy.toLowerCase() as "hour" | "day" | "week" | "month";
}
