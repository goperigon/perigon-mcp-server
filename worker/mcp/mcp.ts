import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Scopes } from "../types/types";
import { TOOL_DEFINITIONS, type ToolName } from "./tools";
import { Perigon } from "../lib/perigon";
import { resolveActiveTools, SIGNAL_TOOL_NAMES } from "./tools/selection";
import { InsightsApiClient } from "../lib/insights-api-client";
import { PokeyInsightsClient } from "../lib/pokey-insights-client";
import {
  createWorkspaceSchema,
  searchSignalsSchema,
  readSignalSchema,
  executeCodeSchema,
  shellSchema,
  exportEventsSchema,
  listFilesSchema,
  grepSchema,
  readFileSchema,
  writeFileSchema,
  strReplaceSchema,
} from "./tools/signals/schemas";
import {
  CHART_VIEWER_HTML,
  CHART_VIEWER_MIME_TYPE,
  CHART_RESOURCE_URI,
  CHART_META,
} from "./apps/chart-viewer-html";

export type Props = {
  apiKey: string;
  scopes: Scopes[];
  requestedTools: string[] | null;
  organizationId: number;
};

// Map scopes to tool names
const SCOPE_TO_TOOLS: Partial<Record<Scopes, ToolName[]>> = {
  [Scopes.CLUSTERS]: ["search_news_stories", "search_story_history"],
  [Scopes.SEARCH_SUMMARY]: ["summarize_news"],
  [Scopes.JOURNALISTS]: ["search_journalists"],
  [Scopes.SOURCES]: ["search_sources"],
  [Scopes.PEOPLE]: ["search_people", "get_person_news"],
  [Scopes.COMPANIES]: ["search_companies", "get_company_news"],
  [Scopes.TOPICS]: ["search_topics"],
  [Scopes.LOCATIONS]: ["get_location_news"],
  [Scopes.WIKIPEDIA]: ["search_wikipedia"],
  [Scopes.VECTOR_SEARCH_NEWS]: ["search_vector_news"],
  [Scopes.VECTOR_SEARCH_WIKIPEDIA]: ["search_vector_wikipedia"],
};

/**
 * Returns a deduplicated list of tool names permitted by the given API key
 * scopes. `search_news_articles` is always included regardless of scope.
 */
function getAllowedToolsForScopes(scopes: Scopes[]): ToolName[] {
  const seen = new Set<ToolName>(["search_news_articles"]);
  for (const scope of scopes) {
    if (!scope) continue;
    const toolNames = SCOPE_TO_TOOLS[scope];
    if (!toolNames) continue;
    for (const name of toolNames) {
      seen.add(name);
    }
  }
  return [...seen];
}

const WORKSPACE_DIR = "/home/user/workspace";
const DATA_DIR = `${WORKSPACE_DIR}/artifacts`;
const OUTPUT_DIR = `${DATA_DIR}/output`;

export class PerigonMCP extends McpAgent<Env, unknown, Props> {
  // Type assertion needed: agents bundles its own @modelcontextprotocol/sdk copy
  server = new McpServer({
    name: "Perigon News API",
    version: "1.0.0",
  });

  async init() {
    const perigon = new Perigon(this.props!.apiKey);
    const { scopes, requestedTools } = this.props!;

    // ── News tools (existing) ──────────────────────────────────────────────
    const allowedNewsTools = getAllowedToolsForScopes(scopes);
    const activeNewsTools = resolveActiveTools(
      allowedNewsTools,
      requestedTools,
    );

    for (const toolName of activeNewsTools) {
      const definition = TOOL_DEFINITIONS[toolName];
      this.server.registerTool(
        definition.name,
        {
          description: definition.description,
          inputSchema: definition.parameters,
        },
        definition.createHandler(perigon),
      );
    }

    // ── Signal Insights tools (always available) ──────────────────────────
    const activeSignalTools = requestedTools
      ? SIGNAL_TOOL_NAMES.filter((n) => requestedTools.includes(n))
      : [...SIGNAL_TOOL_NAMES];

    if (activeSignalTools.length === 0) return;

    // Register the chart viewer UI resource (MCP Apps / SEP-1865).
    // Hosts that support MCP Apps will render this HTML in a sandboxed iframe
    // after signal_insights_execute_code runs.
    this.server.registerResource(
      "signal-insights-chart-viewer",
      CHART_RESOURCE_URI,
      { mimeType: CHART_VIEWER_MIME_TYPE },
      () => ({
        contents: [
          {
            uri: CHART_RESOURCE_URI,
            mimeType: CHART_VIEWER_MIME_TYPE,
            text: CHART_VIEWER_HTML,
          },
        ],
      }),
    );

    const insightsApi = new InsightsApiClient(this.props!.apiKey);
    const pokeyClient = new PokeyInsightsClient(
      this.env.POKEY_SIGNAL_INSIGHTS_BASE_URL,
      this.props!.apiKey,
    );

    for (const toolName of activeSignalTools) {
      this.registerSignalTool(toolName, insightsApi, pokeyClient);
    }
  }

  private registerSignalTool(
    toolName: (typeof SIGNAL_TOOL_NAMES)[number],
    insightsApi: InsightsApiClient,
    pokeyClient: PokeyInsightsClient,
  ) {
    switch (toolName) {
      case "signal_insights_create_workspace":
        this.server.registerTool(
          "signal_insights_create_workspace",
          {
            description:
              "Create a new Signal Insights analysis workspace. " +
              "Call this ONCE at the beginning of any conversation that needs data analysis. " +
              "Returns a workspace handle required by all analysis tools (signal_insights_execute_code, signal_insights_shell, signal_insights_export_events, file tools). " +
              "Do NOT invent workspace IDs — always use the one returned here.",
            inputSchema: createWorkspaceSchema,
          },
          async () => pokeyClient.createWorkspace(),
        );
        break;

      case "signal_insights_search_signals":
        this.server.registerTool(
          "signal_insights_search_signals",
          {
            description:
              "Search for signals by name or monitoring objective. " +
              "Use this to find relevant signals before fetching data. " +
              "If the search query is not present, this can be used to list all available signals.",
            inputSchema: searchSignalsSchema,
          },
          async (args) => insightsApi.searchSignals(args),
        );
        break;

      case "signal_insights_read_signal":
        this.server.registerTool(
          "signal_insights_read_signal",
          {
            description:
              "Get full signal metadata including data schema, available event types, and event count. " +
              "Use before signal_insights_export_events to understand the available fields for a signal.",
            inputSchema: readSignalSchema,
          },
          async ({ signalUuid }) => insightsApi.readSignal(signalUuid),
        );
        break;

      case "signal_insights_export_events":
        this.server.registerTool(
          "signal_insights_export_events",
          {
            description:
              "Export signal events using a structured query API. No raw SQL — specify signals, fields, filters, aggregations, and ordering. " +
              "Returns a preview of the first rows plus an S3 file path for the full dataset (JSONL). " +
              "Available fields: eventType, eventDate, createdAt, updatedAt, summary, uuid, data, articles, signalId, or data.<path> for JSONB subfields (e.g. data.companyName). " +
              "Filter options: eventTypes (list), date ranges (eventDateFrom/To, createdAtFrom/To), JSONB containment (data: [{op: CONTAINS, value: {key: val}}]). " +
              "Select expressions: {type: 'field', name}, {type: 'date_trunc', granularity: HOUR|DAY|WEEK|MONTH|YEAR, field}, {type: 'agg', function: COUNT|COUNT_DISTINCT|SUM|AVG|MIN|MAX, field?}. " +
              "Group by / order by: use {index: N} (1-based) when select is provided, or {field: 'name'} when select is omitted. " +
              `Omit select to fetch all scalar event fields. Results are written to S3 and accessible in the sandbox at ${DATA_DIR}/<filename>.`,
            inputSchema: exportEventsSchema,
          },
          async (args) => pokeyClient.executeTool("export_events", args),
        );
        break;

      case "signal_insights_execute_code":
        // Use registerTool so we can attach _meta.ui.resourceUri for MCP Apps.
        // Hosts that support SEP-1865 will render the chart viewer iframe.
        this.server.registerTool(
          "signal_insights_execute_code",
          {
            description:
              "Execute Python code inside a persistent sandboxed Jupyter kernel (IPython). " +
              "State is fully preserved between calls: variables, imports, DataFrames, fitted models, and function definitions all remain in memory. " +
              `WORKSPACE (${WORKSPACE_DIR}): default working directory. Use this to create any files you need. ` +
              `DATA (${DATA_DIR}): S3-backed read-write directory. Query result files appear here automatically. This directory persists across sandbox restarts. ` +
              `OUTPUT (${OUTPUT_DIR}): write user-facing deliverables here (charts, reports, CSVs, exports). Files in output/ appear in the user's Artifacts panel and are downloadable. Internal/intermediate files should stay in DATA root. ` +
              "Pre-installed highlights: pandas, numpy, matplotlib, seaborn, scipy, scikit-learn, statsmodels, pyarrow, polars, openpyxl, sqlalchemy, beautifulsoup4, nltk, xgboost, lightgbm, shap, pillow, sympy, tabulate, rich. " +
              "CHARTS: Call plt.show() after any matplotlib chart — the chart is rendered interactively in the UI. One plt.show() per chart; for multiple charts call signal_insights_execute_code separately. " +
              "No outbound internet access except *.amazonaws.com.",
            inputSchema: executeCodeSchema,
            _meta: CHART_META,
          },
          async (args) => pokeyClient.executeTool("execute_code", args),
        );
        break;

      case "signal_insights_shell":
        this.server.registerTool(
          "signal_insights_shell",
          {
            description:
              "Run a bash command in the E2B sandbox environment. " +
              `Working directory is ${WORKSPACE_DIR}. ` +
              `Query data files are accessible at ${DATA_DIR}. No internet access except *.amazonaws.com.`,
            inputSchema: shellSchema,
          },
          async (args) => pokeyClient.executeTool("shell", args),
        );
        break;

      case "signal_insights_list_files":
        this.server.registerTool(
          "signal_insights_list_files",
          {
            description:
              "List files in a directory of the sandbox workspace. " +
              `Default directory is the workspace root (${WORKSPACE_DIR}).`,
            inputSchema: listFilesSchema,
          },
          async (args) => pokeyClient.executeTool("list", args),
        );
        break;

      case "signal_insights_grep":
        this.server.registerTool(
          "signal_insights_grep",
          {
            description:
              "Search a file's contents for lines matching a regex pattern. " +
              "Reads the file via the SDK (no shell injection risk). Returns matching lines with line numbers. " +
              "Use on files up to a few MB; for larger files, use signal_insights_execute_code directly instead.",
            inputSchema: grepSchema,
          },
          async (args) => pokeyClient.executeTool("grep", args),
        );
        break;

      case "signal_insights_read_file":
        this.server.registerTool(
          "signal_insights_read_file",
          {
            description:
              "Read a file from the sandbox workspace. " +
              "Internally, this reads the full file into memory. " +
              "Use on files up to a few MB; for larger files, use signal_insights_execute_code directly instead.",
            inputSchema: readFileSchema,
          },
          async (args) => pokeyClient.executeTool("read", args),
        );
        break;

      case "signal_insights_write_file":
        this.server.registerTool(
          "signal_insights_write_file",
          {
            description:
              "Write content to a file in the sandbox workspace. Creates directories as needed.",
            inputSchema: writeFileSchema,
          },
          async (args) => pokeyClient.executeTool("write", args),
        );
        break;

      case "signal_insights_str_replace":
        this.server.registerTool(
          "signal_insights_str_replace",
          {
            description:
              "Find and replace a string in a file in the sandbox workspace. " +
              "Internally, this reads the full file into memory. " +
              "Use on files up to a few MB; for larger files, use signal_insights_execute_code directly instead.",
            inputSchema: strReplaceSchema,
          },
          async (args) => pokeyClient.executeTool("str_replace", args),
        );
        break;
    }
  }
}
