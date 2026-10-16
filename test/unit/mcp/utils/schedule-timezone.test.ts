import { describe, expect, test } from "bun:test";
import {
  formatSchedulePolicySummary,
  MAX_SCHEDULE_INTERVALS,
  SchedulePolicyConversionError,
  toLocalSchedulePolicy,
  toLocalSchedulePolicyForDisplay,
  toUtcSchedulePolicy
} from "../../../../worker/mcp/tools/utils/schedule-timezone";
import { MonitorSchedulePolicy } from "../../../../worker/types/monitors";

const NOW = new Date("2026-10-16T17:00:00Z");
const WEEKLY_DAYS = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY"
];

function weeklyPolicy(
  hour: number,
  timezoneId: string,
  days: string[] = WEEKLY_DAYS,
  minute = 0
): MonitorSchedulePolicy {
  return {
    timezoneId,
    intervals: [
      {
        hour,
        minute,
        days,
        scheduleType: "WEEKLY"
      }
    ]
  };
}

function monthlyPolicy(
  hour: number,
  timezoneId: string,
  daysOfMonth: number[],
  minute = 0
): MonitorSchedulePolicy {
  return {
    timezoneId,
    intervals: [
      {
        hour,
        minute,
        daysOfMonth,
        scheduleType: "MONTHLY"
      }
    ]
  };
}

describe("toUtcSchedulePolicy / toLocalSchedulePolicy", () => {
  test("leaves UTC schedules unchanged", () => {
    const policy = weeklyPolicy(3, "UTC");
    expect(toUtcSchedulePolicy(policy, NOW)).toEqual(policy);
    expect(toLocalSchedulePolicy(policy, NOW)).toEqual(policy);
  });

  test("converts 3:00 AM America/Chicago to 8:00 UTC during CDT", () => {
    const utc = toUtcSchedulePolicy(weeklyPolicy(3, "America/Chicago"), NOW);
    expect(utc.intervals[0]?.hour).toBe(8);
    expect(utc.intervals[0]?.minute).toBe(0);
    expect(utc.timezoneId).toBe("America/Chicago");
  });

  test("converts stored 8:00 UTC back to 3:00 AM America/Chicago during CDT", () => {
    const local = toLocalSchedulePolicy(weeklyPolicy(8, "America/Chicago"), NOW);
    expect(local?.intervals[0]?.hour).toBe(3);
    expect(local?.intervals[0]?.minute).toBe(0);
  });

  test("round-trips a Chicago wall-clock time", () => {
    const local = weeklyPolicy(3, "America/Chicago");
    const utc = toUtcSchedulePolicy(local, NOW);
    expect(toLocalSchedulePolicy(utc, NOW)).toEqual(local);
  });

  test("uses a fixed offset for America/Phoenix", () => {
    const utc = toUtcSchedulePolicy(weeklyPolicy(3, "America/Phoenix"), NOW);
    expect(utc.intervals[0]?.hour).toBe(10);
  });

  test("shifts the weekday when conversion crosses midnight", () => {
    const utc = toUtcSchedulePolicy(
      weeklyPolicy(23, "America/Chicago", ["MONDAY"]),
      NOW
    );
    expect(utc.intervals[0]?.hour).toBe(4);
    expect(utc.intervals[0]?.days).toEqual(["TUESDAY"]);

    const local = toLocalSchedulePolicy(
      weeklyPolicy(4, "America/Chicago", ["TUESDAY"]),
      NOW
    );
    expect(local?.intervals[0]?.hour).toBe(23);
    expect(local?.intervals[0]?.days).toEqual(["MONDAY"]);
  });

  test("converts monthly clock time and preserves daysOfMonth", () => {
    const policy = monthlyPolicy(3, "America/Chicago", [1, 15, 31], 30);

    const utc = toUtcSchedulePolicy(policy, NOW);
    expect(utc.intervals[0]?.hour).toBe(8);
    expect(utc.intervals[0]?.minute).toBe(30);
    expect(utc.intervals[0]?.daysOfMonth).toEqual([1, 15, 31]);
    expect(toLocalSchedulePolicy(utc, NOW)).toEqual(policy);
  });

  test("preserves day 31 on monthly schedules during February", () => {
    const februaryNow = new Date("2026-02-10T12:00:00Z");
    const policy = monthlyPolicy(3, "America/Chicago", [31]);

    const utc = toUtcSchedulePolicy(policy, februaryNow);
    expect(utc.intervals[0]?.daysOfMonth).toEqual([31]);
    expect(toLocalSchedulePolicy(utc, februaryNow)).toEqual(policy);
  });

  test("round-trips Sunday schedules across the DST transition", () => {
    const transitionNow = new Date("2026-10-26T12:00:00Z");
    const local = weeklyPolicy(3, "America/Chicago", ["SUNDAY"]);

    const utc = toUtcSchedulePolicy(local, transitionNow);
    expect(toLocalSchedulePolicy(utc, transitionNow)).toEqual(local);
  });

  test("splits weekly days when UTC storage maps to different local times", () => {
    const springNow = new Date("2026-03-02T12:00:00Z");
    const stored = weeklyPolicy(8, "America/Chicago", ["SUNDAY", "MONDAY"]);
    const local = toLocalSchedulePolicy(stored, springNow);

    expect(local?.intervals).toHaveLength(2);
    expect(local?.intervals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ hour: 3, minute: 0, days: ["SUNDAY"] }),
        expect.objectContaining({ hour: 2, minute: 0, days: ["MONDAY"] })
      ])
    );
  });

  test("trims padded timezone ids during conversion", () => {
    const policy = weeklyPolicy(3, " America/Chicago ");
    const utc = toUtcSchedulePolicy(policy, NOW);
    expect(utc.timezoneId).toBe("America/Chicago");
    expect(utc.intervals[0]?.hour).toBe(8);
  });

  test("rejects local schedules that expand past the API interval limit on write", () => {
    const springNow = new Date("2026-03-02T12:00:00Z");
    const localSchedule: MonitorSchedulePolicy = {
      timezoneId: "America/Chicago",
      intervals: Array.from({ length: 13 }, (_, index) => ({
        hour: 3,
        minute: index,
        days: ["SUNDAY", "MONDAY"],
        scheduleType: "WEEKLY" as const
      }))
    };

    expect(() => toUtcSchedulePolicy(localSchedule, springNow)).toThrow(
      SchedulePolicyConversionError
    );
  });

  test("falls back to lossy weekly conversion when split exceeds interval limit", () => {
    const springNow = new Date("2026-03-02T12:00:00Z");
    const stored: MonitorSchedulePolicy = {
      timezoneId: "America/Chicago",
      intervals: Array.from({ length: 13 }, (_, index) => ({
        hour: 8 + index,
        minute: 0,
        days: ["SUNDAY", "MONDAY"],
        scheduleType: "WEEKLY" as const
      }))
    };

    const local = toLocalSchedulePolicy(stored, springNow);
    expect(local?.intervals.length).toBeLessThanOrEqual(MAX_SCHEDULE_INTERVALS);

    const display = toLocalSchedulePolicyForDisplay(stored, springNow);
    expect(display?.displayNote).toContain("approximate");
  });

  test("passes through null and undefined", () => {
    expect(toLocalSchedulePolicy(null)).toBeNull();
    expect(toLocalSchedulePolicy(undefined)).toBeUndefined();
    expect(toLocalSchedulePolicyForDisplay(null)).toBeNull();
  });

  test("passes through an invalid timezone", () => {
    const policy = weeklyPolicy(3, "Not/AZone");
    expect(toUtcSchedulePolicy(policy, NOW)).toEqual(policy);
    expect(toLocalSchedulePolicy(policy, NOW)).toEqual(policy);
  });
});

describe("formatSchedulePolicySummary", () => {
  test("formats a daily schedule with timezone", () => {
    const summary = formatSchedulePolicySummary(weeklyPolicy(3, "America/Chicago"));
    expect(summary).toBe("Daily at 3:00 AM (America/Chicago)");
  });

  test("formats a monthly schedule", () => {
    const summary = formatSchedulePolicySummary(
      monthlyPolicy(15, "America/New_York", [1, 15], 30)
    );
    expect(summary).toBe("Monthly on day 1, 15 at 3:30 PM (America/New_York)");
  });
});
