import { SignalToolDefinition } from "./types";
import { readSignalSchema } from "./schemas";
import { exportEventsTool } from "./export-events";

export const readSignalTool = {
  name: "signal_insights_read_signal",
  description:
    "Get full signal metadata including data schema, available event types, and event count. " +
    `Use before ${exportEventsTool.name} to understand the available fields for a signal.`,
  parameters: readSignalSchema,
  createHandler:
    (insightsApi) =>
    async ({ signalUuid }) =>
      insightsApi.readSignal(signalUuid),
} as const satisfies SignalToolDefinition<typeof readSignalSchema>;
