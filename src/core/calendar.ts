import { addDays, startOfWeek } from "./date";
import { isDoneValue } from "./stats";
import type { Habit } from "./types";

export interface CalendarCell {
  date: string;
  inMonth: boolean;
}

export function monthOf(date: string): string {
  return date.slice(0, 7);
}

export function addMonths(month: string, delta: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Six weeks (42 cells), starting on the configured first day of the week. */
export function monthGrid(month: string, weekStart: 0 | 1): CalendarCell[] {
  const first = `${month}-01`;
  const gridStart = startOfWeek(first, weekStart);

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(gridStart, index);
    return { date, inMonth: date.startsWith(month) };
  });
}

export interface HabitDayMark {
  value: number;
  done: boolean;
  label: string;
}

/** What a single day should show in one habit's calendar. */
export function habitDayMark(habit: Habit, date: string): HabitDayMark | null {
  const value = habit.log[date] ?? 0;
  if (value <= 0) return null;

  if (habit.kind !== "numeric") {
    return { value, done: true, label: "✓" };
  }

  const rounded = String(Math.round(value * 100) / 100).replace(".", ",");
  return { value, done: isDoneValue(habit, value), label: rounded };
}
