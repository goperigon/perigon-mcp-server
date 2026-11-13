import { describe, expect, test } from "bun:test";
import {
  getStoryStats,
  storyStatsArgs,
} from "../../../../worker/mcp/tools/platform/story-stats";
import { createMockPerigon, firstRequestOf } from "../../../helpers/mock-perigon";
import { getResultText as text } from "../../../helpers/fixtures";

describe("getStoryStats", () => {
  test("volume defaults to monthly buckets", async () => {
    const perigon = createMockPerigon({
      getStoryStats: async () => ({
        status: 200,
        results: [
          { date: "2024-01-01T00:00:00Z", numResults: 3 },
          { date: "2024-02-01T00:00:00Z", numResults: 4 },
        ],
      }),
    });

    const result = await getStoryStats(perigon)(
      storyStatsArgs.parse({ metric: "volume" })
    );

    expect(firstRequestOf(perigon, "getStoryStats").splitBy).toBe("month");
    const t = text(result);
    expect(t).toContain('<bucket date="2024-01-01T00:00:00Z" count="3" />');
    expect(t).toContain('<bucket date="2024-02-01T00:00:00Z" count="4" />');
  });

  test("volume with splitBy none sends none and renders the undated total", async () => {
    const perigon = createMockPerigon({
      getStoryStats: async () => ({
        status: 200,
        results: [{ numResults: 42 }],
      }),
    });

    const result = await getStoryStats(perigon)(
      storyStatsArgs.parse({ metric: "volume", splitBy: "none" })
    );

    expect(firstRequestOf(perigon, "getStoryStats").splitBy).toBe("none");
    expect(text(result)).toBe(
      '<story_volume>\n<bucket count="42" />\n</story_volume>'
    );
  });

  test("velocity requires a clusterId", async () => {
    const perigon = createMockPerigon({});

    const result = await getStoryStats(perigon)(
      storyStatsArgs.parse({ metric: "velocity" })
    );

    expect(text(result)).toContain("requires at least one clusterId");
  });
});
