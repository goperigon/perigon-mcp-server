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

export const CHART_META = {
  ui: {
    resourceUri: CHART_RESOURCE_URI,
    csp: {
      resourceDomains: ["cdn.jsdelivr.net"], // for loading ECharts script
      connectDomains: [], // no external API calls from widget
    },
  },
} as const;
