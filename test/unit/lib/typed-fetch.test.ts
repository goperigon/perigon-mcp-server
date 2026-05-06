import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { typedFetch } from "../../../worker/lib/typed-fetch";
import { HttpError } from "../../../worker/types/types";
import {
  installFetchMock,
  jsonResponse,
  restoreFetch,
} from "../../helpers/mock-fetch";

afterEach(() => {
  restoreFetch();
});

describe("typedFetch", () => {
  test("parses JSON on a 2xx response", async () => {
    installFetchMock(() => jsonResponse({ hello: "world", n: 7 }));
    const result = await typedFetch<{ hello: string; n: number }>(
      "https://example.com/json",
      {}
    );
    expect(result).toEqual({ hello: "world", n: 7 });
  });

  test("throws HttpError with status and body for non-OK responses", async () => {
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    installFetchMock(
      () =>
        new Response("server exploded", {
          status: 503,
          headers: { "content-type": "text/plain" },
        })
    );

    let caught: unknown;
    try {
      await typedFetch("https://example.com/boom", {});
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(HttpError);
    const err = caught as HttpError;
    expect(err.statusCode).toBe(503);
    expect(err.responseBody).toBe("server exploded");
    errorSpy.mockRestore();
  });

  test("propagates the request URL and options to fetch", async () => {
    let capturedUrl = "";
    let capturedInit: RequestInit | undefined;
    installFetchMock((input, init) => {
      capturedUrl = typeof input === "string" ? input : input.toString();
      capturedInit = init;
      return jsonResponse({ ok: true });
    });

    await typedFetch("https://example.com/x", {
      method: "POST",
      headers: { Authorization: "Bearer abc" },
    });
    expect(capturedUrl).toBe("https://example.com/x");
    expect(capturedInit?.method).toBe("POST");
    expect((capturedInit?.headers as Record<string, string>).Authorization).toBe(
      "Bearer abc"
    );
  });
});
