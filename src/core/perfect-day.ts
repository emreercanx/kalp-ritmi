import { isDone } from "./stats";
import { isPaused, isScheduled, isSkipped } from "./schedule";
import { habitCadence, type Habit } from "./types";

export interface PerfectDayStatus {
  due: number;
  done: number;
  skipped: number;
  paused: number;
  perfect: boolean;
}

export function perfectDayStatus(habits: Habit[], date: string): PerfectDayStatus {
  let due = 0;
  let done = 0;
  let skipped = 0;
  let paused = 0;

  for (const habit of habits) {
    if (habit.archived || habitCadence(habit) !== "daily") continue;
    if (isPaused(habit, date)) {
      paused++;
      continue;
    }
    if (isSkipped(habit, date)) {
      skipped++;
      continue;
    }
    if (!isScheduled(habit, date)) continue;

    due++;
    if (isDone(habit, date)) done++;
  }

  return {
    due,
    done,
    skipped,
    paused,
    perfect: due > 0 && done >= due,
  };
}
