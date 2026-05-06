import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { validatePerigonAuth } from "../../../worker/lib/perigon-auth";
import {
  installFetchMock,
  jsonResponse,
  restoreFetch,
  urlOf,
} from "../../helpers/mock-fetch";

afterEach(() => {
  restoreFetch();
});

describe("validatePerigonAuth", () => {
  test("returns true on 2xx responses", async () => {
    installFetchMock(() => jsonResponse({ id: "user-1" }));
    const req = new Request("https://localhost/", {
      headers: { Cookie: "perigon_session=abc" },
    });
    const ok = await validatePerigonAuth(req);
    expect(ok).toBe(true);
  });

  test("returns false on 401", async () => {
    installFetchMock(() => new Response("unauthorized", { status: 401 }));
    const req = new Request("https://localhost/");
    const ok = await validatePerigonAuth(req);
    expect(ok).toBe(false);
  });

  test("returns false (and does not throw) when fetch rejects", async () => {
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    installFetchMock(() => {
      throw new Error("network down");
    });
    const req = new Request("https://localhost/");
    const ok = await validatePerigonAuth(req);
    expect(ok).toBe(false);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  test("forwards the cookie header to the upstream call", async () => {
    let capturedCookie = "";
    let capturedUrl = "";
    installFetchMock((input, init) => {
      capturedUrl = urlOf(input);
      capturedCookie = (init?.headers as Record<string, string>)?.Cookie ?? "";
      return jsonResponse({});
    });
    const req = new Request("https://localhost/", {
      headers: { Cookie: "x=y" },
    });
    await validatePerigonAuth(req);
    expect(capturedUrl).toBe("https://api.perigon.io/v1/user");
    expect(capturedCookie).toBe("x=y");
  });

  test("treats a missing cookie as an empty string", async () => {
    let capturedCookie = "missing";
    installFetchMock((_input, init) => {
      capturedCookie = (init?.headers as Record<string, string>)?.Cookie ?? "missing";
      return jsonResponse({});
    });
    const req = new Request("https://localhost/");
    await validatePerigonAuth(req);
    expect(capturedCookie).toBe("");
  });
});
