import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../../lib/perigon";
import { ToolCallback, ToolDefinition } from "../types";
import { toolResult } from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";

const watchlistPersonArgs = z.object({
  name: z.string(),
  description: z.string().optional(),
  aliases: z.array(z.string()).optional(),
  wikidataId: z.string().optional(),
  query: z.string().optional(),
});

const watchlistCompanyArgs = z.object({
  name: z.string(),
  description: z.string().optional(),
  id: z.string().optional(),
  domain: z.string().optional(),
  aliases: z.array(z.string()).optional(),
  query: z.string().optional(),
});

export const updateWatchlistArgs = z.object({
  id: z.number().int().describe("ID of the watchlist to update."),
  name: z.string().optional(),
  displayName: z.string().optional(),
  description: z.string().optional(),
  people: z
    .array(watchlistPersonArgs)
    .optional()
    .describe("Replaces the full people list when provided."),
  companies: z
    .array(watchlistCompanyArgs)
    .optional()
    .describe("Replaces the full companies list when provided."),
  visible: z.boolean().optional(),
});

export function updateWatchlist(
  perigon: Perigon,
): ToolCallback<typeof updateWatchlistArgs> {
  return async ({
    id,
    ...body
  }: z.infer<typeof updateWatchlistArgs>): Promise<CallToolResult> => {
    try {
      const result = await perigon.updateWatchlist(id, body);
      return toolResult(`Updated watchlist ${result.data.id} ("${result.data.name}").`);
    } catch (error) {
      console.error("Error updating watchlist:", error);
      return toolResult(
        `Error: Failed to update watchlist: ${await createErrorMessage(error)}`,
      );
    }
  };
}

export const updateWatchlistTool = {
  name: "update_watchlist",
  title: "Update watchlist",
  description:
    "Partially update a watchlist. Only provided fields are changed; people/companies arrays are replaced wholesale when provided, not merged. Only use this when the user explicitly asks to modify a watchlist.",
  parameters: updateWatchlistArgs,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  createHandler: (perigon: Perigon) => updateWatchlist(perigon),
} satisfies ToolDefinition<typeof updateWatchlistArgs>;
