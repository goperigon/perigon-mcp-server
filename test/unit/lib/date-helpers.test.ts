import { describe, expect, test } from "bun:test";
import {
  buildPromptDateContext,
  daysAgo,
  toDateString,
} from "../../../worker/lib/date-helpers";

describe("toDateString", () => {
  test("formats dates as yyyy-mm-dd in UTC", () => {
    const d = new Date("2024-03-15T13:45:30.000Z");
    expect(toDateString(d)).toBe("2024-03-15");
  });

  test("handles year boundary", () => {
    const d = new Date("2023-12-31T23:59:59.999Z");
    expect(toDateString(d)).toBe("2023-12-31");
  });

  test("handles leap day", () => {
    const d = new Date("2024-02-29T00:00:00.000Z");
    expect(toDateString(d)).toBe("2024-02-29");
  });
});

describe("daysAgo", () => {
  test("subtracts the given number of days", () => {
    const now = new Date("2024-03-15T12:00:00.000Z");
    expect(toDateString(daysAgo(now, 1))).toBe("2024-03-14");
    expect(toDateString(daysAgo(now, 7))).toBe("2024-03-08");
    expect(toDateString(daysAgo(now, 30))).toBe("2024-02-14");
  });

  test("zero offset returns the same date", () => {
    const now = new Date("2024-03-15T12:00:00.000Z");
    expect(toDateString(daysAgo(now, 0))).toBe("2024-03-15");
  });

  test("negative offset moves forward", () => {
    const now = new Date("2024-03-15T12:00:00.000Z");
    expect(toDateString(daysAgo(now, -2))).toBe("2024-03-17");
  });
});

describe("buildPromptDateContext", () => {
  test("returns all six expected keys for a fixed `now`", () => {
    const now = new Date("2024-03-15T00:00:00.000Z");
    const ctx = buildPromptDateContext(now);
    expect(ctx).toEqual({
      today: "2024-03-15",
      yesterday: "2024-03-14",
      threeDaysAgo: "2024-03-12",
      oneWeekAgo: "2024-03-08",
      twoWeeksAgo: "2024-03-01",
      oneMonthAgo: "2024-02-14",
    });
  });

  test("uses Date.now() when no argument is provided", () => {
    const ctx = buildPromptDateContext();
    expect(ctx.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(ctx.oneMonthAgo).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
