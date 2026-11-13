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
      searchArticlesFull: async () => articlesFixture,
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

    expect(perigon.searchArticlesFull).toHaveBeenCalledTimes(1);
    const call = firstCallArgs<any>(perigon.searchArticlesFull);
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
      searchArticlesFull: async () => articlesFixture,
    });
    const handler = searchNewsArticles(perigon);
    const args = newsArticlesArgs.parse({ summarize: false });
    const result = await handler(args);
    expect(getText(result)).toContain("Content: Full content 1");
  });

  test("applies the default country only without a geographic filter, and says so", async () => {
    const perigon = createMockPerigon({
      searchArticlesFull: async () => articlesFixture,
    });
    const handler = searchNewsArticles(perigon);
    const outputs = [
      await handler(newsArticlesArgs.parse({ query: "election" })),
      await handler(newsArticlesArgs.parse({ location: "Paris" })),
      await handler(newsArticlesArgs.parse({ cities: ["London"] })),
      await handler(newsArticlesArgs.parse({ countries: ["FR"] })),
      await handler(newsArticlesArgs.parse({ countries: [] })),
      await handler(newsArticlesArgs.parse({ lat: 51.5, lon: -0.12, maxDistance: 50 })),
      await handler(newsArticlesArgs.parse({ lat: 0, lon: 0 })),
    ].map(getText);

    const calls = (perigon.searchArticlesFull as any).mock.calls.map(
      (args: any[]) => args[0]
    );
    expect(calls.map((call: any) => call.country)).toEqual([
      ["us"],
      undefined,
      undefined,
      ["fr"],
      undefined,
      undefined,
      undefined,
    ]);
    expect(calls[1].city).toEqual(["Paris"]);
    expect(outputs[0]).toStartWith("<note>No country filter was given, so the default country filter was applied: us.");
    expect(outputs[0]).toContain("countries: [] for all countries");
    for (const output of outputs.slice(1)) {
      expect(output).not.toContain("<note>");
    }
  });

  test("returns noResults when numResults === 0", async () => {
    const perigon = createMockPerigon({
      searchArticlesFull: async () => emptyArticlesFixture,
    });
    const handler = searchNewsArticles(perigon);
    const args = newsArticlesArgs.parse({});
    const result = await handler(args);
    expect(getText(result)).toStartWith(
      "<note>No country filter was given, so the default country filter was applied: us."
    );
    expect(getText(result)).toEndWith("No results found");
  });

  test("location triggers applyLocationFilter and sets q when no query", async () => {
    const perigon = createMockPerigon({
      searchArticlesFull: async () => articlesFixture,
    });
    const handler = searchNewsArticles(perigon);
    const args = newsArticlesArgs.parse({ location: "Austin", locationType: "city" });
    await handler(args);
    const call = firstCallArgs<any>(perigon.searchArticlesFull);
    expect(call.city).toEqual(["Austin"]);
    expect(call.q).toBe("Austin");
  });

  test("country names in location resolve to codes", async () => {
    const perigon = createMockPerigon({
      searchArticlesFull: async () => articlesFixture,
    });
    await searchNewsArticles(perigon)(
      newsArticlesArgs.parse({ location: "Germany", locationType: "country" })
    );
    expect(firstCallArgs<any>(perigon.searchArticlesFull).country).toEqual([
      "de",
    ]);
  });

  test("explicit query is preserved when location is also provided", async () => {
    const perigon = createMockPerigon({
      searchArticlesFull: async () => articlesFixture,
    });
    const handler = searchNewsArticles(perigon);
    const args = newsArticlesArgs.parse({
      query: "election",
      location: "tx",
      locationType: "auto",
    });
    await handler(args);
    const call = firstCallArgs<any>(perigon.searchArticlesFull);
    expect(call.q).toBe("election");
    expect(call.state).toEqual(["TX"]);
  });

  test("error path returns toolResult starting with 'Error:'", async () => {
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const perigon = createMockPerigon({
      searchArticlesFull: async () => {
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
      searchArticlesFull: async () => articlesFixture,
    });
    const handler = searchNewsArticles(perigon);
    const args = newsArticlesArgs.parse({
      from: "2024-01-01",
      to: "2024-02-01",
    });
    await handler(args);
    const call = firstCallArgs<any>(perigon.searchArticlesFull);
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
