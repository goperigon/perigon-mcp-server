import EXPORT_VIEWER_HTML from "../ui/export-viewer.html?raw";

export { EXPORT_VIEWER_HTML };

export const EXPORT_VIEWER_MIME_TYPE = "text/html;profile=mcp-app";
export const EXPORT_RESOURCE_URI = "ui://signal-insights/export-viewer";

export const EXPORT_TOOL_META = {
  ui: {
    resourceUri: EXPORT_RESOURCE_URI,
  },
} as const;

export const EXPORT_RESOURCE_CONTENT_META = {
  ui: {
    csp: {
      resourceDomains: [],
    },
    prefersBorder: false,
  },
} as const;
