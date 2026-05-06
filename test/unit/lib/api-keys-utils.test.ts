import { afterEach, describe, expect, spyOn, test } from "bun:test";
import {
  fetchPerigonApiKeys,
  getFirstApiKey,
  parseApiKeysResponse,
} from "../../../worker/lib/api-keys-utils";
import {
  installFetchMock,
  jsonResponse,
  restoreFetch,
  urlOf,
} from "../../helpers/mock-fetch";

afterEach(() => {
  restoreFetch();
});

describe("parseApiKeysResponse", () => {
  test("accepts a direct array response", () => {
    const result = parseApiKeysResponse([{ key: "k1" }, { key: "k2" }]);
    expect(result).toEqual([{ key: "k1" }, { key: "k2" }]);
  });

  test("accepts an object with a `data` array", () => {
    const result = parseApiKeysResponse({ data: [{ key: "k1" }] });
    expect(result).toEqual([{ key: "k1" }]);
  });

  test("accepts an object with a `results` array", () => {
    const result = parseApiKeysResponse({ results: [{ key: "k1" }] });
    expect(result).toEqual([{ key: "k1" }]);
  });

  test("returns [] for unrecognized shapes", () => {
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const result = parseApiKeysResponse({ totally: "different" });
    expect(result).toEqual([]);
    errorSpy.mockRestore();
  });

  test("returns [] when zod parsing throws", () => {
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    // null is not allowed by any branch of the union
    const result = parseApiKeysResponse(null);
    expect(result).toEqual([]);
    errorSpy.mockRestore();
  });

  test("logs the context when provided", () => {
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    parseApiKeysResponse(null, "myContext");
    const calls = errorSpy.mock.calls.map((args) => args.join(" "));
    expect(calls.some((line) => line.includes("myContext"))).toBe(true);
    errorSpy.mockRestore();
  });
});

describe("fetchPerigonApiKeys", () => {
  test("hits the documented URL with the cookie header", async () => {
    let capturedUrl = "";
    let capturedHeaders: Record<string, string> = {};
    installFetchMock((input, init) => {
      capturedUrl = urlOf(input);
      capturedHeaders = (init?.headers ?? {}) as Record<string, string>;
      return jsonResponse([{ key: "abc" }]);
    });

    const keys = await fetchPerigonApiKeys("session=value");
    expect(capturedUrl).toBe(
      "https://api.perigon.io/v1/apiKeys?size=100&sortBy=createdAt&sortOrder=desc&enabled=true"
    );
    expect(capturedHeaders.Cookie).toBe("session=value");
    expect(keys).toEqual([{ key: "abc" }]);
  });

  test("throws on non-OK responses", async () => {
    installFetchMock(() => new Response("nope", { status: 401 }));
    await expect(fetchPerigonApiKeys("c=1")).rejects.toThrow(
      "Failed to fetch API keys: 401"
    );
  });
});

describe("getFirstApiKey", () => {
  test("returns the first key when the list is non-empty", () => {
    expect(getFirstApiKey([{ key: "a" }, { key: "b" }])).toBe("a");
  });

  test("returns null for an empty list", () => {
    expect(getFirstApiKey([])).toBeNull();
  });
});
