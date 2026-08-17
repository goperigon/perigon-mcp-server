import { describe, expect, test } from "bun:test";
import { resolveNewsToolsForSession } from "../../../worker/mcp/tool-registration";
import { TOOL_PROFILES } from "../../../worker/mcp/tools/selection";
import { Scopes } from "../../../worker/types/types";

const NO_SCOPES: Scopes[] = [];

describe("resolveNewsToolsForSession", () => {
  test("default (no requestedTools) excludes opt-in-only tools", () => {
    const active = resolveNewsToolsForSession(NO_SCOPES, null);
    expect(active).not.toContain("create_monitor");
    expect(active).not.toContain("update_monitor");
    expect(active).not.toContain("watchlists");
    expect(active).not.toContain("get_top_topics");
    expect(active).not.toContain("get_source_by_id");
    // ...but the always-on seed set is still present.
    expect(active).toContain("search_news_articles");
    expect(active).toContain("get_api_access");
    expect(active).toContain("list_monitors");
  });

  test("empty requestedTools array behaves like null (no filter)", () => {
    const withNull = resolveNewsToolsForSession(NO_SCOPES, null);
    const withEmpty = resolveNewsToolsForSession(NO_SCOPES, []);
    expect(new Set(withEmpty)).toEqual(new Set(withNull));
  });

  test("`monitoring` profile activates create_monitor and update_monitor", () => {
    const active = resolveNewsToolsForSession(
      NO_SCOPES,
      TOOL_PROFILES.monitoring,
    );
    expect(active).toContain("create_monitor");
    expect(active).toContain("update_monitor");
    expect(active).toContain("list_monitors");
  });

  test("`platform` profile activates the full platform tool set, not just get_api_access", () => {
    const active = resolveNewsToolsForSession(
      NO_SCOPES,
      TOOL_PROFILES.platform,
    );
    expect(active).toContain("watchlists");
    expect(active).toContain("create_watchlist");
    expect(active).toContain("update_watchlist");
    expect(active).toContain("source_groups");
    expect(active).toContain("create_source_group");
    expect(active).toContain("update_source_group");
    expect(active).toContain("contact_points");
    expect(active).toContain("article_refresh");
    expect(active).toContain("get_api_access");
  });

  test("`research` profile activates get_top_topics and get_source_by_id", () => {
    const active = resolveNewsToolsForSession(
      NO_SCOPES,
      TOOL_PROFILES.research,
    );
    expect(active).toContain("get_top_topics");
    expect(active).toContain("get_source_by_id");
  });

  test("explicit single opt-in tool name activates just that tool (plus scope-allowed defaults)", () => {
    const active = resolveNewsToolsForSession(NO_SCOPES, ["create_monitor"]);
    expect(active).toEqual(["create_monitor"]);
  });

  test("a genuinely scope-gated tool is not activated by request alone", () => {
    // search_news_stories requires CLUSTERS; requesting it without that
    // scope must not grant it, even though it's an explicit request.
    const active = resolveNewsToolsForSession(NO_SCOPES, [
      "search_news_stories",
    ]);
    expect(active).not.toContain("search_news_stories");
  });

  test("a scope-gated tool activates once its scope is present, via profile or explicit name", () => {
    const active = resolveNewsToolsForSession(
      [Scopes.CLUSTERS],
      ["search_news_stories"],
    );
    expect(active).toContain("search_news_stories");
  });

  test("opt-in tools never leak into the default set for a fully-scoped key", () => {
    const active = resolveNewsToolsForSession(Object.values(Scopes), null);
    expect(active).not.toContain("create_monitor");
    expect(active).not.toContain("watchlists");
    expect(active).not.toContain("get_top_topics");
  });
});
