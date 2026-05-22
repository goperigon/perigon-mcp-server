import { SignalToolDefinition } from "./types";
import { searchSignalsSchema } from "./schemas";

export const searchSignalsTool = {
  name: "signal_insights_search_signals",
  description:
    "Search for signals by name or monitoring objective. " +
    "Use this to find relevant signals before fetching data. " +
    "If the search query is not present, this can be used to list all available signals.",
  parameters: searchSignalsSchema,
  createHandler: (insightsApi) => async (args) =>
    insightsApi.searchSignals(args),
} as const satisfies SignalToolDefinition<typeof searchSignalsSchema>;
