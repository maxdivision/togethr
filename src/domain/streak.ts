import type { Completion, Habit } from './models';

const pad = (n: number) => String(n).padStart(2, '0');

/** Device-local calendar date as yyyy-MM-dd. */
export function isoDate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return isoDate(new Date(y, m - 1, d + n));
}

export type StreakInfo = {
  /** Consecutive days on which BOTH people closed ALL habits. */
  streak: number;
  todayComplete: boolean;
  /** The streak was broken: neither today nor yesterday is complete (and there was a day to miss). */
  atRest: boolean;
};

const MAX_DAYS = 400;

/**
 * Today counts if it is already complete, otherwise the streak is measured up to yesterday, so the
 * flame does not die mid-day. A habit only counts from its `createdOn` day on, so adding a habit
 * never breaks history.
 */
export function computeStreak(
  today: string,
  habits: Habit[],
  uids: [string, string],
  completions: Completion[],
): StreakInfo {
  const done = new Set(completions.map((c) => `${c.date}|${c.habitId}|${c.uid}`));
  const complete = (day: string) => {
    const required = habits.filter((h) => h.createdOn <= day);
    if (required.length === 0) return false;
    return required.every((h) => uids.every((u) => done.has(`${day}|${h.id}|${u}`)));
  };

  const todayComplete = complete(today);
  const yesterday = addDays(today, -1);
  let day = todayComplete ? today : yesterday;
  let streak = 0;
  while (streak < MAX_DAYS && complete(day)) {
    streak++;
    day = addDays(day, -1);
  }

  const hadADayToMiss = habits.some((h) => h.createdOn < yesterday);
  const atRest = !todayComplete && !complete(yesterday) && hadADayToMiss;
  return { streak, todayComplete, atRest };
}
