import {
  addDays,
  addMonths,
  dayNum,
  formatMonth,
  formatRange,
  monthShort,
  startOfMonth,
  startOfWeek,
} from "./date";
import { isDoneValue } from "./stats";
import type { Habit } from "./types";

export type PeriodCadence = "weekly" | "monthly";

export function periodStart(
  date: string,
  cadence: PeriodCadence,
  weekStart: 0 | 1,
): string {
  return cadence === "weekly" ? startOfWeek(date, weekStart) : startOfMonth(date);
}

export function periodEnd(start: string, cadence: PeriodCadence): string {
  if (cadence === "weekly") return addDays(start, 6);
  return addDays(addMonths(start, 1), -1);
}

export function addPeriods(
  start: string,
  delta: number,
  cadence: PeriodCadence,
): string {
  return cadence === "weekly" ? addDays(start, delta * 7) : addMonths(start, delta);
}

export function periodContains(
  start: string,
  date: string,
  cadence: PeriodCadence,
): boolean {
  return start <= date && date <= periodEnd(start, cadence);
}

export function lastNPeriods(
  count: number,
  end: string,
  cadence: PeriodCadence,
  weekStart: 0 | 1,
): string[] {
  const last = periodStart(end, cadence, weekStart);
  const starts: string[] = [];
  for (let index = count - 1; index >= 0; index--) {
    starts.push(addPeriods(last, -index, cadence));
  }
  return starts;
}

export function eachPeriod(
  from: string,
  to: string,
  cadence: PeriodCadence,
  weekStart: 0 | 1,
): string[] {
  const starts: string[] = [];
  let cursor = periodStart(from, cadence, weekStart);
  const last = periodStart(to, cadence, weekStart);
  while (cursor <= last && starts.length < 5000) {
    starts.push(cursor);
    cursor = addPeriods(cursor, 1, cadence);
  }
  return starts;
}

export function periodTitle(start: string, cadence: PeriodCadence): string {
  if (cadence === "monthly") return formatMonth(start.slice(0, 7));
  return formatRange(start, periodEnd(start, cadence));
}

export function periodHeadLabel(
  start: string,
  cadence: PeriodCadence,
): { top: string; bottom: string } {
  if (cadence === "monthly") {
    return { top: monthShort(start), bottom: start.slice(2, 4) };
  }
  const end = periodEnd(start, cadence);
  return {
    top: `${dayNum(start)}–${dayNum(end)}`,
    bottom: monthShort(end),
  };
}

export type PeriodStatus = "past" | "current" | "future";

export function periodStatus(
  start: string,
  cadence: PeriodCadence,
  today: string,
): PeriodStatus {
  const end = periodEnd(start, cadence);
  if (start > today) return "future";
  if (end < today) return "past";
  return "current";
}

export function periodValue(habit: Habit, start: string): number {
  return habit.log[start] ?? 0;
}

export function periodDone(habit: Habit, start: string): boolean {
  return isDoneValue(habit, periodValue(habit, start));
}

export function completedPeriodCount(habit: Habit): number {
  let count = 0;
  for (const value of Object.values(habit.log)) {
    if (isDoneValue(habit, value)) count++;
  }
  return count;
}

function earliestKnownPeriod(
  habit: Habit,
  cadence: PeriodCadence,
  weekStart: 0 | 1,
): string | null {
  let earliest: string | null = null;
  const anchors = [habit.createdAt, ...Object.keys(habit.log)];
  for (const anchor of anchors) {
    if (!anchor) continue;
    const start = periodStart(anchor, cadence, weekStart);
    if (earliest === null || start < earliest) earliest = start;
  }
  return earliest;
}

/** Consecutive completed weeks/months ending with the current period. An
 *  unfinished current period does not break the streak yet. */
export function periodCurrentStreak(
  habit: Habit,
  cadence: PeriodCadence,
  today: string,
  weekStart: 0 | 1,
): number {
  const current = periodStart(today, cadence, weekStart);
  const earliest = earliestKnownPeriod(habit, cadence, weekStart);
  let cursor = periodDone(habit, current)
    ? current
    : addPeriods(current, -1, cadence);

  let streak = 0;
  while (earliest !== null && cursor >= earliest && streak < 10000) {
    if (!periodDone(habit, cursor)) break;
    streak++;
    cursor = addPeriods(cursor, -1, cadence);
  }
  return streak;
}

export function periodBestStreak(
  habit: Habit,
  cadence: PeriodCadence,
  today: string,
  weekStart: 0 | 1,
): number {
  const earliest = earliestKnownPeriod(habit, cadence, weekStart);
  if (earliest === null) return 0;

  const current = periodStart(today, cadence, weekStart);
  let best = 0;
  let run = 0;
  for (const start of eachPeriod(earliest, current, cadence, weekStart)) {
    if (periodDone(habit, start)) {
      run++;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }
  return best;
}
