import { describe, expect, spyOn, test } from "bun:test";
import { HttpError } from "../../../../worker/types/types";
import {
  companyNewsArgs,
  getCompanyNews,
} from "../../../../worker/mcp/tools/use-cases/company-news";
import {
  articlesFixture,
  companiesFixture,
  emptyArticlesFixture,
} from "../../../helpers/fixtures";
import { createMockPerigon, firstCallArgs } from "../../../helpers/mock-perigon";

const text = (r: any) => r.content[0].text as string;

describe("getCompanyNews", () => {
  test("looks up the company, then searches recent articles", async () => {
    const perigon = createMockPerigon({
      searchCompanies: async () => companiesFixture,
      searchArticles: async () => articlesFixture,
    });
    const args = companyNewsArgs.parse({
      companyName: "Acme",
      days: 7,
      limit: 5,
    });
    const result = await getCompanyNews(perigon)(args);

    expect(perigon.searchCompanies).toHaveBeenCalledTimes(1);
    expect(firstCallArgs<any>(perigon.searchCompanies)).toEqual({
      q: "Acme",
      size: 1,
    });

    const articleCall = firstCallArgs<any>(perigon.searchArticles);
    expect(articleCall.q).toBe("Acme");
    expect(articleCall.country).toEqual(["us"]);
    expect(articleCall.size).toBe(5);
    expect(articleCall.sortBy).toBe("date");
    expect(articleCall.showNumResults).toBe(true);
    expect(articleCall.showReprints).toBe(false);
    expect(articleCall.from).toBeInstanceOf(Date);
    expect(articleCall.to).toBeInstanceOf(Date);
    // from should be ~7 days before to
    const diffMs =
      (articleCall.to as Date).getTime() - (articleCall.from as Date).getTime();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    expect(Math.abs(diffMs - sevenDays)).toBeLessThan(2000);

    const t = text(result);
    expect(t).toContain('Recent news for "Acme"');
    expect(t).toContain("<company-context>");
    expect(t).toContain("Industry: Tech");
    expect(t).toContain('<article id="a1"');
  });

  test("falls through cleanly when company lookup throws", async () => {
    const warnSpy = spyOn(console, "warn").mockImplementation(() => {});
    const perigon = createMockPerigon({
      searchCompanies: async () => {
        throw new HttpError(500, "down");
      },
      searchArticles: async () => articlesFixture,
    });
    const result = await getCompanyNews(perigon)(
      companyNewsArgs.parse({ companyName: "Acme" })
    );
    expect(perigon.searchArticles).toHaveBeenCalledTimes(1);
    expect(text(result)).not.toContain("<company-context>");
    warnSpy.mockRestore();
  });

  test("returns no-recent-news message (NOT noResults) when articles empty", async () => {
    const perigon = createMockPerigon({
      searchCompanies: async () => ({ ...companiesFixture, numResults: 0, results: [] }),
      searchArticles: async () => emptyArticlesFixture,
    });
    const result = await getCompanyNews(perigon)(
      companyNewsArgs.parse({ companyName: "Ghost", days: 14 })
    );
    expect(text(result)).toContain('No recent news found for "Ghost"');
    expect(text(result)).toContain("last 14 days");
  });

  test("validates inputs", () => {
    expect(() => companyNewsArgs.parse({ companyName: "" })).toThrow();
    expect(() =>
      companyNewsArgs.parse({ companyName: "Acme", days: 0 })
    ).toThrow();
    expect(() =>
      companyNewsArgs.parse({ companyName: "Acme", limit: 200 })
    ).toThrow();
    expect(() =>
      companyNewsArgs.parse({ companyName: "Acme", country: "USA" })
    ).toThrow();
  });

  test("country defaults to 'us' and limit defaults to 10", () => {
    const parsed = companyNewsArgs.parse({ companyName: "Acme" });
    expect(parsed.country).toBe("us");
    expect(parsed.limit).toBe(10);
    expect(parsed.days).toBe(7);
  });

  test("error path", async () => {
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const warnSpy = spyOn(console, "warn").mockImplementation(() => {});
    const perigon = createMockPerigon({
      searchCompanies: async () => companiesFixture,
      searchArticles: async () => {
        throw new HttpError(500, "boom");
      },
    });
    const result = await getCompanyNews(perigon)(
      companyNewsArgs.parse({ companyName: "Acme" })
    );
    expect(text(result).startsWith('Error: Failed to get news for company "Acme":')).toBe(true);
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });
});
