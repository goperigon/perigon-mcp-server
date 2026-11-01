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

export const MAX_SCHEDULE_INTERVALS = 24;

export class SchedulePolicyConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SchedulePolicyConversionError";
  }
}

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

interface ConvertScheduleResult {
  policy: MonitorSchedulePolicy;
  lossyWeeklyConversion: boolean;
}

export interface LocalSchedulePolicyResult {
  policy: MonitorSchedulePolicy;
  displayNote?: string;
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

function formatClockTime(hour: number, minute: number): string {
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const meridiem = hour < 12 ? "AM" : "PM";
  const minuteText = minute.toString().padStart(2, "0");
  return `${hour12}:${minuteText} ${meridiem}`;
}

function formatDayList(days: DayName[]): string {
  const labels: Record<DayName, string> = {
    SUNDAY: "Sun",
    MONDAY: "Mon",
    TUESDAY: "Tue",
    WEDNESDAY: "Wed",
    THURSDAY: "Thu",
    FRIDAY: "Fri",
    SATURDAY: "Sat"
  };
  return days.map((day) => labels[day]).join(", ");
}

export function formatSchedulePolicySummary(
  policy: MonitorSchedulePolicy | null | undefined
): string | null {
  if (!policy?.intervals?.length) {
    return null;
  }

  const timezoneId = policy.timezoneId?.trim() || "UTC";
  const parts = policy.intervals.map((interval) => {
    const time = formatClockTime(interval.hour, interval.minute);

    if (interval.scheduleType === "MONTHLY") {
      const days = (interval.daysOfMonth ?? [1])
        .slice()
        .sort((a, b) => a - b)
        .join(", ");
      return `Monthly on day ${days} at ${time}`;
    }

    const days = (interval.days ?? [])
      .map(parseDay)
      .filter((day): day is DayName => day !== null);
    if (days.length === 7) {
      return `Daily at ${time}`;
    }
    if (days.length > 0) {
      return `${formatDayList(sortDays(days))} at ${time}`;
    }

    return `At ${time}`;
  });

  const schedule = parts.join("; ");
  return timezoneId === "UTC" ? schedule : `${schedule} (${timezoneId})`;
}

function convertMonthlyIntervalLocalToUtc(
  interval: MonitorScheduleInterval,
  timeZone: string,
  now: Date
): MonitorScheduleInterval[] {
  const guess = new Date(now.getFullYear(), now.getMonth(), 15);
  const localParts = getDatePartsInTimezone(guess, timeZone);
  const currentMinutes = localParts.hour * 60 + localParts.minute;
  const wantMinutes = interval.hour * 60 + interval.minute;
  const when = new Date(guess.getTime() + (wantMinutes - currentMinutes) * 60 * 1000);

  return [
    {
      scheduleType: "MONTHLY",
      hour: when.getUTCHours(),
      minute: when.getUTCMinutes(),
      daysOfMonth: interval.daysOfMonth ?? [1]
    }
  ];
}

function convertMonthlyIntervalUtcToLocal(
  interval: MonitorScheduleInterval,
  timeZone: string,
  now: Date
): MonitorScheduleInterval[] {
  const utcRef = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 15, interval.hour, interval.minute, 0)
  );
  const parts = getDatePartsInTimezone(utcRef, timeZone);

  return [
    {
      scheduleType: "MONTHLY",
      hour: parts.hour,
      minute: parts.minute,
      daysOfMonth: interval.daysOfMonth ?? [1]
    }
  ];
}

function convertWeeklyIntervalLocalToUtcSplit(
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

function convertWeeklyIntervalLocalToUtcLossy(
  interval: MonitorScheduleInterval,
  timeZone: string,
  now: Date
): MonitorScheduleInterval[] {
  const sourceDays = (interval.days ?? [])
    .map(parseDay)
    .filter((day): day is DayName => day !== null);

  if (sourceDays.length === 0) {
    return convertWeeklyIntervalLocalToUtcSplit(interval, timeZone, now);
  }

  const utcDays = new Set<DayName>();
  let hour = interval.hour;
  let minute = interval.minute;

  for (const day of sourceDays) {
    const when = findNextLocalWeekdayOccurrence(
      timeZone,
      day,
      interval.hour,
      interval.minute,
      now
    );
    hour = when.getUTCHours();
    minute = when.getUTCMinutes();
    utcDays.add(DAY_NAMES[when.getUTCDay()]);
  }

  return [
    {
      scheduleType: "WEEKLY",
      hour,
      minute,
      days: sortDays([...utcDays])
    }
  ];
}

function convertWeeklyIntervalUtcToLocalSplit(
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

function convertWeeklyIntervalUtcToLocalLossy(
  interval: MonitorScheduleInterval,
  timeZone: string,
  now: Date
): MonitorScheduleInterval[] {
  const sourceDays = (interval.days ?? [])
    .map(parseDay)
    .filter((day): day is DayName => day !== null);

  if (sourceDays.length === 0) {
    return convertWeeklyIntervalUtcToLocalSplit(interval, timeZone, now);
  }

  const localDays = new Set<DayName>();
  let hour = interval.hour;
  let minute = interval.minute;

  for (const day of sourceDays) {
    const when = findNextUtcWeekdayOccurrence(
      DAY_TO_INT[day],
      interval.hour,
      interval.minute,
      now
    );
    const parts = getDatePartsInTimezone(when, timeZone);
    hour = parts.hour;
    minute = parts.minute;
    localDays.add(weekdayToDayName(parts.weekday));
  }

  return [
    {
      scheduleType: "WEEKLY",
      hour,
      minute,
      days: sortDays([...localDays])
    }
  ];
}

function mapPolicyIntervals(
  policy: MonitorSchedulePolicy,
  direction: ConversionDirection,
  now: Date,
  mode: "split" | "lossy",
  timeZone: string
): MonitorScheduleInterval[] {
  return policy.intervals.flatMap((interval) => {
    if (interval.scheduleType === "MONTHLY") {
      return direction === "localToUtc"
        ? convertMonthlyIntervalLocalToUtc(interval, timeZone, now)
        : convertMonthlyIntervalUtcToLocal(interval, timeZone, now);
    }

    if (direction === "localToUtc") {
      return mode === "split"
        ? convertWeeklyIntervalLocalToUtcSplit(interval, timeZone, now)
        : convertWeeklyIntervalLocalToUtcLossy(interval, timeZone, now);
    }

    return mode === "split"
      ? convertWeeklyIntervalUtcToLocalSplit(interval, timeZone, now)
      : convertWeeklyIntervalUtcToLocalLossy(interval, timeZone, now);
  });
}

function scheduleIntervalLimitError(intervalCount: number): SchedulePolicyConversionError {
  return new SchedulePolicyConversionError(
    `Error: Schedule expands to ${intervalCount} intervals after timezone conversion, but the API allows at most ${MAX_SCHEDULE_INTERVALS}. Reduce the number of intervals or weekdays before saving.`
  );
}

function convertScheduleInternal(
  policy: MonitorSchedulePolicy,
  direction: ConversionDirection,
  now: Date,
  allowLossyWeekly: boolean
): ConvertScheduleResult {
  const timeZone = policy.timezoneId?.trim() ?? "";
  if (!timeZone || timeZone.toUpperCase() === "UTC" || !isUsableTimezone(timeZone)) {
    return { policy, lossyWeeklyConversion: false };
  }

  const normalizedPolicy: MonitorSchedulePolicy = {
    ...policy,
    timezoneId: timeZone
  };

  let lossyWeeklyConversion = false;
  let intervals = mapPolicyIntervals(normalizedPolicy, direction, now, "split", timeZone);

  if (intervals.length > MAX_SCHEDULE_INTERVALS) {
    if (direction === "localToUtc") {
      throw scheduleIntervalLimitError(intervals.length);
    }
    if (!allowLossyWeekly) {
      throw scheduleIntervalLimitError(intervals.length);
    }
    intervals = mapPolicyIntervals(normalizedPolicy, direction, now, "lossy", timeZone);
    lossyWeeklyConversion = true;
  }

  if (intervals.length > MAX_SCHEDULE_INTERVALS) {
    if (direction === "localToUtc") {
      throw scheduleIntervalLimitError(intervals.length);
    }
    intervals = normalizedPolicy.intervals.flatMap((interval) => {
      if (interval.scheduleType === "MONTHLY") {
        return convertMonthlyIntervalUtcToLocal(interval, timeZone, now);
      }
      return convertWeeklyIntervalUtcToLocalLossy(interval, timeZone, now);
    });
    lossyWeeklyConversion = true;
  }

  if (intervals.length > MAX_SCHEDULE_INTERVALS) {
    throw scheduleIntervalLimitError(intervals.length);
  }

  return {
    policy: {
      timezoneId: timeZone,
      intervals: sortIntervals(intervals)
    },
    lossyWeeklyConversion
  };
}

export function toUtcSchedulePolicy(
  policy: MonitorSchedulePolicy,
  now: Date = new Date()
): MonitorSchedulePolicy {
  return convertScheduleInternal(policy, "localToUtc", now, false).policy;
}

export function toLocalSchedulePolicy<
  T extends MonitorSchedulePolicy | null | undefined
>(policy: T, now: Date = new Date()): T {
  if (policy == null) {
    return policy;
  }
  return convertScheduleInternal(policy, "utcToLocal", now, true).policy as T;
}

export function toLocalSchedulePolicyForDisplay(
  policy: MonitorSchedulePolicy | null | undefined,
  now: Date = new Date()
): LocalSchedulePolicyResult | null {
  if (policy == null) {
    return null;
  }

  const converted = convertScheduleInternal(policy, "utcToLocal", now, true);
  const displayNote = converted.lossyWeeklyConversion
    ? "Schedule wall-clock times are approximate for some weekdays because this monitor uses more than 24 schedule intervals. Prefer the Schedule summary line over inferring times from interval hour values alone."
    : undefined;

  return {
    policy: converted.policy,
    displayNote
  };
}
