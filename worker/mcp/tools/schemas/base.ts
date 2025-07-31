import { z } from "zod";
import { CONSTANTS } from "../types";

/**
 * Parse time string to Date object
 */
function parseTime(str: string) {
  if (str === "") return undefined;
  return new Date(str);
}

/**
 * Location-based filtering arguments
 */
export const locationArgs = z.object({
  countries: z
    .array(z.string())
    .optional()
    .transform((countries) => {
      if (!countries) return undefined;
      return countries.map((country) => country.toLowerCase());
    })
    .default(() => [...CONSTANTS.DEFAULT_COUNTRIES])
    .describe(
      `This field filters the returned results based on the country associated with the event or news.
      Only results tagged with one of these countries will be included.
      The countries should each be listed by their 2 letter country code, ex "us", "ca", "mx".`
    ),
  states: z
    .array(z.string())
    .optional()
    .transform((states) => {
      if (!states) return undefined;
      return states.map((state) => state.toUpperCase());
    })
    .describe(
      "Filter results where a specified state plays a central role in the content, beyond mere mentions. States should be listed by their 2 character ISO code, Example: TX"
    ),
  cities: z
    .array(z.string())
    .optional()
    .describe(
      "Filter results where a specified city plays a central role in the content, beyond mere mentions. Example: Austin."
    ),
});

/**
 * Pagination arguments
 */
export const paginationArgs = z.object({
  page: z
    .number()
    .min(0)
    .default(0)
    .describe(
      "The specific page of results to retrieve in the paginated response. Starts at 0. (pagination uses 0 based indexing)"
    ),
  size: z
    .number()
    .min(1)
    .max(1000)
    .default(CONSTANTS.DEFAULT_PAGE_SIZE)
    .describe(
      "The number of results to return per page in the paginated response."
    ),
});

/**
 * Default time-based filtering arguments
 */
export const defaultArgs = z.object({
  from: z
    .string()
    .transform(parseTime)
    .optional()
    .describe(
      "Filter for articles published before this date. Accepts ISO 8601 format (e.g., 2022-02-01T23:59:59) or yyyy-mm-dd format."
    ),
  to: z
    .string()
    .transform(parseTime)
    .optional()
    .describe(
      "Filter for articles published before this date, avoid setting this field unless you are looking in the distant past and want to set an upper bound for time. Accepts ISO 8601 format (e.g., 2022-02-01T00:00:00) or yyyy-mm-dd format."
    ),
});

/**
 * Categories filter
 */
export const categories = z
  .array(z.string())
  .optional()
  .describe(
    "Filter by the content categories (e.g., Politics, Tech, Sports, Business, Finance)"
  );

/**
 * Topics filter
 */
export const topics = z
  .array(z.string())
  .optional()
  .describe(
    "Filter by specific topics such as Markets, Crime, Cryptocurrency, or College Sports. Topics are more granular than categories"
  );

/**
 * Create base search arguments by combining common schemas
 */
export const createBaseSearchArgs = () =>
  z.object({
    ...locationArgs.shape,
    ...paginationArgs.shape,
    ...defaultArgs.shape,
  });