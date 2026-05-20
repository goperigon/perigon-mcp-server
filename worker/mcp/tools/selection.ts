import { TOOL_DEFINITIONS, type ToolName } from "./index";

/** All signal tool names. These are always available to any valid API key. */
export const SIGNAL_TOOL_NAMES = [
  "signal_insights_create_workspace",
  "signal_insights_search_signals",
  "signal_insights_read_signal",
  "signal_insights_execute_code",
  "signal_insights_shell",
  "signal_insights_export_events",
  "signal_insights_list_files",
  "signal_insights_grep",
  "signal_insights_read_file",
  "signal_insights_write_file",
  "signal_insights_str_replace",
] as const;

export type SignalToolName = (typeof SIGNAL_TOOL_NAMES)[number];

const ALL_KNOWN_TOOL_NAMES = new Set<string>([
  ...Object.keys(TOOL_DEFINITIONS),
  ...SIGNAL_TOOL_NAMES,
]);

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

  const valid = candidates.filter((name) => ALL_KNOWN_TOOL_NAMES.has(name));

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
  requestedTools: ToolName[] | null,
): ToolName[] {
  if (!requestedTools || requestedTools.length === 0) return allowedTools;
  const requested = new Set<string>(requestedTools);
  return allowedTools.filter((name) => requested.has(name));
}
