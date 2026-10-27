import {
  addDays,
  addMonths,
  eachDay,
  monthShort,
  startOfMonth,
  startOfWeek,
  weekdayShort,
} from "./date";
import { isExpected, isPaused, isScheduled, isSkipped } from "./schedule";
import {
  doneScheduledDays,
  effectiveStart,
  expectedScheduledDays,
  isDone,
  isDoneValue,
  sumRange,
} from "./stats";
import type { Habit } from "./types";

export interface DayBreakdown {
  done: number;
  partial: number;
  missed: number;
  skipped: number;
  paused: number;
  off: number;
}

/** Splits a date range into completed, partial, missed, skipped, paused and
 *  unscheduled days. Paused/skipped days win over the other buckets. */
export function dayBreakdown(habit: Habit, from: string, to: string): DayBreakdown {
  const out: DayBreakdown = {
    done: 0,
    partial: 0,
    missed: 0,
    skipped: 0,
    paused: 0,
    off: 0,
  };
  const start = effectiveStart(habit, from);
  if (start > to) return out;

  for (const date of eachDay(start, to)) {
    if (isSkipped(habit, date)) {
      out.skipped++;
      continue;
    }
    if (isPaused(habit, date)) {
      out.paused++;
      continue;
    }
    if (!isScheduled(habit, date)) {
      out.off++;
      continue;
    }

    const value = habit.log[date] ?? 0;
    if (value <= 0) {
      out.missed++;
    } else if (isDoneValue(habit, value)) {
      out.done++;
    } else {
      out.partial++;
    }
  }

  return out;
}

export interface TrendPoint {
  key: string;
  label: string;
  days: number;
  done: number;
  amount: number;
  rate: number | null;
}

/** Completion for the last `count` calendar months, oldest first. */
export function monthTrend(habit: Habit, count: number, today: string): TrendPoint[] {
  const total = Math.max(0, Math.floor(count));
  if (total === 0) return [];

  const points: TrendPoint[] = [];
  const currentMonth = startOfMonth(today);
  for (let offset = total - 1; offset >= 0; offset--) {
    const monthStart = addMonths(currentMonth, -offset);
    const monthEnd = addDays(addMonths(monthStart, 1), -1);
    const to = monthEnd > today ? today : monthEnd;
    const from = effectiveStart(habit, monthStart);
    const days = expectedScheduledDays(habit, from, to);
    const done = doneScheduledDays(habit, from, to);
    points.push({
      key: monthStart.slice(0, 7),
      label: monthShort(monthStart),
      days,
      done,
      amount: sumRange(habit, from, to),
      rate: days > 0 ? Math.round((done / days) * 100) : null,
    });
  }
  return points;
}

/** Completion by weekday for the last `weeks` weeks. Off, skipped and paused
 *  days are excluded from the denominator. */
export function weekdayTrend(
  habit: Habit,
  weeks: number,
  today: string,
  weekStart: 0 | 1,
): TrendPoint[] {
  const totalWeeks = Math.max(1, Math.floor(weeks));
  const from = effectiveStart(habit, addDays(today, -(totalWeeks * 7 - 1)));
  const rows = Array.from({ length: 7 }, () => ({ days: 0, done: 0 }));

  for (const date of eachDay(from, today)) {
    if (!isExpected(habit, date)) continue;
    const index = weekdayIndex(date);
    rows[index].days++;
    if (isDone(habit, date)) rows[index].done++;
  }

  const start = startOfWeek(today, weekStart);
  return Array.from({ length: 7 }, (_, offset) => {
    const date = addDays(start, offset);
    const index = weekdayIndex(date);
    const row = rows[index];
    return {
      key: String(index),
      label: weekdayShort(date),
      days: row.days,
      done: row.done,
      amount: 0,
      rate: row.days > 0 ? Math.round((row.done / row.days) * 100) : null,
    };
  });
}

function weekdayIndex(date: string): number {
  return new Date(date + "T00:00:00").getDay();
}
