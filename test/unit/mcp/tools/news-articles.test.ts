import { describe, expect, spyOn, test } from "bun:test";
import { HttpError } from "../../../../worker/types/types";
import {
  newsArticlesArgs,
  searchNewsArticles,
} from "../../../../worker/mcp/tools/search/news-articles";
import {
  articlesFixture,
  emptyArticlesFixture,
} from "../../../helpers/fixtures";
import { createMockPerigon, firstCallArgs } from "../../../helpers/mock-perigon";

function getText(result: any): string {
  return result.content[0].text as string;
}

describe("searchNewsArticles", () => {
  test("forwards mapped params and renders article output", async () => {
    const perigon = createMockPerigon({
      searchArticles: async () => articlesFixture,
    });
    const handler = searchNewsArticles(perigon);

    const args = newsArticlesArgs.parse({
      query: "AI healthcare",
      cities: ["Austin"],
      states: ["tx"],
      countries: ["US"],
      articleIds: ["a1"],
      journalistIds: ["j1"],
      newsStoryIds: ["c1"],
      sources: ["nyt.com"],
    });

    const result = await handler(args);

    expect(perigon.searchArticles).toHaveBeenCalledTimes(1);
    const call = firstCallArgs<any>(perigon.searchArticles);
    // Query is AND-joined by createSearchField
    expect(call.q).toBe("AI AND healthcare");
    // Arg → SDK param renames
    expect(call.city).toEqual(["Austin"]);
    expect(call.state).toEqual(["TX"]); // uppercased by zod transform
    expect(call.country).toEqual(["us"]); // lowercased by zod transform
    expect(call.articleId).toEqual(["a1"]);
    expect(call.journalistId).toEqual(["j1"]);
    expect(call.clusterId).toEqual(["c1"]);
    expect(call.source).toEqual(["nyt.com"]);
    expect(call.showNumResults).toBe(true);

    const text = getText(result);
    expect(text).toContain("Got 2 articles");
    expect(text).toContain('<article id="a1"');
    expect(text).toContain('<article id="a2"');
    // Default summarize=true → uses summary, not content
    expect(text).toContain("Content: Summary 1");
    expect(text).not.toContain("Full content 1");
  });

  test("summarize:false renders article.content instead of summary", async () => {
    const perigon = createMockPerigon({
      searchArticles: async () => articlesFixture,
    });
    const handler = searchNewsArticles(perigon);
    const args = newsArticlesArgs.parse({ summarize: false });
    const result = await handler(args);
    expect(getText(result)).toContain("Content: Full content 1");
  });

  test("countries default to ['us']", async () => {
    const perigon = createMockPerigon({
      searchArticles: async () => articlesFixture,
    });
    const handler = searchNewsArticles(perigon);
    const args = newsArticlesArgs.parse({});
    await handler(args);
    expect(firstCallArgs<any>(perigon.searchArticles).country).toEqual(["us"]);
  });

  test("returns noResults when numResults === 0", async () => {
    const perigon = createMockPerigon({
      searchArticles: async () => emptyArticlesFixture,
    });
    const handler = searchNewsArticles(perigon);
    const args = newsArticlesArgs.parse({});
    const result = await handler(args);
    expect(getText(result)).toBe("No results found");
  });

  test("location triggers applyLocationFilter and sets q when no query", async () => {
    const perigon = createMockPerigon({
      searchArticles: async () => articlesFixture,
    });
    const handler = searchNewsArticles(perigon);
    const args = newsArticlesArgs.parse({ location: "Austin", locationType: "city" });
    await handler(args);
    const call = firstCallArgs<any>(perigon.searchArticles);
    expect(call.city).toEqual(["Austin"]);
    expect(call.q).toBe("Austin");
  });

  test("explicit query is preserved when location is also provided", async () => {
    const perigon = createMockPerigon({
      searchArticles: async () => articlesFixture,
    });
    const handler = searchNewsArticles(perigon);
    const args = newsArticlesArgs.parse({
      query: "election",
      location: "tx",
      locationType: "auto",
    });
    await handler(args);
    const call = firstCallArgs<any>(perigon.searchArticles);
    expect(call.q).toBe("election");
    expect(call.state).toEqual(["TX"]);
  });

  test("error path returns toolResult starting with 'Error:'", async () => {
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const perigon = createMockPerigon({
      searchArticles: async () => {
        throw new HttpError(500, '{"message":"upstream failure"}');
      },
    });
    const handler = searchNewsArticles(perigon);
    const args = newsArticlesArgs.parse({});
    const result = await handler(args);
    const text = getText(result);
    expect(text.startsWith("Error: Failed to search news articles:")).toBe(true);
    expect(text).toContain("upstream failure");
    errorSpy.mockRestore();
  });

  test("from/to dates are forwarded as Date objects", async () => {
    const perigon = createMockPerigon({
      searchArticles: async () => articlesFixture,
    });
    const handler = searchNewsArticles(perigon);
    const args = newsArticlesArgs.parse({
      from: "2024-01-01",
      to: "2024-02-01",
    });
    await handler(args);
    const call = firstCallArgs<any>(perigon.searchArticles);
    expect(call.from).toBeInstanceOf(Date);
    expect(call.to).toBeInstanceOf(Date);
  });

  test("rejects sentiment scores outside [0, 1]", () => {
    expect(() =>
      newsArticlesArgs.parse({ positiveSentimentFrom: 1.5 })
    ).toThrow();
    expect(() =>
      newsArticlesArgs.parse({ negativeSentimentTo: -0.1 })
    ).toThrow();
  });
});
