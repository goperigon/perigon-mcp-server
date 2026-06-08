/**
 * Zod schemas for Signal Insights tools.
 *
 * These schemas mirror those in pokey/packages/api/src/core/signal-insights/.
 * Keep in sync when the Pokey schemas change.
 *
 * CONTRIBUTING: if you change a tool schema in Pokey, update the matching
 * schema here to keep the MCP parameter documentation accurate.
 */
import { z } from "zod";

const WORKSPACE_DESC =
  "Workspace ID returned by signal_insights_create_workspace. " +
  "Call signal_insights_create_workspace once at the start of a conversation, " +
  "then pass the returned workspace to all analysis tool calls.";

// ── Workspace ────────────────────────────────────────────────────────────────

export const createWorkspaceSchema = z.object({});

// ── Stateless signal tools ───────────────────────────────────────────────────

export const searchSignalsSchema = z.object({
  query: z
    .string()
    .optional()
    .describe(
      "Search term matched against signal name or monitoring objective. " +
        "Case-insensitive. Omit to list all available signals.",
    ),
  page: z.number().int().min(0).default(0).optional(),
  limit: z.number().int().min(1).max(50).default(10).optional(),
});

export const readSignalSchema = z.object({
  signalUuid: z
    .string()
    .uuid()
    .describe("UUID of the signal to read. Use search_signals to find UUIDs."),
});

// ── Export ───────────────────────────────────────────────────────────────────

const AggFunctionSchema = z.enum([
  "COUNT",
  "COUNT_DISTINCT",
  "SUM",
  "AVG",
  "MIN",
  "MAX",
]);

const BucketStrategySchema = z.enum([
  "HOUR",
  "DAY",
  "WEEK",
  "MONTH",
  "QUARTER",
  "YEAR",
]);
const SortDirectionSchema = z.enum(["ASC", "DESC"]);
const NullsPositionSchema = z.enum(["FIRST", "LAST"]);

const SelectFieldSchema = z.object({
  type: z.literal("field"),
  name: z
    .string()
    .describe(
      "Field name: eventType, eventDate, createdAt, updatedAt, summary, uuid, " +
        "data, articles, signalId, or data.<path> for JSONB subfields",
    ),
  alias: z.string().optional(),
});

const SelectDateTruncSchema = z.object({
  type: z.literal("date_trunc"),
  granularity: BucketStrategySchema.describe("Time bucket granularity"),
  field: z
    .string()
    .describe("Date field to truncate: eventDate, createdAt, or updatedAt"),
  alias: z.string().optional(),
});

const SelectAggSchema = z.object({
  type: z.literal("agg"),
  function: AggFunctionSchema,
  field: z.string().optional(),
  alias: z.string().optional(),
});

const SelectExprSchema = z.discriminatedUnion("type", [
  SelectFieldSchema,
  SelectDateTruncSchema,
  SelectAggSchema,
]);

const DataFilterSchema = z.object({
  op: z
    .enum(["CONTAINS", "NOT_CONTAINS"])
    .describe("JSONB containment operator"),
  value: z.record(z.string(), z.unknown()),
});

const GroupByExprSchema = z.object({
  index: z.number().min(1).optional(),
  field: z.string().optional(),
});

const OrderByExprSchema = z.object({
  index: z.number().min(1).optional(),
  field: z.string().optional(),
  direction: SortDirectionSchema.default("ASC"),
  nulls: NullsPositionSchema.optional(),
});

export const exportEventsSchema = z.object({
  workspace: z.string().describe(WORKSPACE_DESC),
  name: z
    .string()
    .optional()
    .describe(
      "Human-readable name/title for this export. " +
        "Generate a concise, descriptive name summarizing what this export contains.",
    ),
  signalUuids: z
    .array(z.string().uuid())
    .min(1)
    .max(100)
    .describe(
      "UUIDs of the signals to export data from. " +
        "Use search_signals to find signals first.",
    ),
  eventTypes: z
    .array(z.string())
    .optional()
    .describe("Filter by event type(s)"),
  eventDateFrom: z
    .string()
    .optional()
    .describe("ISO-8601 lower bound for event_date (inclusive)"),
  eventDateTo: z
    .string()
    .optional()
    .describe("ISO-8601 upper bound for event_date (exclusive)"),
  createdAtFrom: z
    .string()
    .optional()
    .describe("ISO-8601 lower bound for created_at (inclusive)"),
  createdAtTo: z
    .string()
    .optional()
    .describe("ISO-8601 upper bound for created_at (exclusive)"),
  data: z
    .array(DataFilterSchema)
    .optional()
    .describe("JSONB containment filters on the data column"),
  select: z
    .array(SelectExprSchema)
    .optional()
    .describe("Columns to select. Omit to select all scalar event fields."),
  groupBy: z.array(GroupByExprSchema).optional(),
  orderBy: z.array(OrderByExprSchema).optional(),
  limit: z.number().min(1).max(10000).default(1000).optional(),
  outputFile: z
    .string()
    .optional()
    .describe("Output filename (default: auto-generated JSONL)"),
});

// ── Sandbox tools ─────────────────────────────────────────────────────────────

export const executeCodeSchema = z.object({
  workspace: z.string().describe(WORKSPACE_DESC),
  code: z.string().describe("Python code to execute"),
  timeout: z
    .number()
    .min(1000)
    .max(120_000)
    .default(60_000)
    .optional()
    .describe("Timeout in milliseconds (default 60s)"),
});

export const shellSchema = z.object({
  workspace: z.string().describe(WORKSPACE_DESC),
  command: z.string().describe("Bash command to execute"),
  timeout: z
    .number()
    .min(1000)
    .max(60_000)
    .default(30_000)
    .optional()
    .describe("Timeout in milliseconds (default 30s)"),
});

export const listFilesSchema = z.object({
  workspace: z.string().describe(WORKSPACE_DESC),
  path: z
    .string()
    .optional()
    .describe(
      "Directory path relative to workspace root. Defaults to workspace root.",
    ),
});

export const grepSchema = z.object({
  workspace: z.string().describe(WORKSPACE_DESC),
  pattern: z
    .string()
    .describe("JavaScript-compatible regex pattern to search for"),
  path: z.string().describe("File path relative to workspace to search"),
  maxMatches: z.number().min(1).max(200).default(50).optional(),
});

export const readFileSchema = z.object({
  workspace: z.string().describe(WORKSPACE_DESC),
  path: z.string().describe("File path relative to workspace"),
  offset: z
    .number()
    .optional()
    .describe("Line number to start from (0-indexed)"),
  limit: z.number().optional().describe("Number of lines to read"),
});

export const writeFileSchema = z.object({
  workspace: z.string().describe(WORKSPACE_DESC),
  path: z.string().describe("File path relative to workspace"),
  contents: z.string().describe("File contents to write"),
});

export const strReplaceSchema = z.object({
  workspace: z.string().describe(WORKSPACE_DESC),
  path: z.string().describe("File path relative to workspace"),
  old_string: z.string().describe("String to find"),
  new_string: z.string().describe("Replacement string"),
});
