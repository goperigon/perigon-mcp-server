import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../../lib/perigon";
import { MonitorCreateRequest } from "../../../types/monitors";
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

export const createMonitorArgs = z.object({
  name: z.string().trim().min(1).max(256),
  status: z
    .enum(["ACTIVE", "DRAFT"])
    .default("DRAFT")
    .describe(
      "Initial status. Defaults to DRAFT so processing does not start unless ACTIVE is explicitly requested."
    ),
  classificationType: monitorClassificationType.describe(
    "EVENT and MENTIONS emit realtime structured events; TOPIC produces scheduled briefings."
  ),
  monitoringObjective: z
    .string()
    .trim()
    .min(1)
    .max(4096)
    .describe("Plain-language objective defining what the monitor tracks."),
  prompt: z
    .string()
    .max(8192)
    .optional()
    .describe("Additional instructions guiding monitor processing."),
  dataSchema: monitorDataSchemaArgs.describe(
    "Schema for structured data extracted into matching events."
  ),
  newsletterConfig: monitorNewsletterConfigArgs
    .optional()
    .describe("Citation behavior for generated newsletters."),
  entityGroups: z
    .array(monitorEntityGroupArgs)
    .optional()
    .describe("Entity groups the monitor should identify."),
  query: monitorQueryArgs.describe(
    "Article filters determining which content the monitor evaluates."
  ),
  schedulePolicy: monitorSchedulePolicyArgs
    .optional()
    .describe("Recurring processing schedule."),
  watchlistId: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Numeric ID of an existing visible watchlist."),
  contactPointIds: z
    .array(z.string().uuid())
    .optional()
    .describe(
      "UUIDs of verified, non-archived contact points that receive notifications."
    )
});

export function createMonitor(perigon: Perigon): ToolCallback<typeof createMonitorArgs> {
  return async (
    args: z.infer<typeof createMonitorArgs>
  ): Promise<CallToolResult> => {
    try {
      if (
        args.status === "ACTIVE" &&
        args.classificationType === "TOPIC" &&
        (!args.schedulePolicy || !args.newsletterConfig)
      ) {
        return toolResult(
          "Error: An ACTIVE TOPIC monitor requires both schedulePolicy and newsletterConfig."
        );
      }

      const body: MonitorCreateRequest = {
        ...args,
        query: buildMonitorQuery(args.query)
      };
      const result = await perigon.createMonitor(body);
      return toolResult(
        `Monitor created successfully.\n${formatMonitorDetail(result.data)}`
      );
    } catch (error) {
      console.error("Error creating monitor:", error);
      return toolResult(
        `Error: Failed to create monitor: ${await createErrorMessage(error)}`
      );
    }
  };
}

export const createMonitorTool = {
  name: "create_monitor",
  title: "Create monitor",
  description:
    "Create a Perigon monitor for continuously detecting events, mentions, or scheduled topic briefings. Defaults to DRAFT; only pass ACTIVE when the user explicitly asks to start processing. ACTIVE TOPIC monitors require both a schedule and newsletter configuration.",
  parameters: createMonitorArgs,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true
  },
  createHandler: (perigon: Perigon) => createMonitor(perigon)
} satisfies ToolDefinition<typeof createMonitorArgs>;
