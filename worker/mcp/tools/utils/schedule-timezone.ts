import {
  MonitorScheduleInterval,
  MonitorSchedulePolicy
} from "../../../types/monitors";

const DAY_NAMES = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY"
] as const;

type DayName = (typeof DAY_NAMES)[number];

const DAY_TO_INT: Record<DayName, number> = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6
};

type ConversionDirection = "localToUtc" | "utcToLocal";

function parseDay(value: string): DayName | null {
  const key = value.trim().toUpperCase();
  return key in DAY_TO_INT ? (key as DayName) : null;
}

function isUsableTimezone(timezoneId: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezoneId });
    return true;
  } catch {
    return false;
  }
}

function getDateParts(
  date: Date,
  timeZone: string
): { hour: number; minute: number; weekday: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short"
  }).formatToParts(date);

  return {
    hour: Number(parts.find((part) => part.type === "hour")?.value ?? "0"),
    minute: Number(parts.find((part) => part.type === "minute")?.value ?? "0"),
    weekday: parts.find((part) => part.type === "weekday")?.value ?? "Sun"
  };
}

function weekdayToDayName(weekday: string): DayName {
  if (weekday.startsWith("Mon")) return "MONDAY";
  if (weekday.startsWith("Tue")) return "TUESDAY";
  if (weekday.startsWith("Wed")) return "WEDNESDAY";
  if (weekday.startsWith("Thu")) return "THURSDAY";
  if (weekday.startsWith("Fri")) return "FRIDAY";
  if (weekday.startsWith("Sat")) return "SATURDAY";
  return "SUNDAY";
}

function nextSundayUtcMs(now: Date): number {
  const dayOfWeek = now.getUTCDay();
  const daysToNextSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
  const nextSunday = new Date(
    now.getTime() + daysToNextSunday * 24 * 60 * 60 * 1000
  );
  nextSunday.setUTCHours(0, 0, 0, 0);
  return nextSunday.getTime();
}

function convertClock(
  hour: number,
  minute: number,
  timeZone: string,
  now: Date,
  direction: ConversionDirection
): { hour: number; minute: number } {
  if (direction === "localToUtc") {
    const localRef = new Date(now.getFullYear(), now.getMonth(), 15);
    const localParts = getDateParts(localRef, timeZone);
    const deltaMinutes =
      hour * 60 + minute - (localParts.hour * 60 + localParts.minute);
    const when = new Date(localRef.getTime() + deltaMinutes * 60 * 1000);
    return { hour: when.getUTCHours(), minute: when.getUTCMinutes() };
  }

  const utcRef = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 15, hour, minute, 0)
  );
  const localParts = getDateParts(utcRef, timeZone);
  return { hour: localParts.hour, minute: localParts.minute };
}

function convertWeeklyInterval(
  interval: MonitorScheduleInterval,
  timeZone: string,
  now: Date,
  direction: ConversionDirection
): MonitorScheduleInterval {
  const sourceDays = (interval.days ?? [])
    .map(parseDay)
    .filter((day): day is DayName => day !== null);

  if (sourceDays.length === 0) {
    return {
      ...interval,
      ...convertClock(interval.hour, interval.minute, timeZone, now, direction)
    };
  }

  const baseMs = nextSundayUtcMs(now);
  const days = new Set<DayName>();
  let hour = 0;
  let minute = 0;

  for (const day of sourceDays) {
    const dayIndex = DAY_TO_INT[day];
    if (direction === "localToUtc") {
      const guess = new Date(baseMs + dayIndex * 24 * 60 * 60 * 1000);
      const localParts = getDateParts(guess, timeZone);
      const current =
        DAY_TO_INT[weekdayToDayName(localParts.weekday)] * 60 * 24 +
        localParts.hour * 60 +
        localParts.minute;
      const wanted = dayIndex * 60 * 24 + interval.hour * 60 + interval.minute;
      const when = new Date(guess.getTime() + (wanted - current) * 60 * 1000);
      hour = when.getUTCHours();
      minute = when.getUTCMinutes();
      days.add(DAY_NAMES[when.getUTCDay()]);
    } else {
      const when = new Date(
        baseMs +
          dayIndex * 24 * 60 * 60 * 1000 +
          interval.hour * 60 * 60 * 1000 +
          interval.minute * 60 * 1000
      );
      const localParts = getDateParts(when, timeZone);
      hour = localParts.hour;
      minute = localParts.minute;
      days.add(weekdayToDayName(localParts.weekday));
    }
  }

  return {
    ...interval,
    hour,
    minute,
    days: [...days].sort((a, b) => DAY_TO_INT[a] - DAY_TO_INT[b])
  };
}

function convertInterval(
  interval: MonitorScheduleInterval,
  timeZone: string,
  now: Date,
  direction: ConversionDirection
): MonitorScheduleInterval {
  if (interval.scheduleType === "MONTHLY") {
    return {
      ...interval,
      ...convertClock(interval.hour, interval.minute, timeZone, now, direction)
    };
  }

  return convertWeeklyInterval(interval, timeZone, now, direction);
}

function convertSchedule(
  policy: MonitorSchedulePolicy,
  direction: ConversionDirection,
  now: Date
): MonitorSchedulePolicy {
  const timeZone = policy.timezoneId?.trim() ?? "";
  if (!timeZone || timeZone.toUpperCase() === "UTC" || !isUsableTimezone(timeZone)) {
    return policy;
  }

  return {
    timezoneId: policy.timezoneId,
    intervals: policy.intervals.map((interval) =>
      convertInterval(interval, timeZone, now, direction)
    )
  };
}

export function toUtcSchedulePolicy(
  policy: MonitorSchedulePolicy,
  now: Date = new Date()
): MonitorSchedulePolicy {
  return convertSchedule(policy, "localToUtc", now);
}

export function toLocalSchedulePolicy<
  T extends MonitorSchedulePolicy | null | undefined
>(policy: T, now: Date = new Date()): T {
  if (policy == null) {
    return policy;
  }
  return convertSchedule(policy, "utcToLocal", now) as T;
}
