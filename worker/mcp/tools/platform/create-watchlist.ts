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

export const createWatchlistArgs = z.object({
  name: z.string().describe("Unique watchlist name within the organization."),
  displayName: z.string().optional().describe("Human-readable display name."),
  description: z.string().optional(),
  people: z
    .array(watchlistPersonArgs)
    .default([])
    .describe("People to include (max 100 combined with companies)."),
  companies: z
    .array(watchlistCompanyArgs)
    .default([])
    .describe("Companies to include (max 100 combined with people)."),
  visible: z.boolean().optional().default(true).describe("Whether visible in the UI."),
});

export function createWatchlist(
  perigon: Perigon,
): ToolCallback<typeof createWatchlistArgs> {
  return async (
    args: z.infer<typeof createWatchlistArgs>,
  ): Promise<CallToolResult> => {
    try {
      const result = await perigon.createWatchlist(args);
      return toolResult(
        `Created watchlist ${result.data.id} ("${result.data.name}").`,
      );
    } catch (error) {
      console.error("Error creating watchlist:", error);
      return toolResult(
        `Error: Failed to create watchlist: ${await createErrorMessage(error)}`,
      );
    }
  };
}

export const createWatchlistTool = {
  name: "create_watchlist",
  title: "Create watchlist",
  description:
    "Create a new watchlist of people and/or companies. Only use this when the user explicitly asks to create a watchlist — do not create one speculatively as part of a search or monitor workflow.",
  parameters: createWatchlistArgs,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  createHandler: (perigon: Perigon) => createWatchlist(perigon),
} satisfies ToolDefinition<typeof createWatchlistArgs>;
