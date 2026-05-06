/**
 * Helpers for producing the date strings injected into the system prompt.
 * Centralised so the chat handler doesn't have to care about formatting.
 */

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** Format a Date as `yyyy-mm-dd` (UTC). */
export function toDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

/** Returns a new Date offset from `now` by the given number of days. */
export function daysAgo(now: Date, days: number): Date {
  return new Date(now.getTime() - days * ONE_DAY_MS);
}

export interface PromptDateContext {
  today: string;
  yesterday: string;
  threeDaysAgo: string;
  oneWeekAgo: string;
  twoWeeksAgo: string;
  oneMonthAgo: string;
}

/**
 * Build the set of canonical date strings used for templating the system
 * prompt. Caller passes in `now` so this stays trivially testable.
 */
export function buildPromptDateContext(now: Date = new Date()): PromptDateContext {
  return {
    today: toDateString(now),
    yesterday: toDateString(daysAgo(now, 1)),
    threeDaysAgo: toDateString(daysAgo(now, 3)),
    oneWeekAgo: toDateString(daysAgo(now, 7)),
    twoWeeksAgo: toDateString(daysAgo(now, 14)),
    oneMonthAgo: toDateString(daysAgo(now, 30)),
  };
}
