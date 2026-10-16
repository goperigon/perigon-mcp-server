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

interface CalendarParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: string;
}

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

function weekdayToDayName(weekday: string): DayName {
  if (weekday.startsWith("Mon")) return "MONDAY";
  if (weekday.startsWith("Tue")) return "TUESDAY";
  if (weekday.startsWith("Wed")) return "WEDNESDAY";
  if (weekday.startsWith("Thu")) return "THURSDAY";
  if (weekday.startsWith("Fri")) return "FRIDAY";
  if (weekday.startsWith("Sat")) return "SATURDAY";
  return "SUNDAY";
}

function getDatePartsInTimezone(date: Date, timezone: string): CalendarParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
    weekday: "short"
  }).formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === "year")?.value ?? 0),
    month: Number(parts.find((part) => part.type === "month")?.value ?? 0),
    day: Number(parts.find((part) => part.type === "day")?.value ?? 0),
    hour: Number(parts.find((part) => part.type === "hour")?.value ?? 0),
    minute: Number(parts.find((part) => part.type === "minute")?.value ?? 0),
    second: Number(parts.find((part) => part.type === "second")?.value ?? 0),
    weekday: parts.find((part) => part.type === "weekday")?.value ?? "Sun"
  };
}

function createDateInTimezone(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timezone: string
): Date {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const guessedParts = getDatePartsInTimezone(utcGuess, timezone);

  const targetMs = Date.UTC(year, month - 1, day, hour, minute, second);
  const guessedMs = Date.UTC(
    guessedParts.year,
    guessedParts.month - 1,
    guessedParts.day,
    guessedParts.hour,
    guessedParts.minute,
    guessedParts.second
  );
  const adjustedDate = new Date(utcGuess.getTime() + (targetMs - guessedMs));

  const verifyParts = getDatePartsInTimezone(adjustedDate, timezone);
  if (
    verifyParts.year === year &&
    verifyParts.month === month &&
    verifyParts.day === day &&
    verifyParts.hour === hour &&
    verifyParts.minute === minute
  ) {
    return adjustedDate;
  }

  let low = utcGuess.getTime() - 26 * 60 * 60 * 1000;
  let high = utcGuess.getTime() + 26 * 60 * 60 * 1000;

  while (high - low > 60_000) {
    const mid = Math.floor((low + high) / 2);
    const parts = getDatePartsInTimezone(new Date(mid), timezone);
    const target =
      year * 10_000_000_000 +
      month * 100_000_000 +
      day * 1_000_000 +
      hour * 10_000 +
      minute * 100 +
      second;
    const current =
      parts.year * 10_000_000_000 +
      parts.month * 100_000_000 +
      parts.day * 1_000_000 +
      parts.hour * 10_000 +
      parts.minute * 100 +
      parts.second;

    if (current < target) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return new Date(high);
}

function clampDayOfMonth(year: number, month: number, dayOfMonth: number): number {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Math.min(Math.max(1, dayOfMonth), daysInMonth);
}

function findNextLocalWeekdayOccurrence(
  timezone: string,
  weekday: DayName,
  hour: number,
  minute: number,
  notBefore: Date
): Date {
  for (let offsetDays = 0; offsetDays < 370; offsetDays += 1) {
    const probe = new Date(notBefore.getTime() + offsetDays * 86_400_000);
    const parts = getDatePartsInTimezone(probe, timezone);
    if (weekdayToDayName(parts.weekday) !== weekday) {
      continue;
    }
    return createDateInTimezone(
      parts.year,
      parts.month,
      parts.day,
      hour,
      minute,
      0,
      timezone
    );
  }

  throw new Error(`Could not find upcoming ${weekday} in ${timezone}`);
}

function findNextUtcWeekdayOccurrence(
  utcWeekday: number,
  hour: number,
  minute: number,
  notBefore: Date
): Date {
  for (let offsetDays = 0; offsetDays < 370; offsetDays += 1) {
    const probe = new Date(notBefore.getTime() + offsetDays * 86_400_000);
    if (probe.getUTCDay() !== utcWeekday) {
      continue;
    }
    return new Date(
      Date.UTC(
        probe.getUTCFullYear(),
        probe.getUTCMonth(),
        probe.getUTCDate(),
        hour,
        minute,
        0
      )
    );
  }

  throw new Error(`Could not find upcoming UTC weekday ${utcWeekday}`);
}

function sortIntervals(intervals: MonitorScheduleInterval[]): MonitorScheduleInterval[] {
  const minDay = (days?: string[]) => {
    if (!days || days.length === 0) {
      return 7;
    }
    let value = 7;
    for (const day of days) {
      const parsed = parseDay(day);
      if (parsed && DAY_TO_INT[parsed] < value) {
        value = DAY_TO_INT[parsed];
      }
    }
    return value;
  };

  return [...intervals].sort((left, right) => {
    const leftDay = minDay(left.days);
    const rightDay = minDay(right.days);
    if (leftDay !== rightDay) {
      return leftDay - rightDay;
    }
    if (left.hour !== right.hour) {
      return left.hour - right.hour;
    }
    if (left.minute !== right.minute) {
      return left.minute - right.minute;
    }
    return (left.days?.length ?? 0) - (right.days?.length ?? 0);
  });
}

function sortDays(days: DayName[]): DayName[] {
  return [...days].sort((a, b) => DAY_TO_INT[a] - DAY_TO_INT[b]);
}

function sortDaysOfMonth(days: number[]): number[] {
  return [...days].sort((a, b) => a - b);
}

function convertWeeklyIntervalLocalToUtc(
  interval: MonitorScheduleInterval,
  timeZone: string,
  now: Date
): MonitorScheduleInterval[] {
  const sourceDays = (interval.days ?? [])
    .map(parseDay)
    .filter((day): day is DayName => day !== null);

  if (sourceDays.length === 0) {
    const anchor = getDatePartsInTimezone(now, timeZone);
    const when = createDateInTimezone(
      anchor.year,
      anchor.month,
      anchor.day,
      interval.hour,
      interval.minute,
      0,
      timeZone
    );
    return [
      {
        ...interval,
        hour: when.getUTCHours(),
        minute: when.getUTCMinutes()
      }
    ];
  }

  const buckets = new Map<string, { hour: number; minute: number; days: Set<DayName> }>();

  for (const day of sourceDays) {
    const when = findNextLocalWeekdayOccurrence(
      timeZone,
      day,
      interval.hour,
      interval.minute,
      now
    );
    const utcDay = DAY_NAMES[when.getUTCDay()];
    const hour = when.getUTCHours();
    const minute = when.getUTCMinutes();
    const key = `${hour}:${minute}:${utcDay}`;
    const bucket = buckets.get(key) ?? { hour, minute, days: new Set<DayName>() };
    bucket.days.add(utcDay);
    buckets.set(key, bucket);
  }

  const merged = new Map<string, { hour: number; minute: number; days: Set<DayName> }>();
  for (const bucket of buckets.values()) {
    const key = `${bucket.hour}:${bucket.minute}`;
    const existing = merged.get(key) ?? {
      hour: bucket.hour,
      minute: bucket.minute,
      days: new Set<DayName>()
    };
    for (const day of bucket.days) {
      existing.days.add(day);
    }
    merged.set(key, existing);
  }

  return [...merged.values()].map((bucket) => ({
    scheduleType: "WEEKLY" as const,
    hour: bucket.hour,
    minute: bucket.minute,
    days: sortDays([...bucket.days])
  }));
}

function convertWeeklyIntervalUtcToLocal(
  interval: MonitorScheduleInterval,
  timeZone: string,
  now: Date
): MonitorScheduleInterval[] {
  const sourceDays = (interval.days ?? [])
    .map(parseDay)
    .filter((day): day is DayName => day !== null);

  if (sourceDays.length === 0) {
    const when = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        interval.hour,
        interval.minute,
        0
      )
    );
    const parts = getDatePartsInTimezone(when, timeZone);
    return [
      {
        ...interval,
        hour: parts.hour,
        minute: parts.minute
      }
    ];
  }

  const buckets = new Map<string, { hour: number; minute: number; days: Set<DayName> }>();

  for (const day of sourceDays) {
    const when = findNextUtcWeekdayOccurrence(
      DAY_TO_INT[day],
      interval.hour,
      interval.minute,
      now
    );
    const parts = getDatePartsInTimezone(when, timeZone);
    const localDay = weekdayToDayName(parts.weekday);
    const key = `${parts.hour}:${parts.minute}`;
    const bucket = buckets.get(key) ?? {
      hour: parts.hour,
      minute: parts.minute,
      days: new Set<DayName>()
    };
    bucket.days.add(localDay);
    buckets.set(key, bucket);
  }

  return [...buckets.values()].map((bucket) => ({
    scheduleType: "WEEKLY" as const,
    hour: bucket.hour,
    minute: bucket.minute,
    days: sortDays([...bucket.days])
  }));
}

function convertMonthlyIntervalLocalToUtc(
  interval: MonitorScheduleInterval,
  timeZone: string,
  now: Date
): MonitorScheduleInterval[] {
  const anchor = getDatePartsInTimezone(now, timeZone);
  const daysOfMonth = interval.daysOfMonth ?? [1];
  const buckets = new Map<string, { hour: number; minute: number; days: Set<number> }>();

  for (const dayOfMonth of daysOfMonth) {
    const day = clampDayOfMonth(anchor.year, anchor.month, dayOfMonth);
    const when = createDateInTimezone(
      anchor.year,
      anchor.month,
      day,
      interval.hour,
      interval.minute,
      0,
      timeZone
    );
    const utcDayOfMonth = when.getUTCDate();
    const hour = when.getUTCHours();
    const minute = when.getUTCMinutes();
    const key = `${hour}:${minute}`;
    const bucket = buckets.get(key) ?? { hour, minute, days: new Set<number>() };
    bucket.days.add(utcDayOfMonth);
    buckets.set(key, bucket);
  }

  return [...buckets.values()].map((bucket) => ({
    scheduleType: "MONTHLY" as const,
    hour: bucket.hour,
    minute: bucket.minute,
    daysOfMonth: sortDaysOfMonth([...bucket.days])
  }));
}

function convertMonthlyIntervalUtcToLocal(
  interval: MonitorScheduleInterval,
  timeZone: string,
  now: Date
): MonitorScheduleInterval[] {
  const daysOfMonth = interval.daysOfMonth ?? [1];
  const buckets = new Map<string, { hour: number; minute: number; days: Set<number> }>();

  for (const dayOfMonth of daysOfMonth) {
    const day = clampDayOfMonth(now.getUTCFullYear(), now.getUTCMonth() + 1, dayOfMonth);
    const when = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        day,
        interval.hour,
        interval.minute,
        0
      )
    );
    const parts = getDatePartsInTimezone(when, timeZone);
    const key = `${parts.hour}:${parts.minute}`;
    const bucket = buckets.get(key) ?? {
      hour: parts.hour,
      minute: parts.minute,
      days: new Set<number>()
    };
    bucket.days.add(parts.day);
    buckets.set(key, bucket);
  }

  return [...buckets.values()].map((bucket) => ({
    scheduleType: "MONTHLY" as const,
    hour: bucket.hour,
    minute: bucket.minute,
    daysOfMonth: sortDaysOfMonth([...bucket.days])
  }));
}

function convertInterval(
  interval: MonitorScheduleInterval,
  timeZone: string,
  now: Date,
  direction: ConversionDirection
): MonitorScheduleInterval[] {
  if (interval.scheduleType === "MONTHLY") {
    return direction === "localToUtc"
      ? convertMonthlyIntervalLocalToUtc(interval, timeZone, now)
      : convertMonthlyIntervalUtcToLocal(interval, timeZone, now);
  }

  return direction === "localToUtc"
    ? convertWeeklyIntervalLocalToUtc(interval, timeZone, now)
    : convertWeeklyIntervalUtcToLocal(interval, timeZone, now);
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
    intervals: sortIntervals(
      policy.intervals.flatMap((interval) =>
        convertInterval(interval, timeZone, now, direction)
      )
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
