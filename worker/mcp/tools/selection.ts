import { TOOL_DEFINITIONS, type ToolName } from "./index";
import { SIGNAL_TOOL_DEFINITIONS } from "./signals";

export const SIGNAL_TOOL_NAMES = Object.keys(
  SIGNAL_TOOL_DEFINITIONS,
) as readonly SignalToolName[];

export type SignalToolName = keyof typeof SIGNAL_TOOL_DEFINITIONS;

// Signal tool names are also in TOOL_DEFINITIONS; Object.keys covers both.
const ALL_KNOWN_TOOL_NAMES = new Set(
  Object.keys(TOOL_DEFINITIONS) as ToolName[],
);

/**
 * Named subsets of `TOOL_DEFINITIONS`, keyed by lowercase alias, so a host
 * can register a curated set (e.g. via `?tools=research`) without changing
 * scope gating — `resolveActiveTools` still intersects with what the API
 * key's scopes actually allow, so a profile can never expand access.
 */
const RESEARCH_TOOL_NAMES: ToolName[] = [
  "search_news_articles",
  "search_news_stories",
  "search_story_history",
  "search_vector_news",
  "summarize_news",
  "search_journalists",
  "search_sources",
  "search_people",
  "search_companies",
  "search_topics",
  "get_avg_sentiment",
  "get_article_counts",
  "get_top_entities",
  "get_top_people",
  "get_top_companies",
  "get_top_topics",
  "get_source_by_id",
  "get_api_access",
];

const MONITORING_TOOL_NAMES: ToolName[] = [
  "list_monitors",
  "get_monitor",
  "get_monitor_events",
  "get_monitor_newsletters",
  "get_monitor_summaries",
  "create_monitor",
  "update_monitor",
  "set_monitor_status",
  ...(SIGNAL_TOOL_NAMES as readonly ToolName[]),
];

const PLATFORM_TOOL_NAMES: ToolName[] = [
  "watchlists",
  "create_watchlist",
  "update_watchlist",
  "source_groups",
  "create_source_group",
  "update_source_group",
  "contact_points",
  "article_refresh",
  "get_api_access",
];

const MINIMAL_TOOL_NAMES: ToolName[] = [
  "search_news_articles",
  "get_avg_sentiment",
  "get_article_counts",
  "get_top_entities",
  "get_top_people",
  "get_top_companies",
  "get_api_access",
];

export const TOOL_PROFILES: Record<string, ToolName[]> = {
  research: RESEARCH_TOOL_NAMES,
  monitoring: MONITORING_TOOL_NAMES,
  platform: PLATFORM_TOOL_NAMES,
  minimal: MINIMAL_TOOL_NAMES,
};

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
 * Accepts explicit tool names, named profile aliases (`research`,
 * `monitoring`, `platform`, `minimal`), or a mix of both — profile aliases
 * expand to their underlying tool list before validation.
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
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const expanded = candidates.flatMap((name) => TOOL_PROFILES[name] ?? [name]);

  const valid = expanded.filter((name): name is ToolName =>
    ALL_KNOWN_TOOL_NAMES.has(name as ToolName),
  );

  return valid.length > 0 ? [...new Set(valid)] : null;
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
