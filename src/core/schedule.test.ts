import { describe, expect, it } from "vitest";
import {
  isDailySchedule,
  isExpected,
  isPaused,
  isScheduled,
  isSkipped,
  normalizeIntervalDays,
  normalizeScheduleDays,
  scheduledDayCount,
  scheduleLabel,
  scheduleShort,
} from "./schedule";

describe("habit schedule", () => {
  it("treats missing or all days as daily", () => {
    expect(isDailySchedule({})).toBe(true);
    expect(isDailySchedule({ scheduleDays: [0, 1, 2, 3, 4, 5, 6] })).toBe(true);
    expect(scheduleShort({})).toBe("her gün");
  });

  it("normalizes selected weekdays in Monday-first order", () => {
    expect(normalizeScheduleDays([0, 3, 1, 3, 9])).toEqual([1, 3, 0]);
  });

  it("checks scheduled days", () => {
    const habit = { scheduleDays: [1, 3, 5] };
    expect(isScheduled(habit, "2026-10-26")).toBe(true);
    expect(isScheduled(habit, "2026-10-27")).toBe(false);
    expect(scheduledDayCount(habit, "2026-10-26", "2026-11-01")).toBe(3);
  });

  it("labels schedules", () => {
    const habit = { scheduleDays: [1, 3, 5] };
    expect(scheduleShort(habit)).toBe("3 gün/hafta");
    expect(scheduleLabel(habit)).toBe("Pzt, Çar, Cum");
  });

  it("supports every-N-days schedules from the creation date", () => {
    const habit = { intervalDays: 3, createdAt: "2026-10-26" };
    expect(isDailySchedule(habit)).toBe(false);
    expect(isScheduled(habit, "2026-10-26")).toBe(true);
    expect(isScheduled(habit, "2026-10-27")).toBe(false);
    expect(isScheduled(habit, "2026-10-28")).toBe(false);
    expect(isScheduled(habit, "2026-10-29")).toBe(true);
    expect(scheduledDayCount(habit, "2026-10-26", "2026-11-01")).toBe(3);
    expect(scheduleShort(habit)).toBe("3 günde 1");
    expect(scheduleLabel(habit)).toBe("Her 3 günde 1");
  });

  it("normalizes interval values", () => {
    expect(normalizeIntervalDays(undefined)).toBeUndefined();
    expect(normalizeIntervalDays(1)).toBeUndefined();
    expect(normalizeIntervalDays(3)).toBe(3);
    expect(normalizeIntervalDays(2.4)).toBe(2);
    expect(normalizeIntervalDays(400)).toBeUndefined();
  });

  it("handles inclusive pauses, skips and expected days", () => {
    const habit = {
      scheduleDays: [1, 2, 3, 4, 5, 6, 0],
      pausedFrom: "2026-10-27",
      pausedUntil: "2026-10-28",
      skips: { "2026-10-29": "hasta" },
    };
    expect(isPaused(habit, "2026-10-26")).toBe(false);
    expect(isPaused(habit, "2026-10-27")).toBe(true);
    expect(isPaused(habit, "2026-10-28")).toBe(true);
    expect(isPaused(habit, "2026-10-29")).toBe(false);
    expect(isSkipped(habit, "2026-10-29")).toBe(true);
    expect(isSkipped(habit, "2026-10-30")).toBe(false);
    expect(isExpected(habit, "2026-10-26")).toBe(true);
    expect(isExpected(habit, "2026-10-27")).toBe(false);
    expect(isExpected(habit, "2026-10-29")).toBe(false);
    expect(isPaused({ pausedFrom: "2026-10-27" }, "2026-10-27")).toBe(false);
  });
});
