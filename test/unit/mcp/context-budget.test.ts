import { describe, expect, test } from "bun:test";
import { zodToJsonSchema } from "zod-to-json-schema";
import { MCP_INSTRUCTIONS } from "../../../worker/mcp/instructions";
import { TOOL_DEFINITIONS, type ToolName } from "../../../worker/mcp/tools";
import {
  TOOL_PROFILES,
  type KnownToolName,
} from "../../../worker/mcp/tools/selection";
import {
  SOCIAL_TOOL_DEFINITIONS,
  SOCIAL_TOOL_NAMES,
  type SocialToolName,
} from "../../../worker/mcp/tools/social";

function isSocialTool(name: KnownToolName): name is SocialToolName {
  return name in SOCIAL_TOOL_DEFINITIONS;
}

/**
 * Serializes a tool's name, description, and JSON-Schema parameters the same
 * way the MCP SDK does when advertising tools to a model, and returns the
 * combined character length.
 */
function toolChars(name: KnownToolName): number {
  const def = isSocialTool(name)
    ? SOCIAL_TOOL_DEFINITIONS[name]
    : TOOL_DEFINITIONS[name];
  const schemaChars = JSON.stringify(zodToJsonSchema(def.parameters)).length;
  return def.name.length + def.description.length + schemaChars;
}

function registryChars(names: readonly KnownToolName[]): number {
  return names.reduce((sum, name) => sum + toolChars(name), 0);
}

const ALL_TOOL_NAMES = Object.keys(TOOL_DEFINITIONS) as ToolName[];

describe("context budget", () => {
  test("MCP_INSTRUCTIONS stays at or below the measured baseline", () => {
    expect(MCP_INSTRUCTIONS.length).toBeLessThanOrEqual(9791);
  });

  test("full registry always-on total stays at or below ~136,000 chars (~34k tok)", () => {
    expect(registryChars(ALL_TOOL_NAMES)).toBeLessThanOrEqual(136_000);
  });

  // The plan's original ~48k estimate predates the approved curated
  // parameter expansion on search_news_articles and the five stats tools;
  // this ceiling is the actual measured size plus headroom, guarding
  // against further unplanned growth rather than the pre-implementation
  // estimate.
  test("research profile stays at or below ~70,000 chars (~17.5k tok)", () => {
    expect(registryChars(TOOL_PROFILES.research)).toBeLessThanOrEqual(70_000);
  });

  // Same caveat as the research profile above — ceiling reflects the
  // measured size of search_news_articles plus the five stats tools.
  test("minimal profile stays at or below ~35,000 chars (~8.75k tok)", () => {
    expect(registryChars(TOOL_PROFILES.minimal)).toBeLessThanOrEqual(35_000);
  });

  // Added to the default set for every session with social access.
  test("social tools stay at or below ~12,000 chars (~3k tok)", () => {
    expect(registryChars(SOCIAL_TOOL_NAMES)).toBeLessThanOrEqual(12_000);
  });
});
