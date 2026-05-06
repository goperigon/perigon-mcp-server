import { describe, expect, test } from "bun:test";
import {
  FetchError,
  RequiredError,
  ResponseError,
} from "@goperigon/perigon-ts";
import { createErrorMessage } from "../../../../worker/mcp/tools/utils/error-handling";
import { HttpError } from "../../../../worker/types/types";

describe("createErrorMessage", () => {
  test("HttpError with structured JSON body surfaces message + status + path", async () => {
    const body = JSON.stringify({
      timestamp: "2024",
      status: 500,
      message: "internal failure",
      error: "Server Error",
      path: "/v1/articles/all",
    });
    const msg = await createErrorMessage(new HttpError(500, body));
    expect(msg).toContain("internal failure");
    expect(msg).toContain("Server Error");
    expect(msg).toContain("status 500");
    expect(msg).toContain("path /v1/articles/all");
  });

  test("HttpError with plain text body surfaces text + status", async () => {
    const msg = await createErrorMessage(
      new HttpError(503, "internal error; reference = abc123")
    );
    expect(msg).toContain("internal error; reference = abc123");
    expect(msg).toContain("status 503");
  });

  test("HttpError with empty body still produces a usable message", async () => {
    const msg = await createErrorMessage(new HttpError(500, ""));
    expect(msg).toContain("500");
  });

  test("ResponseError reads body via response.text()", async () => {
    // ResponseError wraps a Response; createErrorMessage calls .text() on it
    const fakeResponse = new Response("upstream said no", { status: 502 });
    const err = new ResponseError(fakeResponse, "Response error");
    const msg = await createErrorMessage(err);
    expect(msg).toContain("upstream said no");
    expect(msg).toContain("status 502");
  });

  test("FetchError surfaces the inner cause message", async () => {
    const err = new FetchError(new Error("ECONNRESET"), "fetch failed");
    const msg = await createErrorMessage(err);
    expect(msg).toContain("ECONNRESET");
  });

  test("RequiredError surfaces its own message", async () => {
    const err = new RequiredError("query", "Required field 'query' is missing");
    const msg = await createErrorMessage(err);
    expect(msg).toContain("query");
  });

  test("generic Error surfaces its message", async () => {
    const msg = await createErrorMessage(new Error("kaboom"));
    expect(msg).toBe("kaboom");
  });

  test("plain string is stringified", async () => {
    const msg = await createErrorMessage("something" as any);
    expect(msg).toBe("something");
  });

  test("null/undefined produce a usable fallback", async () => {
    const a = await createErrorMessage(null as any);
    const b = await createErrorMessage(undefined as any);
    expect(a.length).toBeGreaterThan(0);
    expect(b.length).toBeGreaterThan(0);
  });
});
