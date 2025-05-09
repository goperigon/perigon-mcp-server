import { AllEndpointSortBy, SortBy } from "@goperigon/perigon-ts";
import { z } from "zod";

export const q = z
  .string()
  .optional()
  .describe(
    `Primary search query for filtering articles based on their title, description,
and content. Supports Boolean operators (AND, OR, NOT), exact phrases with quotes,
and wildcards (* and ?) for flexible searching. If searching for news from a particular
country or timeframe, use the "country" and/or "from" parameters, and when necessary the "to"
as well.`,
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
  .describe(
    `A list of counties to include (or specify) in the search results. This field
filters the returned articles based on the county associated with the event or news.
Only articles tagged with one of these counties will be included.

If you are searching for news regarding a particular country, you should pass the country code
to this field.`,
  );

export const sortArticlesBy = z
  .enum([AllEndpointSortBy.Date, AllEndpointSortBy.ReverseDate])
  .optional();

export const sortStoriesBy = z
  .enum([SortBy.Count, SortBy.TotalCount])
  .optional();
