import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../../lib/perigon";
import { WatchlistDto } from "../../../types/platform";
import { ToolCallback, ToolDefinition } from "../types";
import { toolResult, noResults, createPaginationHeader } from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";

export const watchlistsArgs = z.object({
  id: z
    .number()
    .int()
    .optional()
    .describe("Get one watchlist by exact numeric ID."),
  resolveNames: z
    .array(z.string())
    .max(100)
    .optional()
    .describe(
      "Resolve watchlists by exact name — returns the org's private watchlist if one exists, else the matching public watchlist.",
    ),
  nameContains: z
    .string()
    .optional()
    .describe("List mode: filter by name, case-insensitive partial match."),
  page: z.number().min(0).default(0).describe("Zero-based page number."),
  size: z.number().min(1).max(100).default(10).describe("Results per page."),
  sortBy: z
    .enum(["id", "createdAt", "updatedAt", "name"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

function formatWatchlist(w: WatchlistDto): string {
  return `<watchlist id="${w.id}" name="${w.name}">
Display Name: ${w.displayName}
Description: ${w.description ?? "N/A"}
Visible: ${w.visible}
People: ${w.people.map((p) => p.name).join(", ") || "none"}
Companies: ${w.companies.map((c) => c.name).join(", ") || "none"}
</watchlist>`;
}

export function getWatchlists(
  perigon: Perigon,
): ToolCallback<typeof watchlistsArgs> {
  return async ({
    id,
    resolveNames,
    nameContains,
    page,
    size,
    sortBy,
    sortOrder,
  }: z.infer<typeof watchlistsArgs>): Promise<CallToolResult> => {
    try {
      if (id !== undefined) {
        const result = await perigon.getWatchlist(id);
        return toolResult(formatWatchlist(result.data));
      }

      if (resolveNames && resolveNames.length > 0) {
        const result = await perigon.resolveWatchlists(resolveNames);
        if (!result.data || result.data.length === 0) return noResults;
        return toolResult(
          `<watchlists>\n${result.data.map(formatWatchlist).join("\n\n")}\n</watchlists>`,
        );
      }

      const result = await perigon.listWatchlists({
        name: nameContains,
        page,
        size,
        sortBy,
        sortOrder,
      });
      if (result.total === 0) return noResults;
      let output = createPaginationHeader(result.total, page, size, "watchlists");
      output += `\n<watchlists>\n${result.data.map(formatWatchlist).join("\n\n")}\n</watchlists>`;
      return toolResult(output);
    } catch (error) {
      console.error("Error fetching watchlists:", error);
      return toolResult(
        `Error: Failed to fetch watchlists: ${await createErrorMessage(error)}`,
      );
    }
  };
}

export const watchlistsTool = {
  name: "watchlists",
  title: "List, get, or resolve watchlists",
  description:
    "List, get by ID, or resolve by exact name the organization's watchlists (curated people/company lists used to scope monitors and article searches via the watchlist filter). Pass id for a single lookup, resolveNames to look up by exact name, or neither to list/search by nameContains.",
  parameters: watchlistsArgs,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  createHandler: (perigon: Perigon) => getWatchlists(perigon),
} satisfies ToolDefinition<typeof watchlistsArgs>;
