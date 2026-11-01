import {
  TOOL_DEFINITIONS,
  type ToolName,
  newsArticlesTool,
  newsStoriesTool,
  storyHistoryTool,
  summarizeTool,
  journalistsTool,
  sourcesTool,
  peopleTool,
  personNewsTool,
  companiesTool,
  companyNewsTool,
  topicsTool,
  locationNewsTool,
  wikipediaTool,
  newsVectorTool,
  wikipediaVectorTool,
  avgSentimentTool,
  articleCountsTool,
  topEntitiesTool,
  topPeopleTool,
  topCompaniesTool,
} from "./index";
import { SIGNAL_TOOL_DEFINITIONS } from "./signals";
import { Scopes } from "../../types/types";

export const SIGNAL_TOOL_NAMES = Object.keys(
  SIGNAL_TOOL_DEFINITIONS,
) as readonly SignalToolName[];

export type SignalToolName = keyof typeof SIGNAL_TOOL_DEFINITIONS;

// Signal tool names are also in TOOL_DEFINITIONS; Object.keys covers both.
const ALL_KNOWN_TOOL_NAMES = new Set(
  Object.keys(TOOL_DEFINITIONS) as ToolName[],
);

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

const MONITOR_TOOL_NAMES = [
  "list_monitors",
  "get_monitor",
  "get_monitor_events",
  "get_monitor_newsletters",
  "get_monitor_summaries",
  "create_monitor",
  "update_monitor",
  "set_monitor_status",
] as const satisfies readonly ToolName[];

// /v1/stats/* only requires a valid API key, so these are not scope-gated.
export const STATS_TOOL_NAMES = [
  avgSentimentTool.name,
  articleCountsTool.name,
  topEntitiesTool.name,
  topPeopleTool.name,
  topCompaniesTool.name,
] as const satisfies readonly ToolName[];

/**
 * Returns a deduplicated list of tool names permitted by the given API key
 * scopes. `search_news_articles`, stats tools, and monitor tools are always
 * included regardless of scope.
 */
export function getAllowedToolsForScopes(scopes: Scopes[]): ToolName[] {
  const seen = new Set<ToolName>([
    newsArticlesTool.name,
    ...STATS_TOOL_NAMES,
    ...MONITOR_TOOL_NAMES,
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

/**
 * Reads the tool-filter query parameter from a URL, accepting both `?tool=`
 * and `?tools=` (alias). `tool` takes precedence when both are present.
 */
export function resolveToolParam(url: URL): string | null {
  return url.searchParams.get("tool") ?? url.searchParams.get("tools");
}

/**
 * Parses the raw `?tool=` (or `?tools=`) query parameter value into a
 * validated list of known tool names (news tools and signal tools).
 *
 * Returns `null` in four cases (all meaning "no filter — use all permitted tools"):
 *   - the parameter is absent (`null` input)
 *   - the parameter is an empty string
 *   - the parameter value is `"all"` (explicit alias for all tools)
 *   - all provided names are unknown (prevents accidental total lockout)
 *
 * Unknown names mixed with valid names are silently dropped, so callers
 * receive only the subset they can actually use.
 */
export function parseRequestedTools(param: string | null): ToolName[] | null {
  if (!param) return null;
  if (param.trim().toLowerCase() === "all") return null;

  const candidates = param
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const valid = candidates.filter((name): name is ToolName =>
    ALL_KNOWN_TOOL_NAMES.has(name as ToolName),
  );

  return valid.length > 0 ? valid : null;
}

/**
 * Filters `allowedTools` down to the intersection with `requestedTools`.
 *
 * - `requestedTools === null` → all allowed tools pass through (no filter)
 * - `requestedTools` is an empty array → treated as no filter (all pass through)
 *
 * This preserves scope-based access control: callers can only select tools
 * they already have access to; the parameter cannot expand access.
 */
export function resolveActiveTools(
  allowedTools: ToolName[],
  requestedTools: string[] | null,
): ToolName[] {
  if (!requestedTools || requestedTools.length === 0) return allowedTools;
  const requested = new Set<string>(requestedTools);
  return allowedTools.filter((name) => requested.has(name));
}
