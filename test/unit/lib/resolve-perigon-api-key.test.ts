import { afterEach, describe, expect, test } from "bun:test";
import { resolvePerigonApiKey } from "../../../worker/lib/resolve-perigon-api-key";
import {
  installFetchMock,
  jsonResponse,
  restoreFetch,
} from "../../helpers/mock-fetch";

afterEach(() => {
  restoreFetch();
});

describe("resolvePerigonApiKey", () => {
  test("explicit X-Perigon-API-Key header wins", async () => {
    const req = new Request("https://localhost/", {
      headers: { "X-Perigon-API-Key": "explicit-key" },
    });
    const key = await resolvePerigonApiKey(req, true);
    expect(key).toBe("explicit-key");
  });

  test("whitespace-only header falls through to the fallback path", async () => {
    let fetchCalled = false;
    installFetchMock(() => {
      fetchCalled = true;
      return jsonResponse([{ key: "fallback" }]);
    });
    const req = new Request("https://localhost/", {
      headers: { "X-Perigon-API-Key": "   " },
    });
    const key = await resolvePerigonApiKey(req, true);
    expect(fetchCalled).toBe(true);
    expect(key).toBe("fallback");
  });

  test("authenticated user with no header falls back to /v1/apiKeys", async () => {
    installFetchMock(() => jsonResponse([{ key: "from-list" }]));
    const req = new Request("https://localhost/", {
      headers: { Cookie: "session=abc" },
    });
    const key = await resolvePerigonApiKey(req, true);
    expect(key).toBe("from-list");
  });

  test("authenticated user is given null when /v1/apiKeys returns empty", async () => {
    installFetchMock(() => jsonResponse([]));
    const req = new Request("https://localhost/");
    const key = await resolvePerigonApiKey(req, true);
    expect(key).toBeNull();
  });

  test("fetchFallbackForAuthenticated:false skips the fallback", async () => {
    let fetchCalled = false;
    installFetchMock(() => {
      fetchCalled = true;
      return jsonResponse([{ key: "should-not-be-used" }]);
    });
    const req = new Request("https://localhost/");
    const key = await resolvePerigonApiKey(req, true, {
      fetchFallbackForAuthenticated: false,
    });
    expect(fetchCalled).toBe(false);
    expect(key).toBeNull();
  });

  test("unauthenticated user returns null when no header is provided", async () => {
    const req = new Request("https://localhost/");
    const key = await resolvePerigonApiKey(req, false);
    expect(key).toBeNull();
  });

  test("unauthenticated user can still use the explicit header", async () => {
    const req = new Request("https://localhost/", {
      headers: { "X-Perigon-API-Key": "explicit" },
    });
    const key = await resolvePerigonApiKey(req, false);
    expect(key).toBe("explicit");
  });
});
