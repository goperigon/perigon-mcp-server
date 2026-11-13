import { describe, expect, test } from "bun:test";
import {
  buildInstructions,
  MCP_INSTRUCTIONS,
} from "../../../worker/mcp/instructions";
import { resolveNewsToolsForSession } from "../../../worker/mcp/tool-registration";
import { SIGNAL_TOOL_NAMES } from "../../../worker/mcp/tools/selection";
import { Scopes } from "../../../worker/types/types";

describe("buildInstructions", () => {
  test("lists only the session's tools", () => {
    const newsTools = resolveNewsToolsForSession([], null);
    const text = buildInstructions(new Set<string>(newsTools));

    expect(newsTools).not.toContain("summarize_news");
    expect(text).not.toContain("summarize_news");
    expect(text).not.toContain("get_source_by_id");
    expect(text).not.toContain("search_x_posts");
    expect(text).not.toContain("## Signal Insights");
    expect(text).toContain("- `search_news_articles` — primary search.");
    expect(text).toContain(
      "- `get_avg_sentiment`, `get_article_counts` — sentiment and volume over time;",
    );
  });

  test("names each active tool of a shared bullet", () => {
    const text = buildInstructions(
      new Set<string>([
        ...resolveNewsToolsForSession([Scopes.SEARCH_SUMMARY, Scopes.SOURCES], [
          "search_sources",
          "summarize_news",
        ]),
        ...SIGNAL_TOOL_NAMES,
      ]),
    );

    expect(text).toContain("- `summarize_news` — get an AI-generated summary");
    expect(text).toContain("- `search_sources` — find or look up news publishers");
    expect(text).toContain("## Signal Insights");
  });

  test("the full catalogue lists every tool group", () => {
    for (const name of [
      "summarize_news",
      "get_source_by_id",
      "search_x_posts",
      "create_monitor",
      "signal_insights_create_workspace",
    ]) {
      expect(MCP_INSTRUCTIONS).toContain(`\`${name}\``);
    }
  });
});
