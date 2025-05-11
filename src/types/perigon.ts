import {
  AllEndpointSortBy,
  ArticleSearchFilter,
  SortBy,
} from "@goperigon/perigon-ts";
import { z } from "zod";

export const defaultNewsFilter = {
  language: ["en"],
  excludeLabel: [
    "Non-news",
    "Opinion",
    "Paid News",
    "Roundup",
    "Low Content",
    "Synthetic",
  ],
};

export const q = z
  .string()
  .optional()
  .describe(
    `Primary search query parameter for filtering articles by specific topics, keywords, or phrases.

    WHEN TO USE:
    - Only include this parameter when searching for specific content (e.g., topics, entities, events)
    - Omit this parameter entirely when requesting general news, top headlines, or random articles

    FEATURES:
    - Searches across article title, description, and content
    - Supports Boolean operators: "Ukraine AND diplomacy", "climate OR environment", "politics NOT local"
    - Supports exact phrase matching with quotes: "artificial intelligence"
    - Supports wildcards: "econom*" (matches economy, economics, economical)

    EXAMPLES:
    - Specific topic: q=coronavirus
    - News about a country: q="South Korea" (use quotes for multi-word entities)
    - Topic combinations: q=technology AND healthcare

    NOTE: For temporal filtering, use "from" and "to" parameters instead of including date terms in this query.`,
  );

export function sevenDaysAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d;
}

function parseTime(str: string) {
  if (str === "") return undefined;
  return new Date(str);
}

export const from = z
  .string()
  .transform(parseTime)
  .optional()
  .describe(
    "Filter for articles published before this date. Accepts ISO 8601 format (e.g., 2022-02-01T23:59:59) or yyyy-mm-dd format.",
  );

export const to = z
  .string()
  .transform(parseTime)
  .optional()
  .describe(
    "Filter for articles added to Perigon's system after this date. Accepts ISO 8601 format (e.g., 2022-02-01T00:00:00) or yyyy-mm-dd format.",
  );

export const country = z
  .array(z.string())
  .optional()
  .nullable()
  .describe(
    `A list of counties to include (or specify) in the search results. This field
filters the returned articles based on the county associated with the event or news.
Only articles tagged with one of these counties will be included.`,
  );

export const sortArticlesBy = z
  .enum([AllEndpointSortBy.Date, AllEndpointSortBy.ReverseDate])
  .optional();

export const sortStoriesBy = z
  .enum([SortBy.Count, SortBy.TotalCount])
  .describe(
    `Use "count" when you want to sort by number
    of unique articles per story (a cluster of articles).
    Use "totalCount" when you want to sort by the total number
    of articles per story.`,
  )
  .optional();

export const numStories = z
  .number()
  .optional()
  .describe(`The number of headlines to get`);

export const category = z
  .array(z.string())
  .optional()
  .describe(
    `Filter stories by Google Content Categories. Must pass the full hierarchical path of the category. Example: taxonomy&#x3D;/Finance/Banking/Other,/Finance/Investing/Funds. Stories are categorized based on their constituent articles. Multiple values create an OR filter.`,
  );
