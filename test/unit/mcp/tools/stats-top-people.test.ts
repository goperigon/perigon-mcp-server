import { describe, expect, spyOn, test } from "bun:test";
import { HttpError } from "../../../../worker/types/types";
import {
  getTopPeople,
  topPeopleArgs,
} from "../../../../worker/mcp/tools/search/stats-top-people";
import { topPeopleFixture } from "../../../helpers/fixtures";
import { createMockPerigon, firstCallArgs } from "../../../helpers/mock-perigon";

const text = (r: any) => r.content[0].text as string;

describe("getTopPeople", () => {
  test("forwards baseline/current windows and size; defaults normalizeByDay=true and size=10", async () => {
    const perigon = createMockPerigon({
      getTopPeople: async () => topPeopleFixture,
    });
    const args = topPeopleArgs.parse({
      currentFrom: "2024-01-01",
      currentTo: "2024-01-04",
      baselineFrom: "2023-12-01",
      baselineTo: "2024-01-01",
    });
    await getTopPeople(perigon)(args);
    const call = firstCallArgs<any>(perigon.getTopPeople);
    expect(call.currentFrom).toBeInstanceOf(Date);
    expect(call.baselineFrom).toBeInstanceOf(Date);
    expect(call.normalizeByDay).toBe(true);
    expect(call.size).toBe(10);
  });

  test("escapes & and \" in name/description/occupation", async () => {
    const perigon = createMockPerigon({
      getTopPeople: async () => topPeopleFixture,
    });
    const result = await getTopPeople(perigon)(topPeopleArgs.parse({}));
    const t = text(result);
    expect(t).toContain('name="Alice &amp; co"');
    expect(t).toContain('description="has &quot;quotes&quot;"');
  });

  test("rates rounded to 2 decimal places", async () => {
    const perigon = createMockPerigon({
      getTopPeople: async () => topPeopleFixture,
    });
    const result = await getTopPeople(perigon)(topPeopleArgs.parse({}));
    expect(text(result)).toContain('current_rate_per_day="16.60"');
    expect(text(result)).toContain('baseline_rate_per_day="0.33"');
    expect(text(result)).toContain('spike_score="4.50"');
  });

  test("rejects size > 100 and < 1", () => {
    expect(() => topPeopleArgs.parse({ size: 0 })).toThrow();
    expect(() => topPeopleArgs.parse({ size: 101 })).toThrow();
  });

  test("noResults when data is empty", async () => {
    const perigon = createMockPerigon({
      getTopPeople: async () => ({ total: 0, data: [] }),
    });
    const result = await getTopPeople(perigon)(topPeopleArgs.parse({}));
    expect(text(result)).toBe("No results found");
  });

  test("error path", async () => {
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const perigon = createMockPerigon({
      getTopPeople: async () => {
        throw new HttpError(500, "boom");
      },
    });
    const result = await getTopPeople(perigon)(topPeopleArgs.parse({}));
    expect(
      text(result).startsWith("Error: Failed to retrieve top people:")
    ).toBe(true);
    errorSpy.mockRestore();
  });
});
