import { describe, expect, test } from "bun:test";
import { resolveAdvertisedNewsToolsForRequest } from "../../../worker/mcp/request-tool-surface";
import { Scopes } from "../../../worker/types/types";

const NO_SCOPES: Scopes[] = [];
const MCP_ENDPOINT = "https://mcp.perigon.io/v1/mcp";

describe("resolveAdvertisedNewsToolsForRequest", () => {
  test("?tools=all advertises create_monitor and update_monitor", () => {
    const tools = resolveAdvertisedNewsToolsForRequest(
      `${MCP_ENDPOINT}?tools=all`,
      NO_SCOPES,
    );
    expect(tools).toContain("create_monitor");
    expect(tools).toContain("update_monitor");
  });

  test("request without a tools filter omits monitor write tools", () => {
    const tools = resolveAdvertisedNewsToolsForRequest(MCP_ENDPOINT, NO_SCOPES);
    expect(tools).not.toContain("create_monitor");
    expect(tools).not.toContain("update_monitor");
    expect(tools).toContain("list_monitors");
  });

  test("?tools=monitoring advertises monitor write tools without explicit all", () => {
    const tools = resolveAdvertisedNewsToolsForRequest(
      `${MCP_ENDPOINT}?tools=monitoring`,
      NO_SCOPES,
    );
    expect(tools).toContain("create_monitor");
    expect(tools).toContain("update_monitor");
  });
});
