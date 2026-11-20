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
      "Country codes, 2-letter lowercase (e.g. us, gb). Defaults to us without another geographic filter; [] = all countries.",
    ),
  states: z
    .array(z.string())
    .optional()
    .transform((states) => {
      if (!states) return undefined;
      return states.map((state) => state.toUpperCase());
    })
    .describe(
      "US states central to the story, 2-letter codes (e.g. TX).",
    ),
  cities: z
    .array(z.string())
    .optional()
    .describe(
      "Cities central to the story (e.g. Austin).",
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
    .describe("Page number, 0-based."),
  size: z
    .number()
    .min(1)
    .max(1000)
    .default(CONSTANTS.DEFAULT_PAGE_SIZE)
    .describe("Results per page."),
});

/**
 * Default time-based filtering arguments
 */
export const defaultArgs = z.object({
  from: z
    .string()
    .transform(parseTime)
    .optional()
    .describe("Published after this date (ISO 8601 or yyyy-mm-dd)."),
  to: z
    .string()
    .transform(parseTime)
    .optional()
    .describe(
      "Published before this date (ISO 8601 or yyyy-mm-dd). Leave unset unless bounding a past period."
    ),
});

/**
 * Categories filter
 */
export const categories = z
  .array(z.string())
  .optional()
  .describe("Content categories (e.g. Politics, Tech, Sports, Business, Finance).");

/**
 * Topics filter
 */
export const topics = z
  .array(z.string())
  .optional()
  .describe("Topics, more granular than categories (e.g. Markets, Crime, College Sports).");

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
