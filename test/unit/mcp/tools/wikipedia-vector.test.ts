import { describe, expect, spyOn, test } from "bun:test";
import { HttpError } from "../../../../worker/types/types";
import {
  searchVectorWikipedia,
  wikipediaVectorArgs,
} from "../../../../worker/mcp/tools/search/wikipedia-vector";
import { wikipediaVectorFixture } from "../../../helpers/fixtures";
import { createMockPerigon, firstCallArgs } from "../../../helpers/mock-perigon";

const text = (r: any) => r.content[0].text as string;

describe("searchVectorWikipedia", () => {
  test("query is required", () => {
    expect(() => wikipediaVectorArgs.parse({})).toThrow();
  });

  test("forwards prompt and pagination, omits filter when empty", async () => {
    const perigon = createMockPerigon({
      vectorSearchWikipedia: async () => wikipediaVectorFixture,
    });
    const args = wikipediaVectorArgs.parse({
      query: "OpenAI history",
      page: 3,
      size: 25,
    });
    const result = await searchVectorWikipedia(perigon)(args);

    const call = firstCallArgs<any>(perigon.vectorSearchWikipedia);
    expect(call.wikipediaSearchParams.prompt).toBe("OpenAI history");
    expect(call.wikipediaSearchParams.page).toBe(3);
    expect(call.wikipediaSearchParams.size).toBe(25);
    expect(text(result)).toContain(
      "Returned 1 Wikipedia pages (vector search) (page 3, requested size 25)"
    );
    // filter object should NOT be present when no filter fields are set
    expect(call.wikipediaSearchParams).not.toHaveProperty("filter");
  });

  test("includes filter only when at least one filter field is provided", async () => {
    const perigon = createMockPerigon({
      vectorSearchWikipedia: async () => wikipediaVectorFixture,
    });
    const args = wikipediaVectorArgs.parse({
      query: "x",
      wikidataId: ["Q42"],
      category: ["Tests"],
      pageviewsFrom: 100,
      wikiRevisionFrom: "2024-01-01",
    });
    await searchVectorWikipedia(perigon)(args);
    const call = firstCallArgs<any>(perigon.vectorSearchWikipedia);
    expect(call.wikipediaSearchParams.filter).toEqual({
      wikidataId: ["Q42"],
      category: ["Tests"],
    });
    expect(call.wikipediaSearchParams.pageviewsFrom).toBe(100);
    expect(call.wikipediaSearchParams.wikiRevisionFrom).toBeInstanceOf(Date);
  });

  test("renders Similarity Score from scored.score", async () => {
    const perigon = createMockPerigon({
      vectorSearchWikipedia: async () => wikipediaVectorFixture,
    });
    const result = await searchVectorWikipedia(perigon)(
      wikipediaVectorArgs.parse({ query: "x" })
    );
    expect(text(result)).toContain("Similarity Score: 0.91");
  });

  test("noResults when result.results is empty", async () => {
    const perigon = createMockPerigon({
      vectorSearchWikipedia: async () => ({ results: [] }),
    });
    const result = await searchVectorWikipedia(perigon)(
      wikipediaVectorArgs.parse({ query: "x" })
    );
    expect(text(result)).toBe("No results found");
  });

  test("noResults when result.results is undefined", async () => {
    const perigon = createMockPerigon({
      vectorSearchWikipedia: async () => ({}),
    });
    const result = await searchVectorWikipedia(perigon)(
      wikipediaVectorArgs.parse({ query: "x" })
    );
    expect(text(result)).toBe("No results found");
  });

  test("error path", async () => {
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const perigon = createMockPerigon({
      vectorSearchWikipedia: async () => {
        throw new HttpError(500, "boom");
      },
    });
    const result = await searchVectorWikipedia(perigon)(
      wikipediaVectorArgs.parse({ query: "x" })
    );
    expect(
      text(result).startsWith("Error: Failed to search Wikipedia with vector:")
    ).toBe(true);
    errorSpy.mockRestore();
  });
});
