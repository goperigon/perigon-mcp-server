import type { Implementation } from "@modelcontextprotocol/sdk/types.js";

export const PERIGON_CLIENT_HEADER = "x-perigon-client";
export const PERIGON_MCP_TOOL_HEADER = "x-perigon-mcp-tool";
export const PERIGON_MCP_CLIENT_HEADER = "x-perigon-mcp-client";

const MCP_CLIENT_VALUE = "mcp";

export function buildMcpTelemetryHeaders(args: {
  toolName?: string;
  clientInfo?: Implementation;
}): Record<string, string> {
  const headers: Record<string, string> = {
    [PERIGON_CLIENT_HEADER]: MCP_CLIENT_VALUE,
  };

  if (args.toolName) {
    headers[PERIGON_MCP_TOOL_HEADER] = args.toolName;
  }

  const clientInfo = args.clientInfo;
  if (clientInfo?.name) {
    const version = clientInfo.version?.trim();
    const raw = version ? `${clientInfo.name}/${version}` : clientInfo.name;
    headers[PERIGON_MCP_CLIENT_HEADER] = normalizeMcpClientHeader(raw);
  }

  return headers;
}

function normalizeMcpClientHeader(value: string): string {
  const printable = value.replace(/[^\x20-\x7E]/g, "_");
  const sanitized = printable.replace(/[^A-Za-z0-9 ._/@()-]/g, "_");
  return sanitized.slice(0, 100);
}
