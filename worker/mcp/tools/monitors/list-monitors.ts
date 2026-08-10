import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../../lib/perigon";
import { ToolCallback, ToolDefinition } from "../types";
import {
  monitorClassificationType,
  monitorPaginationArgs,
  monitorStatus
} from "../schemas/monitors";
import { noResults, toolResult } from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";
import { formatMonitorList } from "../utils/monitor-formatting";

export const listMonitorsArgs = monitorPaginationArgs.extend({
  uuid: z
    .array(z.string().uuid())
    .optional()
    .describe("Filter by one or more monitor UUIDs."),
  name: z
    .string()
    .optional()
    .describe("Filter by monitor name using a case-insensitive partial match."),
  status: z
    .array(monitorStatus)
    .optional()
    .describe(
      "Filter by lifecycle status. Archived monitors are excluded when omitted."
    ),
  classificationType: z
    .array(monitorClassificationType)
    .optional()
    .describe("Filter by EVENT, MENTIONS, or TOPIC classification."),
  sortBy: z.enum(["createdAt", "updatedAt"]).default("createdAt")
});

export function listMonitors(perigon: Perigon): ToolCallback<typeof listMonitorsArgs> {
  return async (
    args: z.infer<typeof listMonitorsArgs>
  ): Promise<CallToolResult> => {
    try {
      const result = await perigon.listMonitors(args);
      if (result.total === 0 || result.data.length === 0) return noResults;
      return toolResult(
        formatMonitorList(result.data, result.total, args.page, args.size)
      );
    } catch (error) {
      console.error("Error listing monitors:", error);
      return toolResult(
        `Error: Failed to list monitors: ${await createErrorMessage(error)}`
      );
    }
  };
}

export const listMonitorsTool = {
  name: "list_monitors",
  title: "List monitors",
  description:
    "List and search the authenticated user's Perigon monitors. Use this first to discover monitor UUIDs, inspect statuses, or find monitors by name or classification. Archived monitors are excluded unless explicitly requested.",
  parameters: listMonitorsArgs,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true
  },
  createHandler: (perigon: Perigon) => listMonitors(perigon),
} satisfies ToolDefinition<typeof listMonitorsArgs>;
