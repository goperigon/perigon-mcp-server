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
      `Search query for ${contextDescription}. Supports Boolean operators (AND, OR, NOT), "exact phrases", and wildcards (* ?), e.g. ("AI" OR "artificial intelligence") NOT crypto. Unquoted multi-word input is auto-joined with AND.`,
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
    `Sort order: ${SortBy.Relevance} (best match), ${SortBy.CreatedAt}/${SortBy.UpdatedAt} (newest first), ${SortBy.Count}/${SortBy.TotalCount} (highest activity first).`,
  );