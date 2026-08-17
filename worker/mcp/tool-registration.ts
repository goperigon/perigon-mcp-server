/**
 * Pure scope/profile → tool-name resolution, extracted from `mcp.ts` so it
 * can be unit-tested without importing `agents/mcp` (which pulls in
 * Cloudflare-runtime-only bindings unavailable under plain `bun test`).
 *
 * No I/O. No `any`.
 */
import { Scopes } from "../types/types";
import {
  newsArticlesTool,
  journalistsTool,
  newsStoriesTool,
  storyHistoryTool,
  summarizeTool,
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
import { resolveActiveTools } from "./tools/selection";

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

// These tools carry no `BillingPlan.Permission` gating of their own (the
// monitor write pair, the platform/watchlist/source-group/contact-point
// surface, and the extra read-only lookups), so any valid API key may use
// them — they are excluded from the default seed set purely to save
// always-on tokens (see MONITOR_READ_TOOL_NAMES comment above), not because
// a scope is missing. They must still be selectable via an explicit
// `?tools=` name or a named profile (`monitoring`, `platform`, `research`),
// so they are added to the candidate pool whenever a filter is requested,
// without ever appearing in the unfiltered default.
const OPT_IN_TOOL_NAMES = [
  "create_monitor",
  "update_monitor",
  "get_source_by_id",
  "get_top_topics",
  "get_story_stats",
  "watchlists",
  "create_watchlist",
  "update_watchlist",
  "source_groups",
  "create_source_group",
  "update_source_group",
  "contact_points",
  "article_refresh",
] as const satisfies readonly ToolName[];

/**
 * Returns a deduplicated list of tool names permitted by the given API key
 * scopes. `search_news_articles`, the read-only monitor tools, the always-on
 * stats tools, and the entitlement self-awareness tool are always included
 * regardless of scope. This is the *default* set used when no `?tools=`
 * filter is requested — see `OPT_IN_TOOL_NAMES` for tools deliberately left
 * out of this set but still selectable on request.
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

/**
 * Resolves the news/stats/monitor/platform tool set to register for a
 * session, given its scopes and the raw `?tools=` request (already expanded
 * from any named profile alias by `parseRequestedTools`).
 */
export function resolveNewsToolsForSession(
  scopes: Scopes[],
  requestedTools: string[] | null,
): ToolName[] {
  const allowedNewsTools = getAllowedToolsForScopes(scopes);
  if (!requestedTools || requestedTools.length === 0) return allowedNewsTools;
  // Opt-in tools are never part of the unfiltered default, but an explicit
  // request must still be able to select them since they carry no scope
  // restriction of their own — only widen the candidate pool here, where a
  // filter is actually present.
  return resolveActiveTools(
    [...allowedNewsTools, ...OPT_IN_TOOL_NAMES],
    requestedTools,
  );
}
