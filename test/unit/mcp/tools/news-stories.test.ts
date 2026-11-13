import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { HttpError } from "../../../../worker/types/types";
import { Perigon } from "../../../../worker/lib/perigon";
import {
  newsStoriesArgs,
  searchNewsStories,
} from "../../../../worker/mcp/tools/search/news-stories";
import {
  emptyStoriesFixture,
  storiesFixture,
} from "../../../helpers/fixtures";
import { createMockPerigon, firstCallArgs } from "../../../helpers/mock-perigon";
import {
  installFetchMock,
  jsonResponse,
  restoreFetch,
  urlOf,
} from "../../../helpers/mock-fetch";

const text = (r: any) => r.content[0].text as string;

afterEach(() => {
  restoreFetch();
});

describe("searchNewsStories", () => {
  test("forwards mapped params and renders story output", async () => {
    const perigon = createMockPerigon({
      searchStoriesFull: async () => storiesFixture,
    });
    const handler = searchNewsStories(perigon);

    const args = newsStoriesArgs.parse({
      query: "merger",
      categories: ["Business"],
      topics: ["Markets"],
      newsStoryIds: ["c1"],
      sources: ["nyt.com"],
    });
    const result = await handler(args);

    const call = firstCallArgs<any>(perigon.searchStoriesFull);
    expect(call.q).toBe("merger");
    expect(call.category).toEqual(["Business"]);
    expect(call.topic).toEqual(["Markets"]);
    expect(call.clusterId).toEqual(["c1"]);
    expect(call.source).toEqual(["nyt.com"]);
    expect(call.showDuplicates).toBe(true);
    expect(call.showNumResults).toBe(false);

    expect(text(result)).toContain("Got 1 stories");
    expect(text(result)).toContain('<news_story id="story-1"');
  });

  test("isTopHeadlines:true overrides `from` to the last 24h", async () => {
    const perigon = createMockPerigon({
      searchStoriesFull: async () => storiesFixture,
    });
    const handler = searchNewsStories(perigon);
    const before = Date.now();
    const args = newsStoriesArgs.parse({ isTopHeadlines: true });
    await handler(args);
    const after = Date.now();
    const call = firstCallArgs<any>(perigon.searchStoriesFull);
    expect(call.from).toBeInstanceOf(Date);
    const fromMs = (call.from as Date).getTime();
    // Should be within ~24h before "after" (and not later than "before")
    const lowerBound = before - 24 * 60 * 60 * 1000 - 1000;
    const upperBound = after - 24 * 60 * 60 * 1000 + 1000;
    expect(fromMs).toBeGreaterThanOrEqual(lowerBound);
    expect(fromMs).toBeLessThanOrEqual(upperBound);
  });

  test("minSourceDiversity only included when defined", async () => {
    const perigon = createMockPerigon({
      searchStoriesFull: async () => storiesFixture,
    });
    await searchNewsStories(perigon)(newsStoriesArgs.parse({}));
    expect(firstCallArgs<any>(perigon.searchStoriesFull)).not.toHaveProperty(
      "minSourceDiversity"
    );

    const perigon2 = createMockPerigon({
      searchStoriesFull: async () => storiesFixture,
    });
    await searchNewsStories(perigon2)(
      newsStoriesArgs.parse({ minSourceDiversity: 0.05 })
    );
    expect(firstCallArgs<any>(perigon2.searchStoriesFull).minSourceDiversity).toBe(
      0.05
    );
  });

  test("sends filters on the wire and renders API-computed source fields", async () => {
    let capturedUrl = "";
    installFetchMock((input) => {
      capturedUrl = urlOf(input);
      return jsonResponse({
        ...storiesFixture,
        results: [
          {
            ...storiesFixture.results[0],
            totalCount: 40,
            uniqueCount: 30,
            uniqueSourcesCount: 10,
            sourceDiversity: 0.25,
          },
        ],
      });
    });

    const output = text(
      await searchNewsStories(new Perigon("test-key"))(
        newsStoriesArgs.parse({ minSourceDiversity: 0.2 })
      )
    );

    const url = new URL(capturedUrl);
    expect(url.pathname).toBe("/v1/stories/all");
    expect(url.searchParams.get("minSourceDiversity")).toBe("0.2");

    expect(output).toContain("Articles: 40 total, 30 unique");
    expect(output).toContain("Publishers: 10");
    expect(output).toContain("Source Diversity: 0.25");
    expect(output).not.toContain("Unique Sources");
  });

  test("does not accept language or label, which the stories API lacks", async () => {
    expect(newsStoriesArgs.shape).not.toHaveProperty("language");
    expect(newsStoriesArgs.shape).not.toHaveProperty("label");

    const perigon = createMockPerigon({
      searchStoriesFull: async () => storiesFixture,
    });
    await searchNewsStories(perigon)(
      newsStoriesArgs.parse({ language: ["en"], label: ["Opinion"] })
    );
    const call = firstCallArgs<any>(perigon.searchStoriesFull);
    expect(call).not.toHaveProperty("language");
    expect(call).not.toHaveProperty("label");
  });

  test("shows N/A when the API omits the source fields", async () => {
    const perigon = createMockPerigon({
      searchStoriesFull: async () => ({
        ...storiesFixture,
        results: [
          {
            ...storiesFixture.results[0],
            uniqueSources: ["a.com", "b.com"],
          },
        ],
      }),
    });
    const output = text(
      await searchNewsStories(perigon)(newsStoriesArgs.parse({})),
    );
    expect(output).toContain("Articles: N/A total, N/A unique");
    expect(output).toContain("Publishers: N/A");
    expect(output).toContain("Source Diversity: N/A");
  });

  test("returns noResults when numResults === 0", async () => {
    const perigon = createMockPerigon({
      searchStoriesFull: async () => emptyStoriesFixture,
    });
    const result = await searchNewsStories(perigon)(newsStoriesArgs.parse({}));
    expect(text(result)).toStartWith(
      "<note>No country filter was given, so the default country filter was applied: us."
    );
    expect(text(result)).toEndWith("No results found");
  });

  test("error path returns 'Error: Failed to search news stories:'", async () => {
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const perigon = createMockPerigon({
      searchStoriesFull: async () => {
        throw new HttpError(500, "boom");
      },
    });
    const result = await searchNewsStories(perigon)(newsStoriesArgs.parse({}));
    expect(text(result).startsWith("Error: Failed to search news stories:")).toBe(true);
    errorSpy.mockRestore();
  });

  test("rejects minSourceDiversity outside [0, 1]", () => {
    expect(() => newsStoriesArgs.parse({ minSourceDiversity: 1.1 })).toThrow();
    expect(() => newsStoriesArgs.parse({ minSourceDiversity: -0.1 })).toThrow();
  });
});
