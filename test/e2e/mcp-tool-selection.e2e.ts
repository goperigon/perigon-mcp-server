import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  apiKey,
  E2E_TIMEOUT_MS,
  type DevServer,
  listToolNames,
  MCP_PATH,
  sortToolNames,
  startDevServer,
} from "./mcp-e2e-helpers";

describe.skipIf(!apiKey)("e2e: MCP streamable HTTP tool selection", () => {
  let server: DevServer | undefined;

  beforeAll(async () => {
    server = await startDevServer();
  }, E2E_TIMEOUT_MS);

  afterAll(async () => {
    await server?.stop();
  });

  test(
    "registers only requested tools when ?tool= is provided",
    async () => {
      const unfilteredTools = await listToolNames(server!.url(MCP_PATH), apiKey!);
      expect(unfilteredTools).toContain("search_news_articles");

      const filteredTools = await listToolNames(
        server!.url(
          `${MCP_PATH}?tool=search_news_articles,search_news_stories,search_people`
        ),
        apiKey!
      );

      expect(filteredTools).toEqual(
        sortToolNames([
          "search_news_articles",
          "search_news_stories",
          "search_people",
        ])
      );
    },
    E2E_TIMEOUT_MS
  );
});
