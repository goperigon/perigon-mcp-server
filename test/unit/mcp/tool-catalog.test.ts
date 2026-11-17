import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MCP_TOOLS } from "../../../src/lib/mcp-tools";
import {
  OPT_IN_TOOL_NAMES,
  resolveNewsToolsForSession,
  SCOPE_TO_TOOLS,
} from "../../../worker/mcp/tool-registration";
import { TOOL_DEFINITIONS } from "../../../worker/mcp/tools";
import { SIGNAL_TOOL_NAMES } from "../../../worker/mcp/tools/selection";
import {
  SOCIAL_TOOL_NAMES,
  SOCIAL_TOOL_SOURCES,
  type SocialToolName,
} from "../../../worker/mcp/tools/social";

/**
 * Keeps the tool registry, the session tiers in tool-registration.ts, the
 * README tool tables, and the playground list in sync. A new or renamed tool
 * fails here until every catalogue is updated (see AGENTS.md).
 */

const README = readFileSync(join(import.meta.dir, "../../../README.md"), "utf8");

const ALL_TOOL_NAMES: string[] = [
  ...Object.keys(TOOL_DEFINITIONS),
  ...SOCIAL_TOOL_NAMES,
];

const DEFAULT_SEED = new Set<string>(resolveNewsToolsForSession([], null));
const OPT_IN = new Set<string>(OPT_IN_TOOL_NAMES);
const SIGNAL = new Set<string>(SIGNAL_TOOL_NAMES);
const SOCIAL = new Set<string>(SOCIAL_TOOL_NAMES);

function scopeFor(name: string): string | undefined {
  for (const [scope, tools] of Object.entries(SCOPE_TO_TOOLS)) {
    if (tools?.includes(name)) return scope;
  }
  return undefined;
}

/** The README Availability value each tool's session tier must match. */
function expectedAvailability(name: string): string[] {
  const expected: string[] = [];
  if (DEFAULT_SEED.has(name) || SIGNAL.has(name)) expected.push("Default");
  const scope = scopeFor(name);
  if (scope) expected.push(`Scope: \`${scope}\``);
  if (OPT_IN.has(name)) expected.push("Opt-in");
  if (SOCIAL.has(name)) {
    expected.push(
      `Social: \`${SOCIAL_TOOL_SOURCES[name as SocialToolName]}\``,
    );
  }
  return expected;
}

const AVAILABILITY_PATTERN = /^(Default|Scope: |Opt-in|Social: )/;

/** Tool name → Availability cell, from README table rows such as `| \`name\` | Opt-in | ... |`. */
function readmeAvailability(): Map<string, string> {
  const rows = new Map<string, string>();
  for (const line of README.split("\n")) {
    if (!line.startsWith("|")) continue;
    const cells = line.split("|").map((cell) => cell.trim());
    const availability = cells[2] ?? "";
    if (!AVAILABILITY_PATTERN.test(availability)) continue;
    for (const match of (cells[1] ?? "").matchAll(/`([a-z0-9_]+)`/g)) {
      rows.set(match[1], availability);
    }
  }
  return rows;
}

describe("tool catalogue", () => {
  test("every tool belongs to exactly one session tier", () => {
    for (const name of ALL_TOOL_NAMES) {
      expect(expectedAvailability(name), name).toHaveLength(1);
    }
  });

  test("every tool has a README row whose availability matches its tier", () => {
    const rows = readmeAvailability();
    for (const name of ALL_TOOL_NAMES) {
      const availability = rows.get(name);
      expect(availability, `README row for ${name}`).toBeDefined();
      expect(
        availability?.startsWith(expectedAvailability(name)[0]),
        `${name}: README says "${availability}", expected "${expectedAvailability(name)[0]}"`,
      ).toBe(true);
    }
  });

  test("README tool tables name only registered tools", () => {
    const registered = new Set(ALL_TOOL_NAMES);
    for (const name of readmeAvailability().keys()) {
      expect(registered.has(name), `${name} is not a registered tool`).toBe(
        true,
      );
    }
  });

  test("playground tool list matches TOOL_DEFINITIONS", () => {
    expect(MCP_TOOLS.map((t) => t.name).sort()).toEqual(
      Object.keys(TOOL_DEFINITIONS).sort(),
    );
  });
});
