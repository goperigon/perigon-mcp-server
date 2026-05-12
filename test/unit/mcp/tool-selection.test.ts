import { describe, expect, test } from "bun:test";
import {
  parseRequestedTools,
  resolveActiveTools,
  resolveToolParam,
} from "../../../worker/mcp/tools/selection";
import type { ToolName } from "../../../worker/mcp/tools";

// A stable subset of known tool names used throughout these tests
const KNOWN: ToolName[] = [
  "search_news_articles",
  "search_people",
  "search_companies",
];

const ALL_ALLOWED: ToolName[] = [
  "search_news_articles",
  "search_news_stories",
  "search_people",
  "search_companies",
  "search_topics",
];

// ---------------------------------------------------------------------------
// resolveToolParam
// ---------------------------------------------------------------------------

describe("resolveToolParam", () => {
  const u = (qs: string) => new URL(`https://example.com/v1/mcp${qs}`);

  test("returns value of ?tool= when present", () => {
    expect(resolveToolParam(u("?tool=search_news_articles"))).toBe(
      "search_news_articles"
    );
  });

  test("returns value of ?tools= when present (alias)", () => {
    expect(resolveToolParam(u("?tools=search_news_articles"))).toBe(
      "search_news_articles"
    );
  });

  test("?tool= takes precedence over ?tools= when both are present", () => {
    expect(
      resolveToolParam(u("?tool=search_news_articles&tools=search_people"))
    ).toBe("search_news_articles");
  });

  test("returns null when neither param is present", () => {
    expect(resolveToolParam(u(""))).toBeNull();
  });

  test("returns empty string (falsy) for ?tool= with no value", () => {
    expect(resolveToolParam(u("?tool="))).toBe("");
  });
});

// ---------------------------------------------------------------------------
// parseRequestedTools
// ---------------------------------------------------------------------------

describe("parseRequestedTools", () => {
  test("returns null for absent parameter (null input)", () => {
    expect(parseRequestedTools(null)).toBeNull();
  });

  test("returns null for empty string", () => {
    expect(parseRequestedTools("")).toBeNull();
  });

  test("returns null for whitespace-only string", () => {
    expect(parseRequestedTools("   ")).toBeNull();
  });

  test('returns null for "all" (explicit all-tools alias)', () => {
    expect(parseRequestedTools("all")).toBeNull();
  });

  test('"all" alias is case-insensitive', () => {
    expect(parseRequestedTools("ALL")).toBeNull();
    expect(parseRequestedTools("All")).toBeNull();
    expect(parseRequestedTools("  all  ")).toBeNull();
  });

  test("returns single valid tool name", () => {
    const result = parseRequestedTools("search_news_articles");
    expect(result).toEqual(["search_news_articles"]);
  });

  test("returns multiple valid tool names", () => {
    const result = parseRequestedTools("search_news_articles,search_people");
    expect(result).toEqual(["search_news_articles", "search_people"]);
  });

  test("handles whitespace around commas", () => {
    const result = parseRequestedTools(
      " search_news_articles , search_people "
    );
    expect(result).toEqual(["search_news_articles", "search_people"]);
  });

  test("silently drops unknown tool names", () => {
    const result = parseRequestedTools(
      "search_news_articles,nonexistent_tool"
    );
    expect(result).toEqual(["search_news_articles"]);
  });

  test("returns null when all names are unknown (prevents accidental lockout)", () => {
    expect(parseRequestedTools("fake_tool,another_fake")).toBeNull();
  });

  test("returns null for a single unknown tool name", () => {
    expect(parseRequestedTools("invalid_tool")).toBeNull();
  });

  test("accepts all 20 known tool names without dropping any", () => {
    const allNames: ToolName[] = [
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
      "search_wikipedia",
      "search_vector_wikipedia",
      "get_avg_sentiment",
      "get_article_counts",
      "get_top_entities",
      "get_top_people",
      "get_top_companies",
      "get_company_news",
      "get_person_news",
      "get_location_news",
    ];
    const param = allNames.join(",");
    const result = parseRequestedTools(param);
    expect(result).not.toBeNull();
    expect(result!.sort()).toEqual([...allNames].sort());
  });

  test("preserves order of valid names as they appear in the parameter", () => {
    const result = parseRequestedTools(
      "search_companies,search_news_articles,search_people"
    );
    expect(result).toEqual([
      "search_companies",
      "search_news_articles",
      "search_people",
    ]);
  });
});

// ---------------------------------------------------------------------------
// resolveActiveTools
// ---------------------------------------------------------------------------

describe("resolveActiveTools", () => {
  test("returns all allowed tools when requestedTools is null (no filter)", () => {
    expect(resolveActiveTools(ALL_ALLOWED, null)).toEqual(ALL_ALLOWED);
  });

  test("returns all allowed tools when requestedTools is an empty array", () => {
    expect(resolveActiveTools(ALL_ALLOWED, [])).toEqual(ALL_ALLOWED);
  });

  test("returns exact intersection when requested tools are a subset", () => {
    const result = resolveActiveTools(ALL_ALLOWED, [
      "search_news_articles",
      "search_people",
    ]);
    expect(result).toEqual(["search_news_articles", "search_people"]);
  });

  test("excludes requested tools that are not in allowedTools", () => {
    // search_journalists is not in ALL_ALLOWED
    const result = resolveActiveTools(ALL_ALLOWED, [
      "search_news_articles",
      "search_journalists",
    ]);
    expect(result).toEqual(["search_news_articles"]);
  });

  test("returns empty array when no requested tools are in allowedTools", () => {
    const result = resolveActiveTools(ALL_ALLOWED, [
      "search_journalists",
      "search_sources",
    ]);
    expect(result).toEqual([]);
  });

  test("preserves the order of allowedTools, not requestedTools", () => {
    // requestedTools is in reverse order; result should follow allowedTools order
    const result = resolveActiveTools(KNOWN, [
      "search_companies",
      "search_news_articles",
    ]);
    expect(result).toEqual(["search_news_articles", "search_companies"]);
  });

  test("handles requestedTools with duplicates gracefully", () => {
    const result = resolveActiveTools(KNOWN, [
      "search_news_articles",
      "search_news_articles",
    ]);
    // Duplicates in requestedTools should not duplicate the output
    expect(result).toEqual(["search_news_articles"]);
  });

  test("returns empty array when allowedTools is empty", () => {
    expect(resolveActiveTools([], ["search_news_articles"])).toEqual([]);
  });

  test("returns empty array when both inputs are empty", () => {
    expect(resolveActiveTools([], [])).toEqual([]);
  });

  test("single requested tool matching allowedTools returns just that tool", () => {
    const result = resolveActiveTools(ALL_ALLOWED, ["search_topics"]);
    expect(result).toEqual(["search_topics"]);
  });
});
