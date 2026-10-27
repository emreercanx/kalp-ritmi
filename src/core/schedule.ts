import { dayCount, dayDiff, eachDay } from "./date";

export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
export const WEEKDAY_LABELS = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

export interface ScheduledHabit {
  scheduleDays?: number[];
  intervalDays?: number;
  createdAt?: string;
}

export interface PausedHabit {
  pausedFrom?: string;
  pausedUntil?: string;
}

export interface SkippedHabit {
  skips?: Record<string, string>;
}

/** Keep the stored list unique, valid and in Monday-first order. */
export function normalizeScheduleDays(raw?: number[]): number[] {
  if (!raw || raw.length === 0) return [...WEEKDAY_ORDER];
  const valid = new Set(
    raw.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6),
  );
  if (valid.size === 0) return [...WEEKDAY_ORDER];
  return WEEKDAY_ORDER.filter((day) => valid.has(day));
}

/** 1 or invalid values mean no interval. */
export function normalizeIntervalDays(raw?: number): number | undefined {
  if (raw === undefined || !Number.isFinite(raw)) return undefined;
  const value = Math.round(raw);
  if (value < 2 || value > 365) return undefined;
  return value;
}

export function isIntervalSchedule(habit: ScheduledHabit): boolean {
  return normalizeIntervalDays(habit.intervalDays) !== undefined;
}

export function isDailySchedule(habit: ScheduledHabit): boolean {
  return !isIntervalSchedule(habit) && normalizeScheduleDays(habit.scheduleDays).length === 7;
}

export function isScheduled(habit: ScheduledHabit, date: string): boolean {
  const interval = normalizeIntervalDays(habit.intervalDays);
  if (interval !== undefined) {
    const anchor = habit.createdAt;
    if (!anchor) return true;
    const distance = dayDiff(anchor, date);
    return distance >= 0 && distance % interval === 0;
  }

  if (isDailySchedule(habit)) return true;
  const day = new Date(date + "T00:00:00").getDay();
  return normalizeScheduleDays(habit.scheduleDays).includes(day);
}

/** Inclusive pause range. If either endpoint is missing there is no pause. */
export function isPaused(habit: PausedHabit, date: string): boolean {
  const from = habit.pausedFrom;
  const until = habit.pausedUntil;
  if (!from || !until) return false;
  return from <= date && date <= until;
}

export function isSkipped(habit: SkippedHabit, date: string): boolean {
  return Boolean(habit.skips?.[date] !== undefined);
}

/** Whether the habit is expected on this date and still needs an answer. */
export function isExpected(habit: ScheduledHabit & PausedHabit & SkippedHabit, date: string): boolean {
  return isScheduled(habit, date) && !isPaused(habit, date) && !isSkipped(habit, date);
}

export function scheduledDayCount(habit: ScheduledHabit, from: string, to: string): number {
  if (from > to) return 0;
  if (isDailySchedule(habit)) return dayCount(from, to);

  let count = 0;
  for (const date of eachDay(from, to)) {
    if (isScheduled(habit, date)) count++;
  }
  return count;
}

/** Compact text for a habit row. */
export function scheduleShort(habit: ScheduledHabit): string {
  const interval = normalizeIntervalDays(habit.intervalDays);
  if (interval !== undefined) return `${interval} günde 1`;
  if (isDailySchedule(habit)) return "her gün";
  return `${normalizeScheduleDays(habit.scheduleDays).length} gün/hafta`;
}

/** Full weekday list for the detail screen. */
export function scheduleLabel(habit: ScheduledHabit): string {
  const interval = normalizeIntervalDays(habit.intervalDays);
  if (interval !== undefined) return `Her ${interval} günde 1`;
  if (isDailySchedule(habit)) return "Her gün";
  return normalizeScheduleDays(habit.scheduleDays)
    .map((day) => WEEKDAY_LABELS[day])
    .join(", ");
}
