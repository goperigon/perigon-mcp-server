import { describe, expect, test } from "bun:test";
import {
  toLocalSchedulePolicy,
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
  days: string[] = WEEKLY_DAYS
): MonitorSchedulePolicy {
  return {
    timezoneId,
    intervals: [
      {
        hour,
        minute: 0,
        days,
        scheduleType: "WEEKLY"
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

  test("converts monthly clock time and keeps daysOfMonth", () => {
    const policy: MonitorSchedulePolicy = {
      timezoneId: "America/Chicago",
      intervals: [
        {
          hour: 3,
          minute: 30,
          daysOfMonth: [1, 15],
          scheduleType: "MONTHLY"
        }
      ]
    };

    const utc = toUtcSchedulePolicy(policy, NOW);
    expect(utc.intervals[0]?.hour).toBe(8);
    expect(utc.intervals[0]?.minute).toBe(30);
    expect(utc.intervals[0]?.daysOfMonth).toEqual([1, 15]);
    expect(toLocalSchedulePolicy(utc, NOW)).toEqual(policy);
  });

  test("passes through null and undefined", () => {
    expect(toLocalSchedulePolicy(null)).toBeNull();
    expect(toLocalSchedulePolicy(undefined)).toBeUndefined();
  });

  test("passes through an invalid timezone", () => {
    const policy = weeklyPolicy(3, "Not/AZone");
    expect(toUtcSchedulePolicy(policy, NOW)).toEqual(policy);
    expect(toLocalSchedulePolicy(policy, NOW)).toEqual(policy);
  });
});
