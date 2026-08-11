import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../../lib/perigon";
import { ToolCallback, ToolDefinition } from "../types";
import { monitorDateParam, monitorPaginationArgs } from "../schemas/monitors";
import { noResults, toolResult } from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";
import { formatMonitorSummaries } from "../utils/monitor-formatting";

export const getMonitorSummariesArgs = monitorPaginationArgs.extend({
  uuid: z.string().uuid().describe("UUID of the monitor."),
  from: monitorDateParam()
    .optional()
    .describe("Include summaries created on or after this ISO 8601 date."),
  to: monitorDateParam()
    .optional()
    .describe("Include summaries created on or before this ISO 8601 date."),
  size: z
    .number()
    .int()
    .min(1)
    .max(25)
    .default(10)
    .describe("Number of summaries to return, limited to 25 per response."),
  sortBy: z.enum(["createdAt", "updatedAt"]).default("createdAt")
});

export function getMonitorSummaries(perigon: Perigon): ToolCallback<typeof getMonitorSummariesArgs> {
  return async (
    args: z.infer<typeof getMonitorSummariesArgs>
  ): Promise<CallToolResult> => {
    try {
      const { uuid, ...params } = args;
      const result = await perigon.getMonitorSummaries(uuid, params);
      if (result.total === 0 || result.data.length === 0) return noResults;
      return toolResult(
        formatMonitorSummaries(
          result.data,
          result.total,
          params.page,
          params.size
        )
      );
    } catch (error) {
      console.error("Error getting monitor summaries:", error);
      return toolResult(
        `Error: Failed to get monitor summaries: ${await createErrorMessage(error)}`
      );
    }
  };
}

export const getMonitorSummariesTool = {
  name: "get_monitor_summaries",
  title: "Get monitor summaries",
  description:
    "Retrieve rolling AI-generated summaries produced as a monitor processes matching content. Use pagination or creation-date filters to inspect summary history.",
  parameters: getMonitorSummariesArgs,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true
  },
  createHandler: (perigon: Perigon) => getMonitorSummaries(perigon)
} satisfies ToolDefinition<typeof getMonitorSummariesArgs>;
