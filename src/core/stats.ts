import { addDays, dayCount, eachDay, startOfMonth, startOfWeek } from "./date";
import {
  isExpected,
  isPaused,
  isScheduled,
  isSkipped,
} from "./schedule";
import type { Habit } from "./types";

export function isDoneValue(habit: Habit, value: number): boolean {
  if (value <= 0) return false;
  if (habit.kind !== "numeric") return true;

  const target = habit.target ?? 0;
  const minimum = habit.minimum && habit.minimum > 0 ? habit.minimum : 0;
  const threshold = target > 0 ? Math.min(target, minimum > 0 ? minimum : target) : minimum;
  return threshold > 0 ? value >= threshold : true;
}

export function isDone(habit: Habit, date: string): boolean {
  return isDoneValue(habit, habit.log[date] ?? 0);
}

export function sumRange(habit: Habit, from: string, to: string): number {
  let total = 0;
  for (const [date, value] of Object.entries(habit.log)) {
    if (date >= from && date <= to && value > 0) total += value;
  }
  return total;
}

export function doneDays(habit: Habit, from: string, to: string): number {
  let count = 0;
  for (const [date, value] of Object.entries(habit.log)) {
    if (date >= from && date <= to && isDoneValue(habit, value)) count++;
  }
  return count;
}

/** Completed days that were actually expected. Off-day, paused and skipped
 *  extras do not inflate streak or completion figures. */
export function doneScheduledDays(habit: Habit, from: string, to: string): number {
  let count = 0;
  for (const [date, value] of Object.entries(habit.log)) {
    if (
      date >= from &&
      date <= to &&
      isExpected(habit, date) &&
      isDoneValue(habit, value)
    ) {
      count++;
    }
  }
  return count;
}

/** Expected days in a range: scheduled, not paused and not explicitly skipped. */
export function expectedScheduledDays(habit: Habit, from: string, to: string): number {
  if (from > to) return 0;
  let count = 0;
  for (const date of eachDay(from, to)) {
    if (isExpected(habit, date)) count++;
  }
  return count;
}

export function earliestLogDate(habit: Habit): string | null {
  let earliest: string | null = null;
  for (const date of Object.keys(habit.log)) {
    if (earliest === null || date < earliest) earliest = date;
  }
  return earliest;
}

/** Consecutive days ending today. An empty today does not break yesterday's
 *  streak yet, so the board does not punish the user before the day is over. */
export function currentStreak(habit: Habit, today: string): number {
  let cursor = today;
  if (
    isExpected(habit, cursor) &&
    !isDone(habit, cursor)
  ) {
    cursor = addDays(cursor, -1);
  }

  let streak = 0;
  while (streak < 10000) {
    if (!isScheduled(habit, cursor) || isPaused(habit, cursor) || isSkipped(habit, cursor)) {
      cursor = addDays(cursor, -1);
      continue;
    }
    if (!isDone(habit, cursor)) break;

    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export interface WeeklyGoalProgress {
  current: number;
  target: number;
  rate: number;
}

/** Progress towards the optional weekly goal. Current is days for check habits
 *  and a summed amount for numeric habits. */
export function weeklyGoalProgress(
  habit: Habit,
  from: string,
  today: string,
): WeeklyGoalProgress | null {
  const target = habit.weeklyGoal;
  if (!target || target <= 0 || from > today) return null;

  const current =
    habit.kind === "numeric"
      ? sumRange(habit, from, today)
      : doneScheduledDays(habit, from, today);
  return {
    current,
    target,
    rate: Math.min(100, Math.round((current / target) * 100)),
  };
}

/** Visual heat level for one day: 0 empty, 1 low, 2 half, 3 complete. */
export function heatLevel(habit: Habit, value: number): 0 | 1 | 2 | 3 {
  if (value <= 0) return 0;
  if (habit.kind !== "numeric") return 3;

  const target = habit.target ?? 0;
  if (target <= 0) return 3;

  if (isDoneValue(habit, value)) return value >= target ? 3 : 2;
  const ratio = value / target;
  if (ratio >= 0.5) return 2;
  return 1;
}

/** Longest run of completed days anywhere in the habit's history. */
export function bestStreak(habit: Habit): number {
  const dates = Object.keys(habit.log)
    .filter((date) => isDone(habit, date))
    .sort();
  if (dates.length === 0) return 0;

  let best = 0;
  let run = 0;
  for (const date of eachDay(dates[0], dates[dates.length - 1])) {
    if (!isScheduled(habit, date) || isPaused(habit, date) || isSkipped(habit, date)) {
      continue;
    }
    run = isDone(habit, date) ? run + 1 : 0;
    if (run > best) best = run;
  }
  return best;
}

/** The start of a reporting range, but never before the habit existed.
 *  Backfilled entries (logged on a date earlier than createdAt) are respected. */
export function effectiveStart(habit: Habit, from: string): string {
  const earliest = earliestLogDate(habit);
  const anchors = [habit.createdAt, earliest].filter((date): date is string => Boolean(date));
  if (anchors.length === 0) return from;

  const anchor = anchors.reduce((min, date) => (date < min ? date : min));
  return anchor > from ? anchor : from;
}

/** Completion percentage for the last `days` days, or null when the habit has
 *  no entries in that window (so a fresh habit shows "—" instead of 0%). */
export function completionRate(habit: Habit, days: number, today: string): number | null {
  const windowStart = addDays(today, -(days - 1));
  const from = effectiveStart(habit, windowStart);
  const total = expectedScheduledDays(habit, from, today);
  if (total <= 0) return null;

  const hasEntries = Object.keys(habit.log).some((date) => date >= from && date <= today);
  if (!hasEntries) return null;

  return Math.round((doneScheduledDays(habit, from, today) / total) * 100);
}

export function formatAmount(value: number): string {
  if (!Number.isFinite(value)) return "0";

  const rounded = Math.round(value * 100) / 100;
  const [whole, fraction] = String(rounded).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return fraction ? `${grouped},${fraction}` : grouped;
}
