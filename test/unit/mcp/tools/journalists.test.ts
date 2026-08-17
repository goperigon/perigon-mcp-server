import { describe, expect, spyOn, test } from "bun:test";
import { HttpError } from "../../../../worker/types/types";
import {
  journalistsArgs,
  searchJournalists,
} from "../../../../worker/mcp/tools/search/journalists";
import { journalistsFixture } from "../../../helpers/fixtures";
import { createMockPerigon, firstCallArgs } from "../../../helpers/mock-perigon";

const text = (r: any) => r.content[0].text as string;

describe("searchJournalists", () => {
  test("maps query → q, sources → source, labels → label, categories → category, topics → topic", async () => {
    const perigon = createMockPerigon({
      searchJournalistsFull: async () => journalistsFixture,
    });
    const args = journalistsArgs.parse({
      query: "tech reporter",
      sources: ["nyt.com"],
      labels: ["Opinion"],
      categories: ["Tech"],
      topics: ["AI"],
      twitter: "janedoe",
      minMonthlyPosts: 1,
      maxMonthlyPosts: 100,
    });
    const result = await searchJournalists(perigon)(args);

    const call = firstCallArgs<any>(perigon.searchJournalistsFull);
    expect(call.q).toBe("tech AND reporter");
    expect(call.source).toEqual(["nyt.com"]);
    expect(call.label).toEqual(["Opinion"]);
    expect(call.category).toEqual(["Tech"]);
    expect(call.topic).toEqual(["AI"]);
    expect(call.twitter).toBe("janedoe");
    expect(call.minMonthlyPosts).toBe(1);
    expect(call.maxMonthlyPosts).toBe(100);
    expect(call.showNumResults).toBe(true);
    expect(text(result)).toContain('<journalist id="j1"');
  });

  test("countries has no default and lowercases when provided", async () => {
    const perigon = createMockPerigon({
      searchJournalistsFull: async () => journalistsFixture,
    });
    await searchJournalists(perigon)(journalistsArgs.parse({}));
    expect(firstCallArgs<any>(perigon.searchJournalistsFull).country).toBeUndefined();

    const perigon2 = createMockPerigon({
      searchJournalistsFull: async () => journalistsFixture,
    });
    await searchJournalists(perigon2)(
      journalistsArgs.parse({ countries: ["GB", "Jp"] })
    );
    expect(firstCallArgs<any>(perigon2.searchJournalistsFull).country).toEqual(["gb", "jp"]);
  });

  test("location filters are forwarded verbatim", async () => {
    const perigon = createMockPerigon({
      searchJournalistsFull: async () => journalistsFixture,
    });
    await searchJournalists(perigon)(
      journalistsArgs.parse({
        locationCountry: ["US"],
        locationState: ["NY"],
        locationCity: ["New York"],
      })
    );
    const call = firstCallArgs<any>(perigon.searchJournalistsFull);
    expect(call.locationCountry).toEqual(["us"]);
    expect(call.locationState).toEqual(["NY"]);
    expect(call.locationCity).toEqual(["New York"]);
  });

  test("returns noResults when numResults === 0", async () => {
    const perigon = createMockPerigon({
      searchJournalistsFull: async () => ({ status: 200, numResults: 0, results: [] }),
    });
    const result = await searchJournalists(perigon)(journalistsArgs.parse({}));
    expect(text(result)).toBe("No results found");
  });

  test("error path", async () => {
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const perigon = createMockPerigon({
      searchJournalistsFull: async () => {
        throw new HttpError(500, "boom");
      },
    });
    const result = await searchJournalists(perigon)(journalistsArgs.parse({}));
    expect(text(result).startsWith("Error: Failed to search journalists:")).toBe(true);
    errorSpy.mockRestore();
  });
});
