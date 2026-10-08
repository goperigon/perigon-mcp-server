import { describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  buildNewsToolRegisterConfig,
  buildSignalToolRegisterConfig,
} from "../../../worker/mcp/register-tool-config";
import { articleCountsTool } from "../../../worker/mcp/tools/search/stats-article-counts";
import { searchSignalsTool } from "../../../worker/mcp/tools/signals/search-signals";

const noopToolResult = {
  content: [{ type: "text" as const, text: "ok" }],
};

async function listToolFromServer(server: McpServer, name: string) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-client", version: "1.0.0" });

  await server.connect(serverTransport);
  await client.connect(clientTransport);

  const { tools } = await client.listTools();
  const tool = tools.find((entry) => entry.name === name);
  expect(tool, `tools/list missing ${name}`).toBeDefined();
  await client.close();
  return tool!;
}

describe("buildNewsToolRegisterConfig", () => {
  test("copies title into annotations for MCP host directories", () => {
    const config = buildNewsToolRegisterConfig(
      articleCountsTool,
      articleCountsTool.description,
    );
    expect(config.title).toBe("Article volume");
    expect(config.annotations?.title).toBe("Article volume");
    expect(config.annotations?.readOnlyHint).toBe(true);
    expect(config.annotations?.openWorldHint).toBe(true);
  });
});

describe("buildSignalToolRegisterConfig", () => {
  test("uses annotations.title as top-level title", () => {
    const config = buildSignalToolRegisterConfig(searchSignalsTool);
    expect(config.title).toBe("Search monitors");
    expect(config.annotations?.title).toBe("Search monitors");
    expect(config.annotations?.readOnlyHint).toBe(true);
  });
});

describe("tools/list registration metadata", () => {
  test("news tool list entry includes title, annotations.title, and hints", async () => {
    const server = new McpServer({ name: "perigon-test", version: "1.0.0" });
    const config = buildNewsToolRegisterConfig(
      articleCountsTool,
      articleCountsTool.description,
    );
    server.registerTool(
      articleCountsTool.name,
      config,
      async () => noopToolResult,
    );

    const tool = await listToolFromServer(server, articleCountsTool.name);
    expect(tool.title).toBe("Article volume");
    expect(tool.annotations?.title).toBe("Article volume");
    expect(tool.annotations?.readOnlyHint).toBe(true);
    expect(tool.annotations?.openWorldHint).toBe(true);
  });

  test("signal tool list entry includes title, annotations.title, and hints", async () => {
    const server = new McpServer({ name: "perigon-test", version: "1.0.0" });
    const config = buildSignalToolRegisterConfig(searchSignalsTool);
    server.registerTool(
      searchSignalsTool.name,
      config,
      async () => noopToolResult,
    );

    const tool = await listToolFromServer(server, searchSignalsTool.name);
    expect(tool.title).toBe("Search monitors");
    expect(tool.annotations?.title).toBe("Search monitors");
    expect(tool.annotations?.readOnlyHint).toBe(true);
    expect(tool.annotations?.destructiveHint).toBe(false);
  });
});
