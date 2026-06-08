import { DATA_DIR } from "../../constants";
import { EXPORT_TOOL_META } from "../../apps/export-viewer-html";
import { SignalToolDefinition } from "./types";
import { exportEventsSchema } from "./schemas";

export const exportEventsTool = {
  name: "signal_insights_export_events",
  description:
    "Export signal events using a structured query API. No raw SQL — specify signals, fields, filters, aggregations, and ordering. " +
    "Returns a preview of the first rows plus an S3 file path for the full dataset (JSONL). " +
    "Available fields: eventType, eventDate, createdAt, updatedAt, summary, uuid, data, articles, signalId, or data.<path> for JSONB subfields (e.g. data.companyName). " +
    "Filter options: eventTypes (list), date ranges (eventDateFrom/To, createdAtFrom/To), JSONB containment (data: [{op: CONTAINS, value: {key: val}}]). " +
    "Select expressions: {type: 'field', name}, {type: 'date_trunc', granularity: HOUR|DAY|WEEK|MONTH|QUARTER|YEAR, field}, {type: 'agg', function: COUNT|COUNT_DISTINCT|SUM|AVG|MIN|MAX, field?}. " +
    "Group by / order by: use {index: N} (1-based) when select is provided, or {field: 'name'} when select is omitted. " +
    `Omit select to fetch all scalar event fields. Results are written to S3 and accessible in the sandbox at ${DATA_DIR}/<filename>.`,
  parameters: exportEventsSchema,
  _meta: EXPORT_TOOL_META,
  createHandler: (_insightsApi, pokeyClient) => async (args) =>
    pokeyClient.executeTool("export_events", args),
} as const satisfies SignalToolDefinition<typeof exportEventsSchema>;
