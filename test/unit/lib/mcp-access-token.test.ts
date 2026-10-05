import { describe, expect, test } from "bun:test";
import {
  introspectionCacheTtlMs,
  looksLikeMcpAccessToken,
  mcpAccessTokenExpiryMs,
} from "../../../worker/lib/mcp-access-token";

function testJwt(payload: Record<string, unknown>): string {
  const encode = (value: unknown): string =>
    btoa(JSON.stringify(value))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  return `${encode({ alg: "none" })}.${encode(payload)}.sig`;
}

describe("mcp access token helpers", () => {
  test("looksLikeMcpAccessToken detects JWT shape", () => {
    expect(looksLikeMcpAccessToken("aaa.bbb.ccc")).toBe(true);
    expect(looksLikeMcpAccessToken("plain-api-key")).toBe(false);
  });

  test("mcpAccessTokenExpiryMs reads exp claim", () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    expect(mcpAccessTokenExpiryMs(testJwt({ exp }))).toBe(exp * 1000);
  });

  test("introspectionCacheTtlMs caps JWT cache by remaining lifetime", () => {
    const exp = Math.floor(Date.now() / 1000) + 120;
    const token = testJwt({ exp });
    const ttl = introspectionCacheTtlMs(token, 5 * 60 * 1000);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(120 * 1000);
  });

  test("introspectionCacheTtlMs skips cache for expired JWT", () => {
    const exp = Math.floor(Date.now() / 1000) - 10;
    const token = testJwt({ exp });
    expect(introspectionCacheTtlMs(token, 5 * 60 * 1000)).toBe(0);
  });

  test("introspectionCacheTtlMs keeps full TTL for API keys", () => {
    expect(introspectionCacheTtlMs("not-a-jwt", 300_000)).toBe(300_000);
  });
});
