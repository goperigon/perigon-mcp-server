import { SignalToolDefinition } from "./types";
import { searchSignalsSchema } from "./schemas";

export const searchSignalsTool = {
  name: "signal_insights_search_signals",
  description:
    "Find signals by name or monitoring objective (omit query to list all) before fetching their data. " +
    "Results include classificationType, eventCount, and newsletterCount.",
  parameters: searchSignalsSchema,
  annotations: {
    title: "Search monitors",
    readOnlyHint: true,
    openWorldHint: false,
    destructiveHint: false,
  },
  createHandler: (insightsApi) => async (args) =>
    insightsApi.searchSignals(args),
} as const satisfies SignalToolDefinition<typeof searchSignalsSchema>;
