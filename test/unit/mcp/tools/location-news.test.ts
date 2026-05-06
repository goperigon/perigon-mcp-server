import { describe, expect, spyOn, test } from "bun:test";
import { HttpError } from "../../../../worker/types/types";
import {
  getLocationNews,
  locationNewsArgs,
} from "../../../../worker/mcp/tools/use-cases/location-news";
import {
  articlesFixture,
  emptyArticlesFixture,
} from "../../../helpers/fixtures";
import { createMockPerigon, firstCallArgs } from "../../../helpers/mock-perigon";

const text = (r: any) => r.content[0].text as string;

describe("getLocationNews", () => {
  test("auto-detects 2-letter US state codes and uppercases", async () => {
    const perigon = createMockPerigon({
      searchArticles: async () => articlesFixture,
    });
    await getLocationNews(perigon)(
      locationNewsArgs.parse({ location: "tx" })
    );
    const call = firstCallArgs<any>(perigon.searchArticles);
    expect(call.state).toEqual(["TX"]);
    expect(call.q).toBe("tx");
  });

  test("auto-detects 2-letter country codes and lowercases (when not also a state code)", async () => {
    const perigon = createMockPerigon({
      searchArticles: async () => articlesFixture,
    });
    // FR is in commonCountries but NOT in usStates — handler treats it as a country.
    await getLocationNews(perigon)(
      locationNewsArgs.parse({ location: "FR" })
    );
    const call = firstCallArgs<any>(perigon.searchArticles);
    expect(call.country).toEqual(["fr"]);
  });

  test("PINNED BEHAVIOR: codes in both US_STATES and COMMON_COUNTRIES (e.g. DE) auto-detect as state", async () => {
    const perigon = createMockPerigon({
      searchArticles: async () => articlesFixture,
    });
    // 'de' is BOTH Delaware (US_STATES) and Germany (COMMON_COUNTRIES).
    // The handler checks US_STATES first, so state wins.
    await getLocationNews(perigon)(
      locationNewsArgs.parse({ location: "DE" })
    );
    const call = firstCallArgs<any>(perigon.searchArticles);
    expect(call.state).toEqual(["DE"]);
    expect(call.country).toBeUndefined();
  });

  test("longer names default to city", async () => {
    const perigon = createMockPerigon({
      searchArticles: async () => articlesFixture,
    });
    const result = await getLocationNews(perigon)(
      locationNewsArgs.parse({ location: "Austin" })
    );
    expect(firstCallArgs<any>(perigon.searchArticles).city).toEqual(["Austin"]);
    expect(text(result)).toContain('Recent news for city "Austin"');
  });

  test("explicit locationType=country lowercases", async () => {
    const perigon = createMockPerigon({
      searchArticles: async () => articlesFixture,
    });
    await getLocationNews(perigon)(
      locationNewsArgs.parse({ location: "Germany", locationType: "country" })
    );
    expect(firstCallArgs<any>(perigon.searchArticles).country).toEqual([
      "germany",
    ]);
  });

  test("explicit locationType=state uppercases", async () => {
    const perigon = createMockPerigon({
      searchArticles: async () => articlesFixture,
    });
    await getLocationNews(perigon)(
      locationNewsArgs.parse({ location: "Texas", locationType: "state" })
    );
    expect(firstCallArgs<any>(perigon.searchArticles).state).toEqual([
      "TEXAS",
    ]);
  });

  test("returns no-recent-news message when articles empty", async () => {
    const perigon = createMockPerigon({
      searchArticles: async () => emptyArticlesFixture,
    });
    const result = await getLocationNews(perigon)(
      locationNewsArgs.parse({ location: "Atlantis", days: 5 })
    );
    expect(text(result)).toContain('No recent news found for "Atlantis"');
    expect(text(result)).toContain("last 5 days");
  });

  test("validates inputs", () => {
    expect(() => locationNewsArgs.parse({ location: "" })).toThrow();
    expect(() =>
      locationNewsArgs.parse({ location: "Austin", days: 0 })
    ).toThrow();
    expect(() =>
      locationNewsArgs.parse({ location: "Austin", limit: 200 })
    ).toThrow();
    expect(() =>
      locationNewsArgs.parse({ location: "Austin", locationType: "planet" as any })
    ).toThrow();
  });

  test("error path", async () => {
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const perigon = createMockPerigon({
      searchArticles: async () => {
        throw new HttpError(500, "boom");
      },
    });
    const result = await getLocationNews(perigon)(
      locationNewsArgs.parse({ location: "Austin" })
    );
    expect(text(result).startsWith('Error: Failed to get news for location "Austin":')).toBe(true);
    errorSpy.mockRestore();
  });
});
