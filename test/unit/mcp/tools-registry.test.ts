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
  // Monitor tools
  "list_monitors",
  "get_monitor",
  "get_monitor_events",
  "get_monitor_newsletters",
  "get_monitor_summaries",
  "create_monitor",
  "update_monitor",
  "set_monitor_status",
  // Entitlement/access tools
  "get_api_access",
  // Platform tools
  "get_source_by_id",
  "get_top_topics",
  "get_story_stats",
  "watchlists",
  "create_watchlist",
  "update_watchlist",
  "source_groups",
  "create_source_group",
  "update_source_group",
  "contact_points",
  "article_refresh",
  // Signal Insights tools
  "signal_insights_create_workspace",
  "signal_insights_search_signals",
  "signal_insights_read_signal",
  "signal_insights_list_newsletters",
  "signal_insights_read_newsletter",
  "signal_insights_export_events",
  "signal_insights_execute_code",
  "signal_insights_preview_chart",
  "signal_insights_shell",
  "signal_insights_list_files",
  "signal_insights_grep",
  "signal_insights_read_file",
  "signal_insights_write_file",
  "signal_insights_str_replace",
] as const;

describe("TOOL_DEFINITIONS", () => {
  test("contains exactly the expected tool names", () => {
    const actual = Object.keys(TOOL_DEFINITIONS).sort();
    const expected = [...EXPECTED_TOOL_NAMES].sort();
    expect(actual).toEqual(expected);
    expect(actual.length).toBe(54);
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
