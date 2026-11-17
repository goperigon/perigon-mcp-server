import { DATA_DIR } from "../../constants";
import { EXPORT_TOOL_META } from "../../apps/export-viewer-html";
import { SignalToolDefinition } from "./types";
import { exportEventsSchema } from "./schemas";

export const exportEventsTool = {
  name: "signal_insights_export_events",
  description:
    "Export signal events with a structured query (no SQL): signals, fields, filters, aggregations, ordering. " +
    "EVENT and MENTIONS signals only; for TOPIC use signal_insights_list_newsletters / signal_insights_read_newsletter. " +
    "Filter JSONB data with data: [{op: CONTAINS, value: {key: val}}]; select data.<path> for subfields (e.g. data.companyName). " +
    "groupBy/orderBy take {index: N} (1-based) when select is given, else {field: 'name'}. " +
    `Returns a preview plus the full JSONL file, available in the sandbox at ${DATA_DIR}/<filename>.`,
  parameters: exportEventsSchema,
  _meta: EXPORT_TOOL_META,
  annotations: {
    title: "Export monitor events",
    readOnlyHint: false,
    openWorldHint: false,
    destructiveHint: true,
  },
  createHandler: (_insightsApi, pokeyClient) => async (args) =>
    pokeyClient.executeTool("export_events", args),
} as const satisfies SignalToolDefinition<typeof exportEventsSchema>;
