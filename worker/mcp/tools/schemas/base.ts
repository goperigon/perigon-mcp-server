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
    .describe(
      "Filter by country, 2-letter lowercase code (e.g. us, ca, mx). Defaults to us when no other geographic filter is given, and the response then starts with a note saying so; pass [] for all countries.",
    ),
  states: z
    .array(z.string())
    .optional()
    .transform((states) => {
      if (!states) return undefined;
      return states.map((state) => state.toUpperCase());
    })
    .describe(
      "Filter by US state where it plays a central role, 2-letter code (e.g. TX).",
    ),
  cities: z
    .array(z.string())
    .optional()
    .describe(
      "Filter by city where it plays a central role, e.g. Austin.",
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
/**
 * Resolve the country filter to send. The default country applies only when
 * the caller gave no geographic filter at all; an explicit [] means all countries.
 */
export function resolveCountries(
  countries: string[] | undefined,
  ...otherLocationFilters: unknown[]
): { country: string[] | undefined; defaultCountryApplied: boolean } {
  if (countries !== undefined) {
    return {
      country: countries.length > 0 ? countries : undefined,
      defaultCountryApplied: false,
    };
  }
  const hasOtherFilter = otherLocationFilters.some((filter) =>
    Array.isArray(filter) ? filter.length > 0 : Boolean(filter),
  );
  return hasOtherFilter
    ? { country: undefined, defaultCountryApplied: false }
    : { country: [...CONSTANTS.DEFAULT_COUNTRIES], defaultCountryApplied: true };
}
