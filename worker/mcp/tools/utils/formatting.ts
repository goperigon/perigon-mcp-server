import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { CONSTANTS } from "../types";

/**
 * Create a tool result with text content
 * @param text The text content to return
 * @returns CallToolResult object
 */
export function toolResult(text: string): CallToolResult {
  return {
    content: [{ type: "text", text }],
  };
}

/**
 * Standard "no results found" response
 */
export const noResults = toolResult("No results found");

/**
 * Create a pagination header for search results
 * @param total Total number of results
 * @param page Current page number (0-based)
 * @param size Number of results per page
 * @param itemType Type of items being paginated (e.g., "articles", "stories")
 * @returns Formatted pagination header string
 */
export function createPaginationHeader(
  total: number,
  page: number,
  size: number,
  itemType: string
): string {
  const totalPages = Math.ceil(total / size);
  return `Got ${total} ${itemType} (page ${page} of ${totalPages - 1})`;
}

/**
 * Create a header for endpoints that return the current page only and do not
 * expose total result counts.
 */
export function createCurrentPageHeader(
  returned: number,
  page: number,
  size: number,
  itemType: string
): string {
  return `Returned ${returned} ${itemType} (page ${page}, requested size ${size})`;
}

/**
 * Format an array of `WikidataLabelHolder`-like objects (or strings) into a
 * human-readable comma-separated list of labels. Returns "N/A" when the
 * collection is empty/null/undefined so the LLM never sees `[object Object]`.
 */
export function formatLabelList(
  items:
    | Array<{ label?: string | null } | string | null | undefined>
    | null
    | undefined,
  fallback = "N/A",
): string {
  if (!items || items.length === 0) return fallback;
  const labels = items
    .map((item) => {
      if (item == null) return null;
      if (typeof item === "string") return item;
      return item.label ?? null;
    })
    .filter((label): label is string => typeof label === "string" && label.length > 0);
  return labels.length > 0 ? labels.join(", ") : fallback;
}

/**
 * Pull the `label` out of a single `WikidataLabelHolder`-like object.
 */
export function formatLabel(
  holder: { label?: string | null } | null | undefined,
  fallback = "N/A",
): string {
  return holder?.label?.trim() || fallback;
}

/**
 * Render a `WikidataDateHolder` (`{time, precision}`) as an ISO date string.
 */
export function formatWikidataDate(
  holder: { time?: string | null; precision?: string | null } | null | undefined,
  fallback = "N/A",
): string {
  if (!holder?.time) return fallback;
  // Time is ISO 8601, but we usually only care about the date portion
  return holder.time.split("T")[0] || holder.time;
}

/**
 * Render a stats bucket's ` date="..."` attribute, or nothing for undated
 * splitBy=none totals.
 */
export function dateAttr(date: string | null | undefined): string {
  return date ? ` date="${date}"` : "";
}
/**
 * Tool-description sentence documenting when the default country filter
 * applies; kept next to the response note so the two stay in sync.
 */
export function describeDefaultCountry(
  geoFilters: string[],
  howToChange = "pass countries to choose others, or countries: [] for all countries",
): string {
  const condition =
    geoFilters.length > 1
      ? `none of ${geoFilters.slice(0, -1).join(", ")} or ${geoFilters[geoFilters.length - 1]} is given`
      : `${geoFilters[0]} is not given`;
  return `Country default: when ${condition}, results are filtered to country ${CONSTANTS.DEFAULT_COUNTRIES.join(", ")} and the response starts with a <note> saying the default was applied; ${howToChange}.`;
}

/** Hint for tools that take a single `country` and cannot search all countries. */
export const SINGLE_COUNTRY_HINT =
  "Pass country to search another country, or use search_news_articles with countries: [] for all countries.";

/**
 * Prefix a response with a note when the default country filter was applied,
 * so the model knows results are narrower than it asked for.
 */
export function withDefaultCountryNote(
  text: string,
  defaultCountryApplied: boolean,
  howToChange = "Pass countries to search other countries, or countries: [] for all countries.",
): string {
  if (!defaultCountryApplied) return text;
  const note = `<note>No country filter was given, so the default country filter was applied: ${CONSTANTS.DEFAULT_COUNTRIES.join(", ")}. ${howToChange}</note>`;
  return `${note}\n\n${text}`;
}
