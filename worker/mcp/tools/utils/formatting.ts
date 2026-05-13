import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

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