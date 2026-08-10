import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../../lib/perigon";
import { ToolCallback, ToolDefinition } from "../types";
import { toolResult } from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";
import { formatMonitorDetail } from "../utils/monitor-formatting";

export const setMonitorStatusArgs = z.object({
  uuid: z.string().uuid().describe("UUID of the monitor to change."),
  status: z
    .enum(["ACTIVE", "STOPPED", "ARCHIVED"])
    .describe(
      "ACTIVE starts processing, STOPPED pauses processing, and ARCHIVED removes the monitor from default lists. Archived monitors cannot be restored through the public API."
    )
});

export function setMonitorStatus(perigon: Perigon): ToolCallback<typeof setMonitorStatusArgs> {
  return async ({
    uuid,
    status
  }: z.infer<typeof setMonitorStatusArgs>): Promise<CallToolResult> => {
    try {
      const result =
        status === "ACTIVE"
          ? await perigon.activateMonitor(uuid)
          : status === "STOPPED"
            ? await perigon.pauseMonitor(uuid)
            : await perigon.archiveMonitor(uuid);

      return toolResult(
        `Monitor status changed to ${status}.\n${formatMonitorDetail(result.data)}`
      );
    } catch (error) {
      console.error("Error setting monitor status:", error);
      return toolResult(
        `Error: Failed to set monitor status: ${await createErrorMessage(error)}`
      );
    }
  };
}

export const setMonitorStatusTool = {
  name: "set_monitor_status",
  title: "Set monitor status",
  description:
    "Activate, pause, or archive a Perigon monitor. ACTIVE starts its processing pipeline, STOPPED pauses it, and ARCHIVED hides it from default lists and cannot be reversed through the public API. Use only when the user explicitly requests the lifecycle change.",
  parameters: setMonitorStatusArgs,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true
  },
  createHandler: (perigon: Perigon) => setMonitorStatus(perigon)
} satisfies ToolDefinition<typeof setMonitorStatusArgs>;
