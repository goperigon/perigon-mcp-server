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
      new HttpError(503, "internal error; reference = abc123"),
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

describe("createErrorMessage classification guidance", () => {
  test("403 with plan-restriction phrasing appends plan guidance, no retry", async () => {
    const body = JSON.stringify({
      status: 403,
      message: "This parameter is not supported by your plan",
    });
    const msg = await createErrorMessage(new HttpError(403, body));
    expect(msg).toContain("do not retry");
    expect(msg).toContain("get_api_access");
    expect(msg).toContain("plan");
  });

  test("403 with quota phrasing appends quota guidance instead of plan guidance", async () => {
    const body = JSON.stringify({
      status: 403,
      message: "You have exceeded your usage quota for this period",
    });
    const msg = await createErrorMessage(new HttpError(403, body));
    expect(msg).toContain("exhausted its usage quota");
    expect(msg).toContain("get_api_access");
  });

  test("403 with unrecognized phrasing falls back to plan-restriction guidance", async () => {
    const msg = await createErrorMessage(new HttpError(403, "Forbidden"));
    expect(msg).toContain("plan does not include");
  });

  test("429 appends rate-limit guidance with retryAfterMillis when present", async () => {
    const err = new HttpError(429, "Too many requests");
    err.retryAfterMillis = 2500;
    const msg = await createErrorMessage(err);
    expect(msg).toContain("Rate limited");
    expect(msg).toContain("2500ms");
  });

  test("429 appends generic rate-limit guidance without retryAfterMillis", async () => {
    const msg = await createErrorMessage(
      new HttpError(429, "Too many requests"),
    );
    expect(msg).toContain("Rate limited");
    expect(msg).not.toContain("undefined");
  });

  test("404 appends not-found guidance", async () => {
    const msg = await createErrorMessage(new HttpError(404, "Not found"));
    expect(msg).toContain("was not found");
    expect(msg).toContain("do not retry");
  });

  test("400 with pagination phrasing appends pagination guidance", async () => {
    const body = "Requested page exceeds pagination limit for this plan";
    const msg = await createErrorMessage(new HttpError(400, body));
    expect(msg).toContain("pagination limit");
    expect(msg).toContain("reduce page or size");
  });

  test("400 without pagination phrasing gets no extra guidance appended", async () => {
    const msg = await createErrorMessage(
      new HttpError(400, "Invalid request body"),
    );
    expect(msg).not.toContain("do not retry");
    expect(msg).not.toContain("reduce page or size");
  });

  test("500 gets no classification guidance appended", async () => {
    const msg = await createErrorMessage(
      new HttpError(500, "internal failure"),
    );
    expect(msg).not.toContain("do not retry");
    expect(msg).not.toContain("Rate limited");
  });
});
