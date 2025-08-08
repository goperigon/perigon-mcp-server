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