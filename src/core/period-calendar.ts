import { addDays, addMonths, startOfMonth, startOfWeek } from "./date";

/** Week starts that overlap the given month, oldest first. */
export function weeksInMonth(month: string, weekStart: 0 | 1): string[] {
  const start = startOfMonth(`${month}-01`);
  const end = addDays(addMonths(start, 1), -1);
  const weeks: string[] = [];
  let cursor = startOfWeek(start, weekStart);

  while (cursor <= end && weeks.length < 6) {
    weeks.push(cursor);
    cursor = addDays(cursor, 7);
  }
  return weeks;
}

/** The first day of every month in a calendar year, oldest first. */
export function monthsInYear(year: number): string[] {
  return Array.from(
    { length: 12 },
    (_, index) => `${year}-${String(index + 1).padStart(2, "0")}-01`,
  );
}
