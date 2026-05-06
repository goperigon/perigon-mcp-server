import { describe, expect, test } from "bun:test";
import { handleError } from "../../../worker/lib/handle-error";

describe("handleError", () => {
  test("returns a JSON Response with the given status", async () => {
    const res = handleError("Something went wrong", 418);
    expect(res.status).toBe(418);
    expect(res.headers.get("content-type")).toContain("application/json");
    const body = (await res.json()) as { error: string };
    expect(body).toEqual({ error: "Something went wrong" });
  });

  test("includes details when provided", async () => {
    const res = handleError("Bad request", 400, "missing field");
    const body = (await res.json()) as { error: string; details?: string };
    expect(body).toEqual({ error: "Bad request", details: "missing field" });
  });

  test("omits details when undefined", async () => {
    const res = handleError("Server error", 500);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).not.toHaveProperty("details");
  });

  test("omits details when explicitly empty (current behavior)", async () => {
    // Implementation uses `details && {details}`, so empty strings are dropped.
    // This pins the existing behavior.
    const res = handleError("Server error", 500, "");
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).not.toHaveProperty("details");
  });
});
