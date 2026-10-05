import { describe, expect, test } from "bun:test";
import { Configuration, V1Api } from "@goperigon/perigon-ts";
import { normalizePerigonApiHost } from "../../../worker/lib/perigon";

describe("normalizePerigonApiHost", () => {
  test("strips trailing slash and /v1 suffix", () => {
    expect(normalizePerigonApiHost("https://api.test.local/")).toBe(
      "https://api.test.local",
    );
    expect(normalizePerigonApiHost("https://api.test.local/v1")).toBe(
      "https://api.test.local",
    );
  });

  test("generated V1Api calls hit /v1 paths once", async () => {
    let captured = "";
    globalThis.fetch = (url) => {
      captured = String(url);
      return Promise.resolve(
        new Response(JSON.stringify({ numResults: 0, articles: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    };

    const api = new V1Api(
      new Configuration({
        apiKey: "k",
        basePath: normalizePerigonApiHost("https://api.test.local/v1"),
      }),
    );
    await api.searchArticles({ q: "test" });
    expect(captured).toBe("https://api.test.local/v1/articles/all?q=test");
  });
});
