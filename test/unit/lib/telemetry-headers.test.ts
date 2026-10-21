import { describe, expect, test } from "bun:test";
import {
  PERIGON_CLIENT_HEADER,
  PERIGON_MCP_CLIENT_HEADER,
  PERIGON_MCP_TOOL_HEADER,
  buildMcpTelemetryHeaders,
} from "../../../worker/lib/telemetry-headers";

describe("buildMcpTelemetryHeaders", () => {
  test("always sets x-perigon-client", () => {
    const headers = buildMcpTelemetryHeaders({});
    expect(headers[PERIGON_CLIENT_HEADER]).toBe("mcp");
    expect(headers).not.toHaveProperty("user-agent");
  });

  test("includes tool name when provided", () => {
    const headers = buildMcpTelemetryHeaders({ toolName: "search_news_articles" });
    expect(headers[PERIGON_MCP_TOOL_HEADER]).toBe("search_news_articles");
  });

  test("formats client info as name/version", () => {
    const headers = buildMcpTelemetryHeaders({
      clientInfo: { name: "cursor-vscode", version: "1.0.0" },
    });
    expect(headers[PERIGON_MCP_CLIENT_HEADER]).toBe("cursor-vscode/1.0.0");
  });

  test("sanitizes non-ASCII and disallowed characters in client header", () => {
    const headers = buildMcpTelemetryHeaders({
      clientInfo: { name: "claude-日本", version: "1.0" },
    });
    expect(headers[PERIGON_MCP_CLIENT_HEADER]).toBe("claude-__/1.0");
  });

  test("truncates client header to 100 characters", () => {
    const headers = buildMcpTelemetryHeaders({
      clientInfo: { name: "a".repeat(120), version: "1" },
    });
    expect(headers[PERIGON_MCP_CLIENT_HEADER]?.length).toBeLessThanOrEqual(100);
  });
});
