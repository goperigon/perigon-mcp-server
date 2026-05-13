import { describe, expect, spyOn, test } from "bun:test";
import { HttpError } from "../../../../worker/types/types";
import {
  newsVectorArgs,
  searchVectorNews,
} from "../../../../worker/mcp/tools/search/news-vector";
import { newsVectorFixture } from "../../../helpers/fixtures";
import { createMockPerigon, firstCallArgs } from "../../../helpers/mock-perigon";

const text = (r: any) => r.content[0].text as string;

describe("searchVectorNews", () => {
  test("query is required", () => {
    expect(() => newsVectorArgs.parse({})).toThrow();
  });

  test("default showReprints is false", () => {
    const parsed = newsVectorArgs.parse({ query: "x" });
    expect(parsed.showReprints).toBe(false);
  });

  test("omits filter object when no filters are set", async () => {
    const perigon = createMockPerigon({
      vectorSearchArticles: async () => newsVectorFixture,
    });
    await searchVectorNews(perigon)(newsVectorArgs.parse({ query: "x" }));
    const call = firstCallArgs<any>(perigon.vectorSearchArticles);
    expect(call.articleSearchParams.prompt).toBe("x");
    expect(call.articleSearchParams).not.toHaveProperty("filter");
  });

  test("populates filter object with all supplied filter fields", async () => {
    const perigon = createMockPerigon({
      vectorSearchArticles: async () => newsVectorFixture,
    });
    const args = newsVectorArgs.parse({
      query: "x",
      category: ["Tech"],
      topic: ["AI"],
      source: ["nyt.com"],
      sourceGroup: ["top10"],
      language: ["en"],
      country: ["us"],
      personName: ["Alice"],
      companyDomain: ["acme.com"],
      companySymbol: ["ACM"],
      label: ["Opinion"],
    });
    await searchVectorNews(perigon)(args);
    const filter = firstCallArgs<any>(perigon.vectorSearchArticles)
      .articleSearchParams.filter;
    expect(filter).toEqual({
      category: ["Tech"],
      topic: ["AI"],
      source: ["nyt.com"],
      sourceGroup: ["top10"],
      language: ["en"],
      country: ["us"],
      personName: ["Alice"],
      companyDomain: ["acme.com"],
      companySymbol: ["ACM"],
      label: ["Opinion"],
    });
  });

  test("forwards page and size to the SDK", async () => {
    const perigon = createMockPerigon({
      vectorSearchArticles: async () => newsVectorFixture,
    });
    const result = await searchVectorNews(perigon)(
      newsVectorArgs.parse({ query: "x", page: 2, size: 50 })
    );
    const call = firstCallArgs<any>(perigon.vectorSearchArticles);
    expect(call.articleSearchParams.page).toBe(2);
    expect(call.articleSearchParams.size).toBe(50);
    expect(text(result)).toContain(
      "Returned 1 articles (vector search) (page 2, requested size 50)"
    );
  });

  test("renders Similarity Score from scored.score", async () => {
    const perigon = createMockPerigon({
      vectorSearchArticles: async () => newsVectorFixture,
    });
    const result = await searchVectorNews(perigon)(
      newsVectorArgs.parse({ query: "x" })
    );
    expect(text(result)).toContain("Similarity Score: 0.88");
    expect(text(result)).toContain('<article id="va1"');
  });

  test("noResults when result.results is empty", async () => {
    const perigon = createMockPerigon({
      vectorSearchArticles: async () => ({ results: [] }),
    });
    const result = await searchVectorNews(perigon)(
      newsVectorArgs.parse({ query: "x" })
    );
    expect(text(result)).toBe("No results found");
  });

  test("error path", async () => {
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const perigon = createMockPerigon({
      vectorSearchArticles: async () => {
        throw new HttpError(500, "boom");
      },
    });
    const result = await searchVectorNews(perigon)(
      newsVectorArgs.parse({ query: "x" })
    );
    expect(
      text(result).startsWith("Error: Failed to perform vector news search:")
    ).toBe(true);
    errorSpy.mockRestore();
  });
});
