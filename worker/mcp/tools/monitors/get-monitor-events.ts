import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../../lib/perigon";
import { ToolCallback, ToolDefinition } from "../types";
import { monitorDateParam, monitorPaginationArgs } from "../schemas/monitors";
import { noResults, toolResult } from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";
import { formatMonitorEvents } from "../utils/monitor-formatting";

export const getMonitorEventsArgs = monitorPaginationArgs.extend({
  uuid: z.string().uuid().describe("UUID of the EVENT or MENTIONS monitor."),
  eventType: z
    .string()
    .optional()
    .describe("Filter for events with this exact event type."),
  from: monitorDateParam()
    .optional()
    .describe("Include events created on or after this ISO 8601 date."),
  to: monitorDateParam()
    .optional()
    .describe("Include events created on or before this ISO 8601 date."),
  size: z
    .number()
    .int()
    .min(1)
    .max(25)
    .default(10)
    .describe("Number of events to return, limited to 25 per response."),
  sortBy: z.enum(["createdAt", "updatedAt", "eventDate"]).default("createdAt")
});

export function getMonitorEvents(perigon: Perigon): ToolCallback<typeof getMonitorEventsArgs> {
  return async (
    args: z.infer<typeof getMonitorEventsArgs>
  ): Promise<CallToolResult> => {
    try {
      const { uuid, ...params } = args;
      const result = await perigon.getMonitorEvents(uuid, params);
      if (result.total === 0 || result.data.length === 0) return noResults;
      return toolResult(
        formatMonitorEvents(result.data, result.total, params.page, params.size)
      );
    } catch (error) {
      console.error("Error getting monitor events:", error);
      return toolResult(
        `Error: Failed to get monitor events: ${await createErrorMessage(error)}`
      );
    }
  };
}

export const getMonitorEventsTool = {
  name: "get_monitor_events",
  title: "Get monitor events",
  description:
    "Retrieve structured matches emitted asynchronously by an EVENT or MENTIONS monitor. Returns extracted schema data, event summaries, matched entities, and a bounded set of related article details. Use pagination or date filters for additional results.",
  parameters: getMonitorEventsArgs,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true
  },
  createHandler: (perigon: Perigon) => getMonitorEvents(perigon)
} satisfies ToolDefinition<typeof getMonitorEventsArgs>;
