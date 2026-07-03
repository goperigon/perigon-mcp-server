/**
 * Self-contained HTML for the Signal Insights export/table viewer MCP App.
 * See chart-viewer-html.ts for the "shell HTML + static asset JS" rationale.
 */
import EXPORT_VIEWER_TEMPLATE from "../ui/export-viewer.template.html?raw";

export const EXPORT_VIEWER_MIME_TYPE = "text/html;profile=mcp-app";
export const EXPORT_RESOURCE_URI = "ui://signal-insights/export-viewer";

export function buildExportViewerHtml(appsBaseUrl: string): string {
  return EXPORT_VIEWER_TEMPLATE.replaceAll("__APPS_BASE_URL__", appsBaseUrl);
}

export const EXPORT_TOOL_META = {
  ui: {
    resourceUri: EXPORT_RESOURCE_URI,
  },
} as const;

export function buildExportResourceContentMeta(appsBaseUrl: string) {
  return {
    ui: {
      csp: {
        resourceDomains: [appsBaseUrl],
      },
      prefersBorder: false,
    },
  } as const;
}
