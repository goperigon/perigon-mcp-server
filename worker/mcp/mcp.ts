import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAppResource, registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { Scopes } from "../types/types";
import {
  newsArticlesTool,
  journalistsTool,
  newsStoriesTool,
  storyHistoryTool,
  summarizeTool,
  TOOL_DEFINITIONS,
  type ToolName,
  sourcesTool,
  peopleTool,
  personNewsTool,
  companiesTool,
  companyNewsTool,
  topicsTool,
  wikipediaTool,
  wikipediaVectorTool,
  locationNewsTool,
  newsVectorTool,
} from "./tools";
import { Perigon } from "../lib/perigon";
import { resolveActiveTools, SIGNAL_TOOL_NAMES } from "./tools/selection";
import { InsightsApiClient } from "../lib/insights-api-client";
import { PokeyInsightsClient } from "../lib/pokey-insights-client";
import {
  buildChartViewerHtml,
  CHART_VIEWER_MIME_TYPE,
  CHART_RESOURCE_URI,
  buildChartResourceContentMeta,
} from "./apps/chart-viewer-html";
import {
  buildExportViewerHtml,
  EXPORT_VIEWER_MIME_TYPE,
  EXPORT_RESOURCE_URI,
  buildExportResourceContentMeta,
} from "./apps/export-viewer-html";
import { SIGNAL_TOOL_DEFINITIONS } from "./tools/signals";
import * as instructions from "./instructions";
import { SignalToolDefinition } from "./tools/signals/types";

/** Type guard: does this signal tool's `_meta` declare an MCP Apps UI resource? */
function hasUiResource(
  meta: Record<string, unknown> | undefined,
): meta is { ui: { resourceUri: string } } {
  const ui = (meta as { ui?: { resourceUri?: unknown } } | undefined)?.ui;
  return typeof ui?.resourceUri === "string";
}

export type Props = {
  apiKey: string;
  scopes: Scopes[];
  requestedTools: string[] | null;
  organizationId: number;
};

// Map scopes to tool names
const SCOPE_TO_TOOLS: Partial<Record<Scopes, ToolName[]>> = {
  [Scopes.CLUSTERS]: [newsStoriesTool.name, storyHistoryTool.name],
  [Scopes.SEARCH_SUMMARY]: [summarizeTool.name],
  [Scopes.JOURNALISTS]: [journalistsTool.name],
  [Scopes.SOURCES]: [sourcesTool.name],
  [Scopes.PEOPLE]: [peopleTool.name, personNewsTool.name],
  [Scopes.COMPANIES]: [companiesTool.name, companyNewsTool.name],
  [Scopes.TOPICS]: [topicsTool.name],
  [Scopes.LOCATIONS]: [locationNewsTool.name],
  [Scopes.WIKIPEDIA]: [wikipediaTool.name],
  [Scopes.VECTOR_SEARCH_NEWS]: [newsVectorTool.name],
  [Scopes.VECTOR_SEARCH_WIKIPEDIA]: [wikipediaVectorTool.name],
};

/**
 * Returns a deduplicated list of tool names permitted by the given API key
 * scopes. `search_news_articles` is always included regardless of scope.
 */
function getAllowedToolsForScopes(scopes: Scopes[]): ToolName[] {
  const seen = new Set<ToolName>([newsArticlesTool.name]);
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

export class PerigonMCP extends McpAgent<Env, unknown, Props> {
  // Type assertion needed: agents bundles its own @modelcontextprotocol/sdk copy
  server = new McpServer(
    {
      name: "Perigon News API",
      version: "1.0.0",
    },
    { instructions: instructions.MCP_INSTRUCTIONS },
  );

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

    // Register the chart/table viewer UI resources (MCP Apps / SEP-1865) via
    // the official ext-apps/server helpers. Hosts that support MCP Apps will
    // render this HTML in a sandboxed iframe after the corresponding tool
    // runs. Per SEP-1865: CSP belongs in resources/read content _meta.ui.csp.
    const appsBaseUrl = this.env.APPS_BASE_URL;

    registerAppResource(
      this.server,
      "signal-insights-chart-viewer",
      CHART_RESOURCE_URI,
      { mimeType: CHART_VIEWER_MIME_TYPE },
      () => ({
        contents: [
          {
            uri: CHART_RESOURCE_URI,
            mimeType: CHART_VIEWER_MIME_TYPE,
            text: buildChartViewerHtml(appsBaseUrl),
            _meta: buildChartResourceContentMeta(appsBaseUrl),
          },
        ],
      }),
    );

    registerAppResource(
      this.server,
      "signal-insights-export-viewer",
      EXPORT_RESOURCE_URI,
      { mimeType: EXPORT_VIEWER_MIME_TYPE },
      () => ({
        contents: [
          {
            uri: EXPORT_RESOURCE_URI,
            mimeType: EXPORT_VIEWER_MIME_TYPE,
            text: buildExportViewerHtml(appsBaseUrl),
            _meta: buildExportResourceContentMeta(appsBaseUrl),
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
      const def: SignalToolDefinition<any> = SIGNAL_TOOL_DEFINITIONS[toolName];
      const handler = def.createHandler(insightsApi, pokeyClient);

      // Tools that render an MCP Apps UI (preview_chart, export_events) go
      // through registerAppTool so hosts get the resourceUri association;
      // everything else is a plain tool.
      if (hasUiResource(def._meta)) {
        registerAppTool(
          this.server,
          def.name,
          {
            description: def.description,
            inputSchema: def.parameters,
            _meta: def._meta,
          },
          handler,
        );
      } else {
        this.server.registerTool(
          def.name,
          {
            description: def.description,
            inputSchema: def.parameters,
          },
          handler,
        );
      }
    }
  }
}
