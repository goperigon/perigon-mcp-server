import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { ToolName } from "../../worker/mcp/tools";
import {
  apiKey,
  callTool,
  E2E_TIMEOUT_MS,
  EXPECTED_TOOL_NAMES,
  type DevServer,
  getToolResultText,
  listToolNames,
  MCP_PATH,
  sortToolNames,
  startDevServer,
} from "./mcp-e2e-helpers";

const ALL_TOOLS_TIMEOUT_MS = 240_000;
const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
  .toISOString()
  .split("T")[0];

const TOOL_ARGS_BY_NAME: Partial<Record<ToolName, Record<string, unknown>>> = {
  search_news_articles: { query: "AI", size: 1 },
  search_news_stories: { size: 1 },
  search_story_history: { size: 1 },
  search_vector_news: { query: "AI safety progress this year", size: 1 },
  summarize_news: {
    query: "AI",
    maxArticleCount: 1,
    returnedArticleCount: 1,
    maxTokens: 64,
  },
  search_journalists: { size: 1 },
  search_sources: { size: 1 },
  search_people: { name: "Sam Altman", size: 1 },
  search_companies: { symbol: ["AAPL"], size: 1 },
  search_topics: { size: 1 },
  search_wikipedia: { query: "OpenAI", size: 1 },
  search_vector_wikipedia: { query: "history of OpenAI", size: 1 },
  get_avg_sentiment: { from: yesterday, splitBy: "DAY" },
  get_article_counts: { from: yesterday, splitBy: "DAY" },
  get_top_entities: { q: "AI", from: yesterday, entity: ["topics"] },
  get_top_people: { q: "AI", size: 1 },
  get_top_companies: { q: "AI", size: 1 },
  get_company_news: { companyName: "OpenAI", days: 7 },
  get_person_news: { personName: "Sam Altman", days: 30 },
  get_location_news: { location: "Austin", days: 7 },
  get_api_access: {},
  list_monitors: { page: 0, size: 1 },
};

/**
 * Tools that are always-on but cannot be safely exercised by this generic
 * e2e suite: the monitor sub-resource tools require a real monitor UUID
 * this account may not have, and `set_monitor_status` mutates a monitor's
 * lifecycle state, which is unsafe to call against a live account without
 * knowing the monitor is disposable. Still asserted as registered in the
 * "advertised tools" check, just not invoked.
 */
const SKIPPED_TOOL_NAMES: ToolName[] = [
  "get_monitor",
  "get_monitor_events",
  "get_monitor_newsletters",
  "get_monitor_summaries",
  "set_monitor_status",
];

describe.skipIf(!apiKey)("e2e: MCP streamable HTTP all tools", () => {
  let server: DevServer | undefined;

  beforeAll(async () => {
    server = await startDevServer();
  }, E2E_TIMEOUT_MS);

  afterAll(async () => {
    await server?.stop();
  });

  test("registers every tool allowed for the key when no ?tool= filter is provided", async () => {
    const availableTools = await listToolNames(server!.url(MCP_PATH), apiKey!);
    const coveredTools = sortToolNames([
      ...Object.keys(TOOL_ARGS_BY_NAME),
      ...SKIPPED_TOOL_NAMES,
    ]);

    expect(coveredTools).toEqual([...EXPECTED_TOOL_NAMES]);
    expect(availableTools.length).toBeGreaterThan(0);
    for (const toolName of availableTools) {
      expect(coveredTools).toContain(toolName);
    }
  });

  test(
    "calls every advertised tool without a ?tool= filter",
    async () => {
      const availableTools = await listToolNames(server!.url(MCP_PATH), apiKey!);
      const failures: string[] = [];

      for (const toolName of availableTools) {
        const name = toolName as ToolName;
        if (SKIPPED_TOOL_NAMES.includes(name)) continue;
        const args = TOOL_ARGS_BY_NAME[name] ?? {};

        try {
          const result = await callTool(
            server!.url(MCP_PATH),
            apiKey!,
            name,
            args
          );
          const text = getToolResultText(result);

          if (result.isError || text.includes("Error:") || text.length === 0) {
            failures.push(`${name}: ${text.slice(0, 240)}`);
          }
        } catch (error) {
          failures.push(
            `${name}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      expect(failures).toEqual([]);
    },
    ALL_TOOLS_TIMEOUT_MS
  );
});
