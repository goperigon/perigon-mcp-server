import { describe, expect, spyOn, test } from "bun:test";
import { HttpError } from "../../../../worker/types/types";
import {
  getPersonNews,
  personNewsArgs,
} from "../../../../worker/mcp/tools/use-cases/person-news";
import {
  articlesFixture,
  emptyArticlesFixture,
  peopleFixture,
} from "../../../helpers/fixtures";
import { createMockPerigon, firstCallArgs } from "../../../helpers/mock-perigon";

const text = (r: any) => r.content[0].text as string;

describe("getPersonNews", () => {
  test("looks up the person, then searches recent articles", async () => {
    const perigon = createMockPerigon({
      searchPeople: async () => peopleFixture,
      searchArticles: async () => articlesFixture,
    });
    const result = await getPersonNews(perigon)(
      personNewsArgs.parse({ personName: "Alice" })
    );

    expect(perigon.searchPeople).toHaveBeenCalledTimes(1);
    expect(firstCallArgs<any>(perigon.searchPeople)).toEqual({
      name: "Alice",
      size: 1,
    });
    const articleCall = firstCallArgs<any>(perigon.searchArticles);
    expect(articleCall.q).toBe("Alice");
    expect(articleCall.sortBy).toBe("date");
    expect(articleCall.country).toEqual(["us"]);
    const t = text(result);
    expect(t).toContain('Recent news for "Alice"');
    expect(t).toContain("<person-context>");
    expect(t).toContain("Occupation: engineer, author");
    expect(t).toContain("Position: CEO");
  });

  test("falls through cleanly when person lookup throws", async () => {
    const warnSpy = spyOn(console, "warn").mockImplementation(() => {});
    const perigon = createMockPerigon({
      searchPeople: async () => {
        throw new HttpError(500, "down");
      },
      searchArticles: async () => articlesFixture,
    });
    const result = await getPersonNews(perigon)(
      personNewsArgs.parse({ personName: "Alice" })
    );
    expect(text(result)).not.toContain("<person-context>");
    expect(text(result)).toContain("<articles>");
    warnSpy.mockRestore();
  });

  test("returns no-recent-news message when articles empty", async () => {
    const perigon = createMockPerigon({
      searchPeople: async () => ({ status: 200, numResults: 0, results: [] }),
      searchArticles: async () => emptyArticlesFixture,
    });
    const result = await getPersonNews(perigon)(
      personNewsArgs.parse({ personName: "Ghost", days: 30 })
    );
    expect(text(result)).toContain('No recent news found for "Ghost"');
    expect(text(result)).toContain("last 30 days");
  });

  test("validates inputs", () => {
    expect(() => personNewsArgs.parse({ personName: "" })).toThrow();
    expect(() =>
      personNewsArgs.parse({ personName: "Alice", country: "USA" })
    ).toThrow();
  });

  test("error path", async () => {
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const warnSpy = spyOn(console, "warn").mockImplementation(() => {});
    const perigon = createMockPerigon({
      searchPeople: async () => peopleFixture,
      searchArticles: async () => {
        throw new HttpError(500, "boom");
      },
    });
    const result = await getPersonNews(perigon)(
      personNewsArgs.parse({ personName: "Alice" })
    );
    expect(text(result).startsWith('Error: Failed to get news for person "Alice":')).toBe(true);
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });
});
