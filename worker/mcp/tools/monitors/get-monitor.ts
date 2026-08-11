import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../../lib/perigon";
import { ToolCallback, ToolDefinition } from "../types";
import { toolResult } from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";
import { formatMonitorDetail } from "../utils/monitor-formatting";

export const getMonitorArgs = z.object({
  uuid: z.string().uuid().describe("UUID of the monitor to retrieve.")
});

export function getMonitor(perigon: Perigon): ToolCallback<typeof getMonitorArgs> {
  return async ({
    uuid
  }: z.infer<typeof getMonitorArgs>): Promise<CallToolResult> => {
    try {
      const result = await perigon.getMonitor(uuid);
      return toolResult(formatMonitorDetail(result.data));
    } catch (error) {
      console.error("Error getting monitor:", error);
      return toolResult(
        `Error: Failed to get monitor: ${await createErrorMessage(error)}`
      );
    }
  };
}

export const getMonitorTool = {
  name: "get_monitor",
  title: "Get monitor",
  description:
    "Retrieve the complete configuration for one Perigon monitor by UUID, including its objective, status, classification, article query, output schema, schedule, watchlist, and delivery contact points.",
  parameters: getMonitorArgs,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true
  },
  createHandler: (perigon: Perigon) => getMonitor(perigon)
} satisfies ToolDefinition<typeof getMonitorArgs>;
