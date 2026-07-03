/**
 * Self-contained HTML for the Signal Insights chart viewer MCP App.
 *
 * Rendered in a sandboxed iframe by MCP Apps-capable hosts (Claude, VS Code,
 * ChatGPT, etc.). The HTML itself is a tiny shell — all logic (ECharts +
 * `@modelcontextprotocol/ext-apps` guest wiring) is built separately (see
 * `apps-src/chart-viewer/main.ts`, bundled by `vite.apps.config.ts`) and
 * served as a static asset via the Worker's ASSETS binding, NOT inlined into
 * this string. Inlining would bake ECharts into the ~1MB gzip Worker SCRIPT
 * bundle; static assets don't count toward that limit. See
 * apps-src/README.md for the full rationale.
 */
import CHART_VIEWER_TEMPLATE from "../ui/chart-viewer.template.html?raw";

export const CHART_VIEWER_MIME_TYPE = "text/html;profile=mcp-app";
export const CHART_RESOURCE_URI = "ui://signal-insights/chart-viewer";

/** Interpolates the environment-specific asset origin into the HTML shell. */
export function buildChartViewerHtml(appsBaseUrl: string): string {
  return CHART_VIEWER_TEMPLATE.replaceAll("__APPS_BASE_URL__", appsBaseUrl);
}

// Per spec: tool _meta.ui should only contain resourceUri.
// CSP belongs in the resource content (resources/read response _meta.ui.csp).
export const CHART_TOOL_META = {
  ui: {
    resourceUri: CHART_RESOURCE_URI,
  },
} as const;

/** CSP for the resource content (resources/read response). */
export function buildChartResourceContentMeta(appsBaseUrl: string) {
  return {
    ui: {
      csp: {
        // The guest JS bundle (ECharts + ext-apps App) is fetched from our
        // own asset origin, not a third-party CDN.
        resourceDomains: [appsBaseUrl],
      },
      prefersBorder: false,
    },
  } as const;
}
