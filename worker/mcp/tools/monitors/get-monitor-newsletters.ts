import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../../lib/perigon";
import { ToolCallback, ToolDefinition } from "../types";
import { monitorDateParam, monitorPaginationArgs } from "../schemas/monitors";
import { noResults, toolResult } from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";
import { formatMonitorNewsletters } from "../utils/monitor-formatting";

export const getMonitorNewslettersArgs = monitorPaginationArgs.extend({
  uuid: z.string().uuid().describe("UUID of the monitor."),
  title: z
    .string()
    .optional()
    .describe(
      "Filter newsletter titles using a case-insensitive partial match."
    ),
  from: monitorDateParam()
    .optional()
    .describe("Include newsletters created on or after this ISO 8601 date."),
  to: monitorDateParam()
    .optional()
    .describe("Include newsletters created on or before this ISO 8601 date."),
  size: z
    .number()
    .int()
    .min(1)
    .max(10)
    .default(5)
    .describe("Number of newsletters to return, limited to 10 per response."),
  sortBy: z.enum(["createdAt", "updatedAt"]).default("createdAt")
});

export function getMonitorNewsletters(perigon: Perigon): ToolCallback<typeof getMonitorNewslettersArgs> {
  return async (
    args: z.infer<typeof getMonitorNewslettersArgs>
  ): Promise<CallToolResult> => {
    try {
      const { uuid, ...params } = args;
      const result = await perigon.getMonitorNewsletters(uuid, params);
      if (result.total === 0 || result.data.length === 0) return noResults;
      return toolResult(
        formatMonitorNewsletters(
          result.data,
          result.total,
          params.page,
          params.size
        )
      );
    } catch (error) {
      console.error("Error getting monitor newsletters:", error);
      return toolResult(
        `Error: Failed to get monitor newsletters: ${await createErrorMessage(error)}`
      );
    }
  };
}

export const getMonitorNewslettersTool = {
  name: "get_monitor_newsletters",
  title: "Get monitor newsletters",
  description:
    "Retrieve human-readable briefings generated on a monitor's schedule, typically for TOPIC monitors. Returns newsletter content and bounded citation metadata. Use pagination, title, or date filters for additional results.",
  parameters: getMonitorNewslettersArgs,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true
  },
  createHandler: (perigon: Perigon) => getMonitorNewsletters(perigon)
} satisfies ToolDefinition<typeof getMonitorNewslettersArgs>;
