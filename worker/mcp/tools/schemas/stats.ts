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
      'Keyword query over title, description, and content. AND/OR/NOT, "exact phrases", wildcards * ?.'
    ),
  from: z
    .string()
    .transform(parseTime)
    .optional()
    .describe("Published after this date (ISO 8601 or yyyy-mm-dd)."),
  to: z
    .string()
    .transform(parseTime)
    .optional()
    .describe("Published before this date (ISO 8601 or yyyy-mm-dd)."),
  source: z
    .array(z.string())
    .optional()
    .describe("Publisher domains (e.g. cnn.com); wildcards supported."),
  sourceGroup: z
    .array(z.string())
    .optional()
    .describe("Curated publisher bundles: top10, top25, top50, top100, top25tech, top25crypto."),
  category: z
    .array(z.string())
    .optional()
    .describe("Content categories (e.g. Politics, Tech, Business, Finance)."),
  topic: z
    .array(z.string())
    .optional()
    .describe("Topics, more granular than categories (e.g. AI, Climate Change)."),
  language: z
    .array(z.string())
    .optional()
    .describe("ISO-639 language codes (e.g. en, es)."),
  country: z
    .array(z.string())
    .optional()
    .describe("Country where the event is located, 2-letter codes (e.g. us, gb)."),
  personName: z
    .array(z.string())
    .optional()
    .describe("Mentioned people, by name."),
  companyDomain: z
    .array(z.string())
    .optional()
    .describe("Mentioned companies, by domain (e.g. apple.com)."),
  companySymbol: z
    .array(z.string())
    .optional()
    .describe("Mentioned companies, by ticker (e.g. AAPL)."),
  companyName: z
    .string()
    .optional()
    .describe("Mentioned company, by exact name."),
  journalistId: z
    .array(z.string())
    .optional()
    .describe("Author journalist IDs."),
  personWikidataId: z
    .array(z.string())
    .optional()
    .describe("Mentioned people, by Wikidata ID (preferred over personName)."),
  companyId: z
    .array(z.string())
    .optional()
    .describe("Mentioned companies, by company ID."),
  taxonomy: z
    .array(z.string())
    .optional()
    .describe("Google Content Category full path (e.g. /Finance/Banking/Other)."),
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
  .describe("Bucket interval; NONE = one aggregate for the whole range.");

/** Convert the user-facing splitBy enum to the lowercase value the API expects. */
export function normalizeSplitBy(
  splitBy: "HOUR" | "DAY" | "WEEK" | "MONTH" | "NONE" | undefined
): StatsSplitBy | undefined {
  return splitBy ? (splitBy.toLowerCase() as StatsSplitBy) : undefined;
}
