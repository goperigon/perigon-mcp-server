import { describe, expect, test } from "bun:test";
import {
  DEFAULT_PERIGON_API_URL,
  mcpPublicOrigin,
  perigonApiOrigin,
} from "../../../worker/lib/mcp-env";

const devEnv = {
  MCP_PUBLIC_URL: "http://127.0.0.1:8787",
  PERIGON_API_URL: "http://localhost:8080",
  PERIGON_APP_URL: "http://localhost:3000",
} as unknown as Env;

describe("mcp-env production host fallback", () => {
  test("uses production API URL for introspection when dev vars hit mcp.perigon.io", () => {
    const request = new Request("https://mcp.perigon.io/v1/mcp");
    expect(perigonApiOrigin(devEnv, request)).toBe(DEFAULT_PERIGON_API_URL);
  });

  test("keeps local API URL for local wrangler requests", () => {
    const request = new Request("http://127.0.0.1:8787/v1/mcp");
    expect(perigonApiOrigin(devEnv, request)).toBe("http://localhost:8080");
  });

  test("treats bracketed IPv6 loopback MCP URL as local dev on public host", () => {
    const env = {
      MCP_PUBLIC_URL: "http://[::1]:8787",
      PERIGON_API_URL: "http://localhost:8080",
    } as unknown as Env;
    const request = new Request(
      "https://mcp.perigon.io/.well-known/oauth-protected-resource",
    );
    expect(mcpPublicOrigin(env, request)).toBe("https://mcp.perigon.io");
    expect(perigonApiOrigin(env, request)).toBe(DEFAULT_PERIGON_API_URL);
  });
});
