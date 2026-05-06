import { describe, expect, spyOn, test } from "bun:test";
import { HttpError } from "../../../../worker/types/types";
import {
  searchSources,
  sourcesArgs,
} from "../../../../worker/mcp/tools/search/sources";
import { sourcesFixture } from "../../../helpers/fixtures";
import { createMockPerigon, firstCallArgs } from "../../../helpers/mock-perigon";

const text = (r: any) => r.content[0].text as string;

describe("searchSources", () => {
  test("maps cities/states/countries → sourceCity/sourceState/sourceCountry, domains → domain", async () => {
    const perigon = createMockPerigon({
      searchSources: async () => sourcesFixture,
    });
    const args = sourcesArgs.parse({
      cities: ["NYC"],
      states: ["ny"],
      countries: ["US"],
      domains: ["nyt.com"],
      sourceGroup: "top10",
      paywall: true,
      minMonthlyPosts: 5,
      maxMonthlyPosts: 50,
      minMonthlyVisits: 1000,
      maxMonthlyVisits: 1_000_000,
      name: "New York",
    });
    const result = await searchSources(perigon)(args);
    const call = firstCallArgs<any>(perigon.searchSources);

    expect(call.sourceCity).toEqual(["NYC"]);
    expect(call.sourceState).toEqual(["NY"]);
    expect(call.sourceCountry).toEqual(["us"]);
    expect(call.domain).toEqual(["nyt.com"]);
    expect(call.sourceGroup).toBe("top10");
    expect(call.paywall).toBe(true);
    expect(call.minMonthlyPosts).toBe(5);
    expect(call.maxMonthlyPosts).toBe(50);
    expect(call.minMonthlyVisits).toBe(1000);
    expect(call.maxMonthlyVisits).toBe(1_000_000);
    expect(call.name).toBe("New AND York");
    expect(call.showNumResults).toBe(true);
    expect(text(result)).toContain('<source name="Example">');
  });

  test("PINNED BUG: sortBy is accepted but never forwarded to the SDK", async () => {
    // Document existing behavior: the schema accepts sortBy but the handler
    // doesn't pass it through. If this changes, update the handler too.
    const perigon = createMockPerigon({
      searchSources: async () => sourcesFixture,
    });
    await searchSources(perigon)(
      sourcesArgs.parse({ sortBy: "createdAt" })
    );
    const call = firstCallArgs<any>(perigon.searchSources);
    expect(call).not.toHaveProperty("sortBy");
  });

  test("returns noResults when numResults === 0", async () => {
    const perigon = createMockPerigon({
      searchSources: async () => ({ status: 200, numResults: 0, results: [] }),
    });
    const result = await searchSources(perigon)(sourcesArgs.parse({}));
    expect(text(result)).toBe("No results found");
  });

  test("error path", async () => {
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const perigon = createMockPerigon({
      searchSources: async () => {
        throw new HttpError(500, "boom");
      },
    });
    const result = await searchSources(perigon)(sourcesArgs.parse({}));
    expect(text(result).startsWith("Error: Failed to search sources:")).toBe(true);
    errorSpy.mockRestore();
  });
});
