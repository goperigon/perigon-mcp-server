import { describe, expect, test } from "bun:test";

import {
  buildPlaygroundRedirectUrl,
  playgroundRedirectResponse,
} from "../../../worker/lib/playground-redirect";

describe("playground redirect", () => {
  test("buildPlaygroundRedirectUrl maps /chat to tab=chat", () => {
    const dest = buildPlaygroundRedirectUrl(new URL("https://mcp.perigon.io/chat"));
    expect(dest.toString()).toBe("https://perigon.io/mcp?tab=chat");
  });

  test("buildPlaygroundRedirectUrl preserves query params", () => {
    const dest = buildPlaygroundRedirectUrl(
      new URL("https://mcp.perigon.io/?foo=bar"),
    );
    expect(dest.origin + dest.pathname).toBe("https://perigon.io/mcp");
    expect(dest.searchParams.get("foo")).toBe("bar");
  });

  test("playgroundRedirectResponse skips /v1/*", () => {
    const res = playgroundRedirectResponse(
      new Request("https://mcp.perigon.io/v1/mcp"),
    );
    expect(res).toBeNull();
  });

  test("playgroundRedirectResponse redirects GET /", () => {
    const res = playgroundRedirectResponse(
      new Request("https://mcp.perigon.io/"),
    );
    expect(res?.status).toBe(302);
    expect(res?.headers.get("Location")).toBe("https://perigon.io/mcp");
  });

  test.each([
    "/.well-known/oauth-protected-resource",
    "/.well-known/oauth-protected-resource/v1/mcp",
    "/.well-known/oauth-authorization-server",
    "/favicon.ico",
    "/mcp",
    "/sse",
  ])("playgroundRedirectResponse skips non-playground path %s", (path) => {
    const res = playgroundRedirectResponse(
      new Request(`https://mcp.perigon.io${path}`),
    );
    expect(res).toBeNull();
  });

  test("playgroundRedirectResponse skips SSE GET on /", () => {
    const res = playgroundRedirectResponse(
      new Request("https://mcp.perigon.io/", {
        headers: { Accept: "text/event-stream" },
      }),
    );
    expect(res).toBeNull();
  });

  test("playgroundRedirectResponse skips non-GET", () => {
    const res = playgroundRedirectResponse(
      new Request("https://mcp.perigon.io/", { method: "POST" }),
    );
    expect(res).toBeNull();
  });

  test("playgroundRedirectResponse skips local dev host", () => {
    const res = playgroundRedirectResponse(
      new Request("https://local-mcp.perigon.io:5173/"),
    );
    expect(res).toBeNull();
  });

  test("playgroundRedirectResponse uses Host header when request URL is internal", () => {
    const res = playgroundRedirectResponse(
      new Request("http://127.0.0.1/", {
        headers: { Host: "mcp.perigon.io" },
      }),
    );
    expect(res?.status).toBe(302);
    expect(res?.headers.get("Location")).toBe("https://perigon.io/mcp");
  });
});
