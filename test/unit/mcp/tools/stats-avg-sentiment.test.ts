import { describe, expect, spyOn, test } from "bun:test";
import { HttpError } from "../../../../worker/types/types";
import {
  avgSentimentArgs,
  getAvgSentiment,
} from "../../../../worker/mcp/tools/search/stats-avg-sentiment";
import { avgSentimentFixture } from "../../../helpers/fixtures";
import { createMockPerigon, firstCallArgs } from "../../../helpers/mock-perigon";

const text = (r: any) => r.content[0].text as string;

describe("getAvgSentiment", () => {
  test("forwards filters and lowercases splitBy", async () => {
    const perigon = createMockPerigon({
      getAvgSentiment: async () => avgSentimentFixture,
    });
    const args = avgSentimentArgs.parse({
      q: "AI",
      from: "2024-01-01",
      source: ["nyt.com"],
      splitBy: "DAY",
    });
    const result = await getAvgSentiment(perigon)(args);

    const call = firstCallArgs<any>(perigon.getAvgSentiment);
    expect(call.q).toBe("AI");
    expect(call.from).toBeInstanceOf(Date);
    expect(call.source).toEqual(["nyt.com"]);
    expect(call.splitBy).toBe("day"); // lowercased

    const t = text(result);
    expect(t).toContain("Got 2 sentiment bucket(s) (splitBy=DAY)");
    expect(t).toContain('<sentiment_bucket date="2024-01-01" articles="10">');
    expect(t).toContain("Positive: 0.5000");
    expect(t).toContain("Negative: 0.6000");
  });

  test("'NONE' splitBy → undefined on the SDK call but display string is 'NONE'", async () => {
    const perigon = createMockPerigon({
      getAvgSentiment: async () => avgSentimentFixture,
    });
    const result = await getAvgSentiment(perigon)(
      avgSentimentArgs.parse({ splitBy: "NONE" })
    );
    const call = firstCallArgs<any>(perigon.getAvgSentiment);
    expect(call.splitBy).toBeUndefined();
    expect(text(result)).toContain("(splitBy=NONE)");
  });

  test("noResults when results is empty", async () => {
    const perigon = createMockPerigon({
      getAvgSentiment: async () => ({ status: 200, results: [] }),
    });
    const result = await getAvgSentiment(perigon)(avgSentimentArgs.parse({}));
    expect(text(result)).toBe("No results found");
  });

  test("error path", async () => {
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const perigon = createMockPerigon({
      getAvgSentiment: async () => {
        throw new HttpError(500, "boom");
      },
    });
    const result = await getAvgSentiment(perigon)(avgSentimentArgs.parse({}));
    expect(
      text(result).startsWith("Error: Failed to retrieve average sentiment:")
    ).toBe(true);
    errorSpy.mockRestore();
  });
});
