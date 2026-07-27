import { SignalToolDefinition } from "./types";
import { readSignalSchema } from "./schemas";

export const readSignalTool = {
  name: "signal_insights_read_signal",
  description:
    "Get full signal metadata including classificationType and type-specific fields. " +
    "EVENT/MENTIONS: data schema, event types, event count — use before export_events. " +
    "TOPIC: newsletterCount and date range — use list_newsletters / read_newsletter.",
  parameters: readSignalSchema,
  createHandler:
    (insightsApi) =>
    async ({ signalUuid }) =>
      insightsApi.readSignal(signalUuid),
} as const satisfies SignalToolDefinition<typeof readSignalSchema>;
