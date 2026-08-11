import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../../lib/perigon";
import { MonitorUpdateRequest } from "../../../types/monitors";
import { ToolCallback, ToolDefinition } from "../types";
import {
  buildMonitorQuery,
  monitorClassificationType,
  monitorDataSchemaArgs,
  monitorEntityGroupArgs,
  monitorNewsletterConfigArgs,
  monitorQueryArgs,
  monitorSchedulePolicyArgs
} from "../schemas/monitors";
import { toolResult } from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";
import { formatMonitorDetail } from "../utils/monitor-formatting";

export const updateMonitorArgs = z.object({
  uuid: z.string().uuid().describe("UUID of the monitor to update."),
  name: z.string().trim().min(1).max(256).optional(),
  classificationType: monitorClassificationType.optional(),
  monitoringObjective: z.string().trim().min(1).max(4096).optional(),
  prompt: z
    .string()
    .max(8192)
    .nullable()
    .optional()
    .describe("Replacement instructions. Pass null to clear them."),
  dataSchema: monitorDataSchemaArgs.optional(),
  newsletterConfig: monitorNewsletterConfigArgs
    .nullable()
    .optional()
    .describe("Replacement citation settings. Pass null to clear them."),
  entityGroups: z
    .array(monitorEntityGroupArgs)
    .optional()
    .describe("Replacement entity groups. Pass an empty array to remove all."),
  query: monitorQueryArgs
    .optional()
    .describe("Complete replacement article query."),
  schedulePolicy: monitorSchedulePolicyArgs
    .nullable()
    .optional()
    .describe("Replacement schedule. Pass null to clear it."),
  watchlistId: z
    .number()
    .int()
    .positive()
    .nullable()
    .optional()
    .describe("Replacement watchlist ID. Pass null to clear it."),
  contactPointIds: z
    .array(z.string().uuid())
    .optional()
    .describe(
      "Replacement contact point UUIDs. Pass an empty array to remove all."
    )
});

export function updateMonitor(perigon: Perigon): ToolCallback<typeof updateMonitorArgs> {
  return async (
    args: z.infer<typeof updateMonitorArgs>
  ): Promise<CallToolResult> => {
    try {
      const { uuid, query, ...fields } = args;
      const body: MonitorUpdateRequest = {
        ...fields,
        ...(query ? { query: buildMonitorQuery(query) } : {})
      };

      if (Object.keys(body).length === 0) {
        return toolResult(
          "Error: At least one monitor field must be provided to update."
        );
      }

      const result = await perigon.updateMonitor(uuid, body);
      return toolResult(
        `Monitor updated successfully.\n${formatMonitorDetail(result.data)}`
      );
    } catch (error) {
      console.error("Error updating monitor:", error);
      return toolResult(
        `Error: Failed to update monitor: ${await createErrorMessage(error)}`
      );
    }
  };
}

export const updateMonitorTool = {
  name: "update_monitor",
  title: "Update monitor",
  description:
    "Partially update a Perigon monitor's configuration. Omitted fields remain unchanged; query, schema, schedules, entity groups, and contact points are complete replacements when provided. Use set_monitor_status for lifecycle changes.",
  parameters: updateMonitorArgs,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true
  },
  createHandler: (perigon: Perigon) => updateMonitor(perigon)
} satisfies ToolDefinition<typeof updateMonitorArgs>;
