import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { TOOL_DEFINITIONS } from "../../../worker/mcp/tools";

const EXPECTED_TOOL_NAMES = [
  // Search tools
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
  // Stats tools
  "get_avg_sentiment",
  "get_article_counts",
  "get_top_entities",
  "get_top_people",
  "get_top_companies",
  // Use-case tools
  "get_company_news",
  "get_person_news",
  "get_location_news",
] as const;

describe("TOOL_DEFINITIONS", () => {
  test("contains exactly the expected 20 tool names", () => {
    const actual = Object.keys(TOOL_DEFINITIONS).sort();
    const expected = [...EXPECTED_TOOL_NAMES].sort();
    expect(actual).toEqual(expected);
    expect(actual.length).toBe(20);
  });

  test("each tool exposes name, description, parameters, and createHandler", () => {
    for (const [key, def] of Object.entries(TOOL_DEFINITIONS)) {
      expect(def.name, `${key}.name`).toBe(key);
      expect(typeof def.description).toBe("string");
      expect(def.description.length).toBeGreaterThan(20);
      // parameters should be a zod object
      expect(def.parameters).toBeInstanceOf(z.ZodObject);
      expect(typeof def.createHandler).toBe("function");
    }
  });

  test("each tool's createHandler returns a function", () => {
    const fakePerigon = {} as any;
    for (const [key, def] of Object.entries(TOOL_DEFINITIONS)) {
      const handler = def.createHandler(fakePerigon);
      expect(typeof handler, `${key} handler`).toBe("function");
    }
  });
});
