import { describe, expect, test } from "bun:test";
import { z } from "zod";
import {
  createSearchField,
  sortByEnum,
} from "../../../../worker/mcp/tools/schemas/search";

const schema = z.object({ q: createSearchField("article content") });

describe("createSearchField", () => {
  test("undefined input remains undefined", () => {
    expect(schema.parse({}).q).toBeUndefined();
  });

  test("empty / whitespace-only input is preserved as-is", () => {
    expect(schema.parse({ q: "" }).q).toBe("");
    expect(schema.parse({ q: "   " }).q).toBe("   ");
  });

  test("single word is left untouched", () => {
    expect(schema.parse({ q: "trump" }).q).toBe("trump");
  });

  test("multi-word phrase is joined with AND", () => {
    expect(schema.parse({ q: "trump biden" }).q).toBe("trump AND biden");
    expect(schema.parse({ q: " AI healthcare " }).q).toBe("AI AND healthcare");
  });

  test("preserves explicit Boolean operators", () => {
    expect(schema.parse({ q: "trump OR biden" }).q).toBe("trump OR biden");
    expect(schema.parse({ q: "AI AND healthcare" }).q).toBe(
      "AI AND healthcare"
    );
    expect(schema.parse({ q: "war NOT peace" }).q).toBe("war NOT peace");
  });

  test("preserves quoted phrases", () => {
    expect(schema.parse({ q: '"US Election"' }).q).toBe('"US Election"');
    expect(schema.parse({ q: '"a b c"' }).q).toBe('"a b c"');
  });

  test("preserves wildcards", () => {
    expect(schema.parse({ q: "climat*" }).q).toBe("climat*");
    expect(schema.parse({ q: "econ?" }).q).toBe("econ?");
  });

  test("preserves grouping parentheses", () => {
    expect(schema.parse({ q: "(a OR b) AND c" }).q).toBe("(a OR b) AND c");
  });

  test("returns a string with .describe() metadata attached", () => {
    // sanity: zod's describe() shouldn't break the schema for valid input
    expect(schema.parse({ q: "hello" }).q).toBe("hello");
  });
});

describe("sortByEnum", () => {
  test("accepts the documented sort values", () => {
    const validValues = [
      "relevance",
      "createdAt",
      "updatedAt",
      "count",
      "totalCount",
    ];
    for (const v of validValues) {
      expect(sortByEnum.parse(v)).toBe(v as any);
    }
  });

  test("rejects unknown values", () => {
    expect(() => sortByEnum.parse("date")).toThrow();
  });
});
