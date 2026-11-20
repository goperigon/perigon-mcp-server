import { describe, expect, test } from "bun:test";
import {
  buildInstructions,
  MCP_INSTRUCTIONS,
} from "../../../worker/mcp/instructions";
import { CHAINING_REFERENCE } from "../../../worker/mcp/reference-resources";
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

  test("separates most-mentioned from spike tools and routes trending to spikes", () => {
    const text = buildInstructions(
      new Set<string>(resolveNewsToolsForSession([], null)),
    );

    expect(text).toContain(
      "- `get_top_entities` — most-mentioned entities in one window",
    );
    expect(text).toContain(
      "- `get_top_people`, `get_top_companies` — trending, surging, or spiking entities",
    );
    expect(text).toContain(
      '6. For "trending", "surging", or "spiking" questions use `get_top_people` / `get_top_companies`, never `get_top_entities`',
    );
    expect(text).toContain("By default, leave out perennially covered names");
  });

  test("omits the spike rule when no spike tool is active", () => {
    const text = buildInstructions(new Set<string>(["search_news_articles"]));

    expect(text).not.toContain("get_top_people");
    expect(text).not.toContain('"spiking" questions');
  });

  test("default session lists create_monitor and explains how to get update_monitor", () => {
    const text = buildInstructions(
      new Set<string>([
        ...resolveNewsToolsForSession([], null),
        "search_x_posts",
      ]),
    );

    expect(text).toContain("`create_monitor` / `set_monitor_status`");
    expect(text).toContain(
      "To monitor social channels continuously, use `create_monitor` with their social query fields.",
    );
    expect(text).toContain("reconnect with `?tools=all`");
  });

  test("never points at monitor write tools that are not registered", () => {
    const text = buildInstructions(
      new Set<string>(["search_news_articles", "search_x_posts"]),
    );

    expect(text).not.toContain("create_monitor");
    expect(text).not.toContain("update_monitor");
  });

  test("omits the update_monitor hint when update_monitor is registered", () => {
    expect(MCP_INSTRUCTIONS).not.toContain("reconnect with `?tools=all`");
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

describe("CHAINING_REFERENCE", () => {
  test("documents most-mentioned vs. spiking ranking", () => {
    expect(CHAINING_REFERENCE).toContain(
      "## Ranking entities: most-mentioned vs. spiking",
    );
    expect(CHAINING_REFERENCE).toContain(
      "Never set `from`/`to` on the spike tools.",
    );
  });

  test("defaults to leaving out perennially covered names, with an opt-in", () => {
    expect(CHAINING_REFERENCE).toContain(
      "### Perennially covered names (default: leave them out)",
    );
    expect(CHAINING_REFERENCE).toContain("Include perennial names");
  });
});
