import { describe, expect, spyOn, test } from "bun:test";
import { HttpError } from "../../../../worker/types/types";
import {
  articleCountsArgs,
  getArticleCounts,
} from "../../../../worker/mcp/tools/search/stats-article-counts";
import { articleCountsFixture } from "../../../helpers/fixtures";
import { createMockPerigon, firstCallArgs } from "../../../helpers/mock-perigon";

const text = (r: any) => r.content[0].text as string;

describe("getArticleCounts", () => {
  test("forwards filters and computes total articles", async () => {
    const perigon = createMockPerigon({
      getArticleCounts: async () => articleCountsFixture,
    });
    const args = articleCountsArgs.parse({
      q: "AI",
      country: ["us"],
      splitBy: "WEEK",
    });
    const result = await getArticleCounts(perigon)(args);

    const call = firstCallArgs<any>(perigon.getArticleCounts);
    expect(call.q).toBe("AI");
    expect(call.country).toEqual(["us"]);
    expect(call.splitBy).toBe("week");

    const t = text(result);
    expect(t).toContain("15 total articles (splitBy=WEEK)");
    expect(t).toContain('<count_bucket date="2024-01-01" count="10" />');
    expect(t).toContain('<count_bucket date="2024-01-02" count="5" />');
  });

  test("noResults when results is empty", async () => {
    const perigon = createMockPerigon({
      getArticleCounts: async () => ({ status: 200, results: [] }),
    });
    const result = await getArticleCounts(perigon)(articleCountsArgs.parse({}));
    expect(text(result)).toBe("No results found");
  });

  test("error path", async () => {
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const perigon = createMockPerigon({
      getArticleCounts: async () => {
        throw new HttpError(500, "boom");
      },
    });
    const result = await getArticleCounts(perigon)(articleCountsArgs.parse({}));
    expect(
      text(result).startsWith("Error: Failed to retrieve article counts:")
    ).toBe(true);
    errorSpy.mockRestore();
  });
});
