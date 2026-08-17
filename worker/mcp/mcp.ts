import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
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
  avgSentimentTool,
  articleCountsTool,
  topEntitiesTool,
  topPeopleTool,
  topCompaniesTool,
  apiAccessTool,
} from "./tools";
import { Perigon } from "../lib/perigon";
import { resolveActiveTools, SIGNAL_TOOL_NAMES } from "./tools/selection";
import { InsightsApiClient } from "../lib/insights-api-client";
import { PokeyInsightsClient } from "../lib/pokey-insights-client";
import {
  CHART_VIEWER_HTML,
  CHART_VIEWER_MIME_TYPE,
  CHART_RESOURCE_URI,
  CHART_RESOURCE_CONTENT_META,
} from "./apps/chart-viewer-html";
import {
  EXPORT_VIEWER_HTML,
  EXPORT_VIEWER_MIME_TYPE,
  EXPORT_RESOURCE_URI,
  EXPORT_RESOURCE_CONTENT_META,
} from "./apps/export-viewer-html";
import { SIGNAL_TOOL_DEFINITIONS } from "./tools/signals";
import * as instructions from "./instructions";
import { SignalToolDefinition } from "./tools/signals/types";
import { deriveCapabilities, entitlementNoteForTool } from "./capabilities";
import {
  FIELDS_RESOURCE_URI,
  CHAINING_RESOURCE_URI,
  ENTITLEMENTS_RESOURCE_URI,
  CHARTS_RESOURCE_URI,
  FIELDS_REFERENCE,
  CHAINING_REFERENCE,
  CHARTS_REFERENCE,
  renderEntitlementsReference,
} from "./reference-resources";
import { registerResearchPrompts } from "./prompts";

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

// Read-only monitor tools stay always-on. The two write tools cost about
// 5,550 always-on tokens between them (large shared monitor query schema)
// and most sessions never call them, so they move to the `monitoring`
// profile instead (see tools/selection.ts) rather than the always-on seed set.
const MONITOR_READ_TOOL_NAMES = [
  "list_monitors",
  "get_monitor",
  "get_monitor_events",
  "get_monitor_newsletters",
  "get_monitor_summaries",
  "set_monitor_status",
] as const satisfies readonly ToolName[];

// `StatsController` performs no permission check upstream — these five
// endpoints need only a valid key plus quota, so they belong in the
// always-on seed set rather than gated behind ENTITIES/SENTIMENTS.
const STATS_TOOL_NAMES = [
  avgSentimentTool.name,
  articleCountsTool.name,
  topEntitiesTool.name,
  topPeopleTool.name,
  topCompaniesTool.name,
] as const satisfies readonly ToolName[];

/**
 * Returns a deduplicated list of tool names permitted by the given API key
 * scopes. `search_news_articles`, the read-only monitor tools, the always-on
 * stats tools, and the entitlement self-awareness tool are always included
 * regardless of scope.
 */
function getAllowedToolsForScopes(scopes: Scopes[]): ToolName[] {
  const seen = new Set<ToolName>([
    newsArticlesTool.name,
    ...MONITOR_READ_TOOL_NAMES,
    ...STATS_TOOL_NAMES,
    apiAccessTool.name,
  ]);
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

  // registerTool() throws if the same name is registered twice. Tracked
  // separately so one misconfigured entry skips a duplicate instead of
  // aborting init() and leaving the session with no tools at all.
  private readonly registeredToolNames = new Set<ToolName>();

  async init() {
    const perigon = new Perigon(this.props!.apiKey);
    const { scopes, requestedTools } = this.props!;

    // ── News tools (existing) ──────────────────────────────────────────────
    const allowedNewsTools = getAllowedToolsForScopes(scopes);
    const activeNewsTools = resolveActiveTools(
      allowedNewsTools,
      requestedTools,
    );

    // Computed once per session from the already-known scopes (no extra
    // network call) and used to append session-specific entitlement notes
    // to tool descriptions below.
    const capabilityReport = deriveCapabilities(scopes);

    for (const toolName of activeNewsTools) {
      this.registerNewsTool(toolName, perigon, capabilityReport);
    }

    this.registerReferenceResources(capabilityReport);
    registerResearchPrompts(this.server);

    // ── Signal Insights tools (always available) ──────────────────────────
    const activeSignalTools = requestedTools
      ? SIGNAL_TOOL_NAMES.filter((n) => requestedTools.includes(n))
      : [...SIGNAL_TOOL_NAMES];

    if (activeSignalTools.length === 0) return;

    // Register the chart viewer UI resource (MCP Apps / SEP-1865).
    // Hosts that support MCP Apps will render this HTML in a sandboxed iframe
    // after signal_insights_preview_chart runs.
    // Per SEP-1865: CSP belongs in resources/read content _meta.ui.csp.
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
            _meta: CHART_RESOURCE_CONTENT_META,
          },
        ],
      }),
    );

    this.server.registerResource(
      "signal-insights-export-viewer",
      EXPORT_RESOURCE_URI,
      { mimeType: EXPORT_VIEWER_MIME_TYPE },
      () => ({
        contents: [
          {
            uri: EXPORT_RESOURCE_URI,
            mimeType: EXPORT_VIEWER_MIME_TYPE,
            text: EXPORT_VIEWER_HTML,
            _meta: EXPORT_RESOURCE_CONTENT_META,
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
      this.server.registerTool(
        def.name,
        {
          description: def.description,
          inputSchema: def.parameters,
          _meta: def._meta,
        },
        def.createHandler(insightsApi, pokeyClient),
      );
    }
  }

  /**
   * Registers the four on-demand reference resources. `entitlements` is
   * rendered per session from the already-derived capability report so it
   * reflects this key's actual scopes; the other three are static content
   * moved out of `MCP_INSTRUCTIONS` to keep the always-on router small.
   */
  private registerReferenceResources(
    capabilityReport: ReturnType<typeof deriveCapabilities>,
  ): void {
    const registerText = (name: string, uri: string, text: string) => {
      this.server.registerResource(name, uri, { mimeType: "text/markdown" }, () => ({
        contents: [{ uri, mimeType: "text/markdown", text }],
      }));
    };

    registerText("perigon-reference-fields", FIELDS_RESOURCE_URI, FIELDS_REFERENCE);
    registerText(
      "perigon-reference-chaining",
      CHAINING_RESOURCE_URI,
      CHAINING_REFERENCE,
    );
    registerText("perigon-reference-charts", CHARTS_RESOURCE_URI, CHARTS_REFERENCE);
    registerText(
      "perigon-reference-entitlements",
      ENTITLEMENTS_RESOURCE_URI,
      renderEntitlementsReference(capabilityReport),
    );
  }

  private registerNewsTool(
    toolName: ToolName,
    perigon: Perigon,
    capabilityReport: ReturnType<typeof deriveCapabilities>,
  ): void {
    if (this.registeredToolNames.has(toolName)) return;
    this.registeredToolNames.add(toolName);

    const definition = TOOL_DEFINITIONS[toolName];
    const entitlementNote = entitlementNoteForTool(toolName, capabilityReport);
    const description = entitlementNote
      ? `${definition.description} ${entitlementNote}`
      : definition.description;

    this.server.registerTool(
      definition.name,
      {
        title: definition.title,
        description,
        inputSchema: definition.parameters,
        annotations: definition.annotations,
      },
      definition.createHandler(perigon),
    );
  }
}
