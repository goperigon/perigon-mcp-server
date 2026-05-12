import { TOOL_DEFINITIONS, type ToolName } from "./index";

/**
 * Reads the tool-filter query parameter from a URL, accepting both `?tool=`
 * and `?tools=` (alias). `tool` takes precedence when both are present.
 */
export function resolveToolParam(url: URL): string | null {
  return url.searchParams.get("tool") ?? url.searchParams.get("tools");
}

/**
 * Parses the raw `?tool=` (or `?tools=`) query parameter value into a
 * validated list of known tool names.
 *
 * Returns `null` in three cases:
 *   - the parameter is absent (`null` input)
 *   - the parameter is an empty string
 *   - all provided names are unknown (prevents accidental total lockout)
 *
 * Unknown names mixed with valid names are silently dropped, so callers
 * receive only the subset they can actually use.
 */
export function parseRequestedTools(param: string | null): ToolName[] | null {
  if (!param) return null;

  const candidates = param
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const valid = candidates.filter(
    (name): name is ToolName => name in TOOL_DEFINITIONS
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
  requestedTools: ToolName[] | null
): ToolName[] {
  if (!requestedTools || requestedTools.length === 0) return allowedTools;
  const requested = new Set<string>(requestedTools);
  return allowedTools.filter((name) => requested.has(name));
}
