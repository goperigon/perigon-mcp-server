import { describe, expect, spyOn, test } from "bun:test";
import { HttpError } from "../../../../worker/types/types";
import {
  searchWikipedia,
  wikipediaArgs,
} from "../../../../worker/mcp/tools/search/wikipedia";
import { wikipediaFixture } from "../../../helpers/fixtures";
import { createMockPerigon, firstCallArgs } from "../../../helpers/mock-perigon";

const text = (r: any) => r.content[0].text as string;

describe("searchWikipedia", () => {
  test("maps query → q and forwards every filter", async () => {
    const perigon = createMockPerigon({
      searchWikipedia: async () => wikipediaFixture,
    });
    const args = wikipediaArgs.parse({
      query: "AI safety",
      title: "Test",
      summary: "summary phrase",
      text: "long text",
      reference: "doi.org",
      wikiCode: ["enwiki"],
      wikidataId: ["Q42"],
      wikidataInstanceOfId: ["Q5"],
      wikidataInstanceOfLabel: ["human"],
      category: ["Tests"],
      withPageviews: true,
      pageviewsFrom: 100,
      pageviewsTo: 1000,
      wikiRevisionFrom: "2024-01-01",
      wikiRevisionTo: "2024-06-01",
      scrapedAtFrom: "",
      scrapedAtTo: "",
    });
    const result = await searchWikipedia(perigon)(args);

    const call = firstCallArgs<any>(perigon.searchWikipedia);
    expect(call.q).toBe("AI AND safety");
    expect(call.title).toBe("Test");
    expect(call.wikidataId).toEqual(["Q42"]);
    expect(call.withPageviews).toBe(true);
    expect(call.pageviewsFrom).toBe(100);
    expect(call.wikiRevisionFrom).toBeInstanceOf(Date);
    expect(call.wikiRevisionTo).toBeInstanceOf(Date);
    // Empty strings should transform to undefined
    expect(call.scrapedAtFrom).toBeUndefined();
    expect(call.scrapedAtTo).toBeUndefined();
    expect(call.showNumResults).toBe(true);

    expect(text(result)).toContain('<wikipedia_page id="w1"');
    expect(text(result)).toContain("Test Page");
  });

  test("PINNED BEHAVIOR: sortBy is undefined when omitted (`.default().optional()` chain order)", () => {
    // The schema is `sortByEnum.default("relevance").optional()`. In zod 3 the
    // trailing `.optional()` wraps the default, so passing nothing returns
    // undefined rather than the documented default. Pin this so a future
    // schema rewrite is forced to consider intent.
    const parsed = wikipediaArgs.parse({});
    expect(parsed.sortBy).toBeUndefined();
  });

  test("returns noResults when numResults === 0", async () => {
    const perigon = createMockPerigon({
      searchWikipedia: async () => ({ status: 200, numResults: 0, results: [] }),
    });
    const result = await searchWikipedia(perigon)(wikipediaArgs.parse({}));
    expect(text(result)).toBe("No results found");
  });

  test("error path", async () => {
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const perigon = createMockPerigon({
      searchWikipedia: async () => {
        throw new HttpError(500, "boom");
      },
    });
    const result = await searchWikipedia(perigon)(wikipediaArgs.parse({}));
    expect(text(result).startsWith("Error: Failed to search Wikipedia:")).toBe(true);
    errorSpy.mockRestore();
  });
});
