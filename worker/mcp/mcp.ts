import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Scopes, SocialSource } from "../types/types";
import { TOOL_DEFINITIONS, type ToolDefinition, type ToolName } from "./tools";
import { Perigon } from "../lib/perigon";
import { buildMcpTelemetryHeaders } from "../lib/telemetry-headers";
import { SIGNAL_TOOL_NAMES } from "./tools/selection";
import {
  resolveNewsToolsForSession,
  resolveSocialToolsForSession,
} from "./tool-registration";
import { SOCIAL_TOOL_DEFINITIONS } from "./tools/social";
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
import {
  buildNewsToolRegisterConfig,
  buildSignalToolRegisterConfig,
} from "./register-tool-config";

export type Props = {
  apiKey: string;
  /** Resolved Perigon API base URL (may differ from env when prod host has dev vars). */
  perigonApiUrl: string;
  scopes: Scopes[];
  /** Social sources the organization can use; gates the social tools. */
  socialSources: SocialSource[];
  requestedTools: string[] | null;
  /** When true, `?tools=all` — default scope tools plus opt-in catalogue tools. */
  explicitAllTools: boolean;
  organizationId: number;
};

export class PerigonMCP extends McpAgent<Env, unknown, Props> {
  // Type assertion needed: agents bundles its own @modelcontextprotocol/sdk copy
  server = new McpServer(
    {
      name: "Perigon",
      version: "1.0.0",
    },
    { instructions: instructions.MCP_INSTRUCTIONS },
  );

  // registerTool() throws if the same name is registered twice. Tracked
  // separately so one misconfigured entry skips a duplicate instead of
  // aborting init() and leaving the session with no tools at all.
  private readonly registeredToolNames = new Set<string>();

  async init() {
    const { scopes, socialSources, requestedTools, explicitAllTools } =
      this.props!;

    // ── News tools (existing) ──────────────────────────────────────────────
    const activeNewsTools = resolveNewsToolsForSession(
      scopes,
      requestedTools,
      explicitAllTools,
    );

    // Computed once per session from the already-known scopes (no extra
    // network call) and used to append session-specific entitlement notes
    // to tool descriptions below.
    const capabilityReport = deriveCapabilities(scopes);

    for (const toolName of activeNewsTools) {
      this.registerNewsTool(toolName, capabilityReport);
    }

    // ── Social tools (only for organizations with the social source) ──────
    // `socialSources` is absent on props persisted before it existed.
    for (const toolName of resolveSocialToolsForSession(
      socialSources ?? [],
      requestedTools,
    )) {
      const definition = SOCIAL_TOOL_DEFINITIONS[toolName];
      this.registerPerigonTool(definition, definition.description);
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

    const pokeyClient = new PokeyInsightsClient(
      this.env.POKEY_SIGNAL_INSIGHTS_BASE_URL,
      this.props!.apiKey,
    );

    for (const toolName of activeSignalTools) {
      const def: SignalToolDefinition<any> = SIGNAL_TOOL_DEFINITIONS[toolName];
      const insightsApi = new InsightsApiClient(
        this.props!.apiKey,
        undefined,
        this.props!.perigonApiUrl,
        () =>
          buildMcpTelemetryHeaders({
            toolName,
            clientInfo: this.server.server.getClientVersion(),
          }),
      );
      this.server.registerTool(
        def.name,
        buildSignalToolRegisterConfig(def),
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
      this.server.registerResource(
        name,
        uri,
        { mimeType: "text/markdown" },
        () => ({
          contents: [{ uri, mimeType: "text/markdown", text }],
        }),
      );
    };

    registerText(
      "perigon-reference-fields",
      FIELDS_RESOURCE_URI,
      FIELDS_REFERENCE,
    );
    registerText(
      "perigon-reference-chaining",
      CHAINING_RESOURCE_URI,
      CHAINING_REFERENCE,
    );
    registerText(
      "perigon-reference-charts",
      CHARTS_RESOURCE_URI,
      CHARTS_REFERENCE,
    );
    registerText(
      "perigon-reference-entitlements",
      ENTITLEMENTS_RESOURCE_URI,
      renderEntitlementsReference(capabilityReport),
    );
  }

  private registerNewsTool(
    toolName: ToolName,
    capabilityReport: ReturnType<typeof deriveCapabilities>,
  ): void {
    const definition = TOOL_DEFINITIONS[toolName];
    const entitlementNote = entitlementNoteForTool(toolName, capabilityReport);
    const description = entitlementNote
      ? `${definition.description} ${entitlementNote}`
      : definition.description;
    this.registerPerigonTool(definition, description);
  }

  /** Registers a tool backed by the Perigon REST API client. */
  private registerPerigonTool(
    definition: ToolDefinition,
    description: string,
  ): void {
    const toolName = definition.name;
    if (this.registeredToolNames.has(toolName)) return;
    this.registeredToolNames.add(toolName);

    const perigon = new Perigon(
      this.props!.apiKey,
      this.props!.perigonApiUrl,
      () =>
        buildMcpTelemetryHeaders({
          toolName,
          clientInfo: this.server.server.getClientVersion(),
        }),
    );

    this.server.registerTool(
      definition.name,
      buildNewsToolRegisterConfig(definition, description),
      definition.createHandler(perigon),
    );
  }
}
