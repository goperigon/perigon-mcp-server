import { z } from "zod";
import { SortBy } from "@goperigon/perigon-ts";

/**
 * Create a search field with Elasticsearch-style query support
 * @param contextDescription Description of what this field searches
 * @returns Zod schema for search field
 */
export function createSearchField(contextDescription: string) {
  return z
    .string()
    .optional()
    .transform((value) => {
      if (!value?.trim()) return value;

      // If already has operators, quotes, or special chars, leave as-is
      if (/\b(AND|OR|NOT)\b|[(){}*?"']/.test(value)) {
        return value;
      }

      // Split on whitespace and join with AND for simple phrases
      const words = value.trim().split(/\s+/);
      if (words.length > 1) {
        return words.join(" AND ");
      }

      return value;
    })
    .describe(
      `Elasticsearch-style search query for filtering ${contextDescription}. Supports advanced search syntax including:

    • Boolean operators: AND, OR, NOT (case-sensitive)
    • Exact phrase matching: Use double quotes around phrases (e.g., "US Election")
    • Wildcards: Use * for multiple characters, ? for single character (e.g., econom*, climat?)
    • Grouping: Use parentheses to group terms (e.g., (trump OR biden) AND election)
    • Field-specific searches: Can target specific content areas

    Examples:
    • Simple terms: trump biden
    • Boolean logic: "trump" OR "biden"
    • Phrase matching: "US Election" AND "trump"
    • Wildcards: climat* AND (warming OR change)
    • Complex queries: ("artificial intelligence" OR AI) AND (healthcare OR medical) NOT cryptocurrency

    Note: Simple phrases will be automatically joined with AND operators. Use quotes for exact phrase matching.`
    );
}

/**
 * Sort by enum for Wikipedia and other searches
 */
export const sortByEnum = z
  .enum([
    SortBy.Relevance,
    SortBy.CreatedAt,
    SortBy.UpdatedAt,
    SortBy.Count,
    SortBy.TotalCount,
  ])
  .describe(
    `Sort order for search results. Options:
      • ${SortBy.Relevance}: Sort by search relevance score (most relevant first)
      • ${SortBy.CreatedAt}: Sort by creation date (newest first)
      • ${SortBy.UpdatedAt}: Sort by last update date (most recently updated first)
      • ${SortBy.Count}: Sort by count/activity (most active first)
      • ${SortBy.TotalCount}: Sort by total count (highest total first)`
  );