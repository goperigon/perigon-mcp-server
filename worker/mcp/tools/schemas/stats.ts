import { z } from "zod";
import type { StatsArticleFilters, StatsSplitBy } from "../../../lib/perigon";

function parseTime(str: string) {
  if (str === "") return undefined;
  return new Date(str);
}

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
    .transform(parseTime)
    .optional()
    .describe(
      "Filter articles published after this date. ISO 8601 or yyyy-mm-dd format."
    ),
  to: z
    .string()
    .transform(parseTime)
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
  companyName: z
    .string()
    .optional()
    .describe("Filter articles mentioning a company by exact name."),
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
  label: z
    .array(z.string())
    .optional()
    .describe("Editorial labels: Opinion, Paid-news, Non-news, Fact Check, Press Release."),
  excludeLabel: z.array(z.string()).optional().describe("Exclude editorial labels."),
  showReprints: z
    .boolean()
    .optional()
    .default(false)
    .describe("Count syndicated reprints. Default false, matching search_news_articles."),
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

/** Picks the shared article filters out of a stats tool's arguments. */
export function statsFilters(args: StatsFilterArgs): StatsArticleFilters {
  return {
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
    companyName: args.companyName,
    journalistId: args.journalistId,
    personWikidataId: args.personWikidataId,
    companyId: args.companyId,
    taxonomy: args.taxonomy,
    label: args.label,
    excludeLabel: args.excludeLabel,
    showReprints: args.showReprints,
    excludeSource: args.excludeSource,
    excludeCategory: args.excludeCategory,
    excludeTopic: args.excludeTopic,
  };
}

export const splitByEnum = z
  .enum(["HOUR", "DAY", "WEEK", "MONTH", "NONE"])
  .default("DAY")
  .describe(
    "Time interval for bucketing results. HOUR = hourly, DAY = daily, WEEK = weekly, MONTH = monthly, NONE = single aggregate value across the whole date range."
  );

/** Convert the user-facing splitBy enum to the lowercase value the API expects. */
export function normalizeSplitBy(
  splitBy: "HOUR" | "DAY" | "WEEK" | "MONTH" | "NONE" | undefined
): StatsSplitBy | undefined {
  return splitBy ? (splitBy.toLowerCase() as StatsSplitBy) : undefined;
}
