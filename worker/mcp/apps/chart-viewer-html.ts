/**
 * Self-contained HTML for the Signal Insights chart viewer MCP App.
 *
 * Rendered in a sandboxed iframe by MCP Apps-capable hosts (Claude, VS Code,
 * ChatGPT, etc.). Receives chart data via ui/notifications/tool-result and
 * renders interactive ECharts or PNG fallback images.
 *
 * The buildOptions logic is ported from E2BChart.tsx — keep in sync when
 * chart types are added or changed there.
 */

import CHART_VIEWER_HTML from "../ui/chart-viewer.html?raw";

export { CHART_VIEWER_HTML };

export const CHART_VIEWER_MIME_TYPE = "text/html;profile=mcp-app";
export const CHART_RESOURCE_URI = "ui://signal-insights/chart-viewer.html";

// Per spec: tool _meta.ui should only contain resourceUri.
// CSP belongs in the resource content (resources/read response _meta.ui.csp).
export const CHART_TOOL_META = {
  ui: {
    resourceUri: CHART_RESOURCE_URI,
  },
} as const;

// CSP for the resource content (resources/read response).
export const CHART_RESOURCE_CONTENT_META = {
  ui: {
    csp: {
      resourceDomains: ["https://cdn.jsdelivr.net"], // ECharts CDN
    },
    prefersBorder: false,
  },
} as const;
