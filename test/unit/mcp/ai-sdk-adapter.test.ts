import { describe, expect, test } from "bun:test";
import {
  convertMCPResult,
  createAISDKTools,
} from "../../../worker/mcp/ai-sdk-adapter";
import { TOOL_DEFINITIONS } from "../../../worker/mcp/tools";

describe("convertMCPResult", () => {
  test("returns the first text content", () => {
    expect(
      convertMCPResult({
        content: [{ type: "text", text: "hello" }],
      } as any)
    ).toBe("hello");
  });

  test('returns "No results" for empty content', () => {
    expect(convertMCPResult({ content: [] } as any)).toBe("No results");
    expect(convertMCPResult({ content: undefined } as any)).toBe("No results");
  });

  test('returns "No results" for non-text content', () => {
    expect(
      convertMCPResult({
        content: [{ type: "image", data: "..." }],
      } as any)
    ).toBe("No results");
  });
});

describe("createAISDKTools", () => {
  test("produces one tool entry per TOOL_DEFINITIONS key", () => {
    const tools = createAISDKTools("fake-key");
    const expected = Object.keys(TOOL_DEFINITIONS).sort();
    const actual = Object.keys(tools).sort();
    expect(actual).toEqual(expected);
  });

  test("each tool exposes description and inputSchema (AI SDK v5 shape)", () => {
    const tools = createAISDKTools("fake-key");
    for (const [name, tool] of Object.entries(tools)) {
      expect(typeof tool.description, `${name}.description`).toBe("string");
      // The v5 contract is `inputSchema`, not `parameters`. We pin this so a
      // future SDK rename or accidental revert is caught.
      expect(tool.inputSchema, `${name}.inputSchema`).toBeDefined();
      expect(tool.inputSchema).toBe(
        TOOL_DEFINITIONS[name as keyof typeof TOOL_DEFINITIONS].parameters
      );
      expect(typeof tool.execute, `${name}.execute`).toBe("function");
    }
  });

  test("passing null for requestedTools returns all tools (same as omitting)", () => {
    const tools = createAISDKTools("fake-key", null);
    const expected = Object.keys(TOOL_DEFINITIONS).sort();
    expect(Object.keys(tools).sort()).toEqual(expected);
  });

  test("filters down to a single tool when one name is requested", () => {
    const tools = createAISDKTools("fake-key", ["search_news_articles"]);
    expect(Object.keys(tools)).toEqual(["search_news_articles"]);
    expect(tools["search_news_articles"]).toBeDefined();
  });

  test("filters down to the requested subset when multiple names are provided", () => {
    const requested = ["search_news_articles", "search_people"] as const;
    const tools = createAISDKTools("fake-key", [...requested]);
    expect(Object.keys(tools).sort()).toEqual([...requested].sort());
  });

  test("excluded tools are absent from the result", () => {
    const tools = createAISDKTools("fake-key", ["search_news_articles"]);
    const allNames = Object.keys(TOOL_DEFINITIONS);
    const excluded = allNames.filter((n) => n !== "search_news_articles");
    for (const name of excluded) {
      expect(tools[name], `${name} should be absent`).toBeUndefined();
    }
  });

  test("still exposes correct inputSchema and execute on a filtered tool", () => {
    const tools = createAISDKTools("fake-key", ["search_people"]);
    const t = tools["search_people"];
    expect(t).toBeDefined();
    expect(t.inputSchema).toBe(TOOL_DEFINITIONS["search_people"].parameters);
    expect(typeof t.execute).toBe("function");
  });
});
