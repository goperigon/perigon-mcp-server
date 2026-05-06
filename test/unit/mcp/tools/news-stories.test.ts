import { describe, expect, spyOn, test } from "bun:test";
import { HttpError } from "../../../../worker/types/types";
import {
  newsStoriesArgs,
  searchNewsStories,
} from "../../../../worker/mcp/tools/search/news-stories";
import {
  emptyStoriesFixture,
  storiesFixture,
} from "../../../helpers/fixtures";
import { createMockPerigon, firstCallArgs } from "../../../helpers/mock-perigon";

const text = (r: any) => r.content[0].text as string;

describe("searchNewsStories", () => {
  test("forwards mapped params and renders story output", async () => {
    const perigon = createMockPerigon({
      searchStories: async () => storiesFixture,
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

    const call = firstCallArgs<any>(perigon.searchStories);
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
      searchStories: async () => storiesFixture,
    });
    const handler = searchNewsStories(perigon);
    const before = Date.now();
    const args = newsStoriesArgs.parse({ isTopHeadlines: true });
    await handler(args);
    const after = Date.now();
    const call = firstCallArgs<any>(perigon.searchStories);
    expect(call.from).toBeInstanceOf(Date);
    const fromMs = (call.from as Date).getTime();
    // Should be within ~24h before "after" (and not later than "before")
    const lowerBound = before - 24 * 60 * 60 * 1000 - 1000;
    const upperBound = after - 24 * 60 * 60 * 1000 + 1000;
    expect(fromMs).toBeGreaterThanOrEqual(lowerBound);
    expect(fromMs).toBeLessThanOrEqual(upperBound);
  });

  test("language/label/minSourceDiversity only included when defined", async () => {
    const perigon = createMockPerigon({
      searchStories: async () => storiesFixture,
    });
    const handler = searchNewsStories(perigon);
    await handler(newsStoriesArgs.parse({}));
    const call = firstCallArgs<any>(perigon.searchStories);
    expect(call).not.toHaveProperty("language");
    expect(call).not.toHaveProperty("label");
    expect(call).not.toHaveProperty("minSourceDiversity");

    const perigon2 = createMockPerigon({
      searchStories: async () => storiesFixture,
    });
    await searchNewsStories(perigon2)(
      newsStoriesArgs.parse({
        language: ["en"],
        label: ["Opinion"],
        minSourceDiversity: 0.05,
      })
    );
    const call2 = firstCallArgs<any>(perigon2.searchStories);
    expect(call2.language).toEqual(["en"]);
    expect(call2.label).toEqual(["Opinion"]);
    expect(call2.minSourceDiversity).toBe(0.05);
  });

  test("returns noResults when numResults === 0", async () => {
    const perigon = createMockPerigon({
      searchStories: async () => emptyStoriesFixture,
    });
    const result = await searchNewsStories(perigon)(newsStoriesArgs.parse({}));
    expect(text(result)).toBe("No results found");
  });

  test("error path returns 'Error: Failed to search news stories:'", async () => {
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const perigon = createMockPerigon({
      searchStories: async () => {
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
