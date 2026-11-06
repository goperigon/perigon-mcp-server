import { z } from "zod";
import { CONSTANTS } from "../types";

/**
 * Formats the API accepts for a date-valued parameter, quoted back to the
 * caller verbatim when a value fails to parse.
 */
const DATE_FORMAT_HINT =
  'ISO 8601 (e.g. 2024-02-01T23:59:59Z) or yyyy-mm-dd (e.g. 2024-02-01). Relative expressions such as "last week" or "yesterday" are not supported — resolve them to an absolute date first.';

/**
 * Parse a date-valued tool parameter to a `Date`. An empty string means "not
 * set" (hosts sometimes send `""` for an omitted optional string), and
 * anything unparseable raises a zod issue rather than yielding an
 * `Invalid Date`.
 *
 * Rejecting at the schema is what makes the failure actionable for the model
 * on the other end: it names the offending parameter and the accepted
 * formats, and it is the only path that reaches
 * `experimental_repairToolCall` (see `worker/lib/repair-tool-call.ts`), which
 * fires on `InvalidToolInputError` and so never sees a schema that parsed
 * "successfully" into an `Invalid Date`. Left unvalidated, the bad value
 * instead throws `RangeError: Invalid Date` from whichever query-string
 * builder tries to serialize it, and surfaces as a bare "Invalid Date"
 * naming neither the parameter nor the format.
 */
export function parseDateParam(
  value: string,
  ctx: z.RefinementCtx,
): Date | undefined {
  if (value === "") return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Invalid date ${JSON.stringify(value)} — use ${DATE_FORMAT_HINT}`,
    });
    return z.NEVER;
  }
  return parsed;
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
      "Filter by country, 2-letter lowercase code (e.g. us, ca, mx).",
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
    .transform(parseDateParam)
    .optional()
    .describe(
      "Filter for articles published before this date. Accepts ISO 8601 format (e.g., 2022-02-01T23:59:59) or yyyy-mm-dd format."
    ),
  to: z
    .string()
    .transform(parseDateParam)
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