/**
 * Maps an MCP HTTP request URL to the news/monitor/platform tool names
 * registered for the session. Shared by `loadMcpProps` and unit tests so
 * `?tools=all` wiring cannot drift from registration.
 */
import { Scopes } from "../types/types";
import { resolveNewsToolsForSession } from "./tool-registration";
import type { ToolName } from "./tools";
import {
  isExplicitAllToolsRequest,
  parseRequestedTools,
  resolveToolParam,
} from "./tools/selection";

export type McpRequestToolFilter = {
  requestedTools: string[] | null;
  explicitAllTools: boolean;
};

export function parseMcpToolFilterFromRequest(
  requestUrl: string | URL,
): McpRequestToolFilter {
  const toolParam = resolveToolParam(new URL(requestUrl));
  const explicitAllTools = isExplicitAllToolsRequest(toolParam);
  const requestedTools = explicitAllTools
    ? null
    : parseRequestedTools(toolParam);
  return { requestedTools, explicitAllTools };
}

export function resolveAdvertisedNewsToolsForRequest(
  requestUrl: string | URL,
  scopes: Scopes[],
): ToolName[] {
  const { requestedTools, explicitAllTools } =
    parseMcpToolFilterFromRequest(requestUrl);
  return resolveNewsToolsForSession(
    scopes,
    requestedTools,
    explicitAllTools,
  );
}
