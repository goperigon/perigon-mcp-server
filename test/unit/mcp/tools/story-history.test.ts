import { describe, expect, spyOn, test } from "bun:test";
import { HttpError } from "../../../../worker/types/types";
import {
  searchStoryHistory,
  storyHistoryArgs,
} from "../../../../worker/mcp/tools/search/story-history";
import { storyHistoryFixture } from "../../../helpers/fixtures";
import { createMockPerigon, firstCallArgs } from "../../../helpers/mock-perigon";

const text = (r: any) => r.content[0].text as string;

describe("searchStoryHistory", () => {
  test("maps clusterIds → clusterId and forwards args", async () => {
    const perigon = createMockPerigon({
      searchStoriesHistory: async () => storyHistoryFixture,
    });
    const args = storyHistoryArgs.parse({
      clusterIds: ["c1", "c2"],
      from: "2024-01-01",
      to: "2024-02-01",
      sortBy: "createdAt",
      changelogExists: true,
    });
    const result = await searchStoryHistory(perigon)(args);

    const call = firstCallArgs<any>(perigon.searchStoriesHistory);
    expect(call.clusterId).toEqual(["c1", "c2"]);
    expect(call.from).toBeInstanceOf(Date);
    expect(call.to).toBeInstanceOf(Date);
    expect(call.sortBy).toBe("createdAt");
    expect(call.changelogExists).toBe(true);
    expect(text(result)).toContain('<story_history cluster_id="c1">');
    expect(text(result)).toContain("Title: Cluster name");
    expect(text(result)).toContain("Changelog: Initial");
    expect(text(result)).toContain("- Point one");
  });

  test('omits Title/Changelog/KeyPoints when missing', async () => {
    const perigon = createMockPerigon({
      searchStoriesHistory: async () => ({
        status: 200,
        numResults: 1,
        results: [
          {
            clusterId: "c1",
            createdAt: "2024-01-01T00:00:00Z",
            triggeredAt: "2024-01-01T01:00:00Z",
            summary: "summary",
            shortSummary: "short",
            name: null,
            changelog: null,
            keyPoints: [],
            questions: null,
          },
        ],
      }),
    });
    const result = await searchStoryHistory(perigon)(storyHistoryArgs.parse({}));
    const t = text(result);
    expect(t).not.toContain("Title:");
    expect(t).not.toContain("Changelog:");
    expect(t).not.toContain("Key Points:");
  });

  test("size has a max of 100", () => {
    expect(() => storyHistoryArgs.parse({ size: 101 })).toThrow();
    expect(storyHistoryArgs.parse({ size: 100 }).size).toBe(100);
  });

  test("PINNED BEHAVIOR: sortBy default is shadowed by `.optional()`; size still defaults to 10", () => {
    // The schema is `.enum(...).default("createdAt").optional()`, so the
    // trailing `.optional()` wraps the default and returns undefined when
    // omitted. `size` doesn't have the trailing `.optional()` so its default
    // does take effect. Pin the actual behavior.
    const parsed = storyHistoryArgs.parse({});
    expect(parsed.sortBy).toBeUndefined();
    expect(parsed.size).toBe(10);
  });

  test("error path returns 'Error: Failed to search story history:'", async () => {
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const perigon = createMockPerigon({
      searchStoriesHistory: async () => {
        throw new HttpError(500, "boom");
      },
    });
    const result = await searchStoryHistory(perigon)(storyHistoryArgs.parse({}));
    expect(text(result).startsWith("Error: Failed to search story history:")).toBe(true);
    errorSpy.mockRestore();
  });

  test("returns noResults when numResults === 0", async () => {
    const perigon = createMockPerigon({
      searchStoriesHistory: async () => ({ status: 200, numResults: 0, results: [] }),
    });
    const result = await searchStoryHistory(perigon)(storyHistoryArgs.parse({}));
    expect(text(result)).toBe("No results found");
  });
});
