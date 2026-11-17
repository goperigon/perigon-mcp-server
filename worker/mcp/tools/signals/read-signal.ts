import { SignalToolDefinition } from "./types";
import { readSignalSchema } from "./schemas";

export const readSignalTool = {
  name: "signal_insights_read_signal",
  description:
    "Get signal metadata, including classificationType. " +
    "EVENT/MENTIONS: data schema, event types, event count — use before export_events. " +
    "TOPIC: newsletterCount and date range — use list_newsletters / read_newsletter.",
  parameters: readSignalSchema,
  annotations: {
    title: "Read monitor details",
    readOnlyHint: true,
    openWorldHint: false,
    destructiveHint: false,
  },
  createHandler:
    (insightsApi) =>
    async ({ signalUuid }) =>
      insightsApi.readSignal(signalUuid),
} as const satisfies SignalToolDefinition<typeof readSignalSchema>;
