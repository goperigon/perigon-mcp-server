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
});
