import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../../lib/perigon";
import { MonitorCreateRequest } from "../../../types/monitors";
import { SocialSource } from "../../../types/types";
import { ToolDefinition } from "../types";
import {
  buildMonitorQuery,
  buildSocialQueries,
  ensureEventTypeField,
  monitorClassificationType,
  monitorDataSchemaArgs,
  monitorEntityGroupArgs,
  monitorLinkedInQueryArgs,
  monitorNewsletterConfigArgs,
  monitorQueryArgs,
  monitorRedditQueryArgs,
  monitorSchedulePolicyArgs,
  monitorSocialQueryFieldNames,
  monitorXQueryArgs,
  unavailableSocialQueryFields
} from "../schemas/monitors";
import { toolResult } from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";
import { formatMonitorDetail } from "../utils/monitor-formatting";
import {
  SchedulePolicyConversionError,
  toUtcSchedulePolicy
} from "../utils/schedule-timezone";

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
    .describe(
      "Recurring processing schedule. Interval hour and minute are wall-clock times in timezoneId."
    ),
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

const createMonitorArgsWithSocial = createMonitorArgs.extend({
  query: monitorQueryArgs
    .optional()
    .describe(
      "News and web article filters. Omit for a monitor that only tracks social channels."
    ),
  xQuery: monitorXQueryArgs()
    .optional()
    .describe("Track public X posts matching this query."),
  redditQuery: monitorRedditQueryArgs()
    .optional()
    .describe("Track Reddit posts matching this query."),
  linkedInQuery: monitorLinkedInQueryArgs()
    .optional()
    .describe(
      "Track LinkedIn posts matching this keyword search and/or author, member, or company filters."
    )
});

/** Adds the social query fields for the organization's social sources. */
export function buildCreateMonitorArgs(socialSources: readonly SocialSource[]) {
  if (monitorSocialQueryFieldNames(socialSources).length === 0) {
    return createMonitorArgs;
  }
  return createMonitorArgsWithSocial.omit(
    unavailableSocialQueryFields(socialSources)
  );
}

type CreateMonitorInput = z.infer<typeof createMonitorArgsWithSocial>;

export function createMonitor(
  perigon: Perigon
): (args: CreateMonitorInput) => Promise<CallToolResult> {
  return async (args: CreateMonitorInput): Promise<CallToolResult> => {
    try {
      const { query, xQuery, redditQuery, linkedInQuery, ...fields } = args;
      if (!query && !xQuery && !redditQuery && !linkedInQuery) {
        return toolResult(
          "Error: Provide query and/or at least one social query (xQuery, redditQuery, linkedInQuery)."
        );
      }

      if (
        args.status === "ACTIVE" &&
        args.classificationType === "TOPIC" &&
        (!args.schedulePolicy || !args.newsletterConfig)
      ) {
        return toolResult(
          "Error: An ACTIVE TOPIC monitor requires both schedulePolicy and newsletterConfig."
        );
      }

      let utcSchedulePolicy;
      if (args.schedulePolicy) {
        try {
          utcSchedulePolicy = toUtcSchedulePolicy(args.schedulePolicy);
        } catch (error) {
          if (error instanceof SchedulePolicyConversionError) {
            return toolResult(error.message);
          }
          throw error;
        }
      }

      const ensured = ensureEventTypeField(
        fields.dataSchema,
        fields.classificationType
      );
      if (!ensured.ok) {
        return toolResult(ensured.error);
      }

      const body: MonitorCreateRequest = {
        ...fields,
        dataSchema: ensured.dataSchema,
        ...(query ? { query: buildMonitorQuery(query) } : {}),
        ...buildSocialQueries<never>({ xQuery, redditQuery, linkedInQuery }),
        schedulePolicy: utcSchedulePolicy
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
    "Create a Perigon monitor for continuously detecting events, mentions, or scheduled topic briefings. Defaults to DRAFT; only pass ACTIVE when the user explicitly asks to start processing. ACTIVE TOPIC monitors require both a schedule and newsletter configuration. EVENT and MENTIONS monitors require a dataSchema field named eventType (STRING or ENUM, required, not nullable); it is added as a required STRING if omitted. An ACTIVE monitor starts background processing and can deliver notifications to configured contact points; delivered notifications cannot be recalled.",
  parameters: createMonitorArgs,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true
  },
  createHandler: (perigon: Perigon) => createMonitor(perigon)
} satisfies ToolDefinition<typeof createMonitorArgs>;

/** `create_monitor` with the social channels the organization can use. */
export function createMonitorToolForSources(
  socialSources: readonly SocialSource[]
): ToolDefinition<ReturnType<typeof buildCreateMonitorArgs>> {
  const fields = monitorSocialQueryFieldNames(socialSources);
  if (fields.length === 0) return createMonitorTool;
  return {
    ...createMonitorTool,
    description: `${createMonitorTool.description} Social channels: pass ${fields.join(" / ")} to track social posts, alone or alongside query. Omit query for a social-only monitor.`,
    parameters: buildCreateMonitorArgs(socialSources)
  };
}
