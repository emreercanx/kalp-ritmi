import { describe, expect, it } from "vitest";
import {
  addDays,
  cutoffDate,
  dayCount,
  eachDay,
  formatRange,
  lastNDays,
  startOfMonth,
  startOfWeek,
} from "./date";
import {
  bestStreak,
  completionRate,
  currentStreak,
  doneDays,
  doneScheduledDays,
  earliestLogDate,
  effectiveStart,
  expectedScheduledDays,
  formatAmount,
  isDone,
  isDoneValue,
  sumRange,
  heatLevel,
  weeklyGoalProgress,
} from "./stats";
import type { Habit } from "./types";

function habit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: "h",
    name: "Test",
    emoji: "•",
    kind: "numeric",
    target: 10,
    color: "#000",
    createdAt: "2026-10-01",
    log: {},
    ...overrides,
  };
}

describe("date helpers", () => {
  it("uses Monday as the start of the week", () => {
    expect(startOfWeek("2026-10-26")).toBe("2026-10-26");
    expect(startOfWeek("2026-11-01")).toBe("2026-10-26");
  });

  it("supports a Sunday week start", () => {
    expect(startOfWeek("2026-10-26", 0)).toBe("2026-10-25");
    expect(startOfWeek("2026-10-31", 0)).toBe("2026-10-25");
    expect(startOfWeek("2026-11-01", 0)).toBe("2026-11-01");
  });

  it("moves early hours to the previous day at a cutoff", () => {
    expect(cutoffDate(new Date(2026, 9, 26, 2, 30), 4)).toBe("2026-10-25");
    expect(cutoffDate(new Date(2026, 9, 26, 4, 0), 4)).toBe("2026-10-26");
    expect(cutoffDate(new Date(2026, 9, 26, 2, 30), 0)).toBe("2026-10-26");
    expect(cutoffDate(new Date(2026, 0, 1, 3, 15), 5)).toBe("2025-12-31");
  });

  it("finds the start of the month", () => {
    expect(startOfMonth("2026-10-26")).toBe("2026-10-01");
  });

  it("builds inclusive ranges across month boundaries", () => {
    expect(eachDay("2026-10-30", "2026-11-02")).toEqual([
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
    ]);
    expect(dayCount("2026-10-30", "2026-11-02")).toBe(4);
    expect(dayCount("2026-11-02", "2026-10-30")).toBe(0);
  });

  it("returns the last N days ending today", () => {
    expect(lastNDays(3, "2026-10-26")).toEqual(["2026-10-24", "2026-10-25", "2026-10-26"]);
    expect(addDays("2026-10-01", -1)).toBe("2026-09-30");
  });

  it("formats ranges in Turkish", () => {
    expect(formatRange("2026-10-20", "2026-10-26")).toBe("20–26 Ekim 2026");
    expect(formatRange("2026-10-29", "2026-11-04")).toBe("29 Ekim – 4 Kasım 2026");
  });
});

describe("habit stats", () => {
  const logs = {
    "2026-10-23": 10,
    "2026-10-24": 10,
    "2026-10-25": 5,
    "2026-10-26": 12,
  };

  it("sums only the requested range", () => {
    const h = habit({ log: logs });
    expect(sumRange(h, "2026-10-24", "2026-10-26")).toBe(27);
    expect(sumRange(h, "2026-10-25", "2026-10-25")).toBe(5);
    expect(sumRange(h, "2026-09-01", "2026-09-30")).toBe(0);
  });

  it("counts days that reached the target", () => {
    const h = habit({ log: logs });
    expect(doneDays(h, "2026-10-23", "2026-10-26")).toBe(3);
    expect(doneDays(h, "2026-10-25", "2026-10-25")).toBe(0);
  });

  it("treats a check habit as done for any positive value", () => {
    const h = habit({ kind: "check", target: undefined, log: { "2026-10-26": 1 } });
    expect(isDoneValue(h, 1)).toBe(true);
    expect(doneDays(h, "2026-10-26", "2026-10-26")).toBe(1);
  });

  it("excludes off-day extras from scheduled completion", () => {
    const h = habit({
      kind: "check",
      target: undefined,
      scheduleDays: [1, 3, 5],
      createdAt: "2026-10-26",
      log: {
        "2026-10-26": 1,
        "2026-10-27": 1,
        "2026-10-28": 1,
        "2026-10-30": 1,
      },
    });
    expect(doneDays(h, "2026-10-26", "2026-11-01")).toBe(4);
    expect(doneScheduledDays(h, "2026-10-26", "2026-11-01")).toBe(3);
    expect(completionRate(h, 30, "2026-11-01")).toBe(100);
  });

  it("skips off days in the current streak", () => {
    const h = habit({
      kind: "check",
      target: undefined,
      scheduleDays: [1, 3, 5],
      log: {
        "2026-10-26": 1,
        "2026-10-28": 1,
        "2026-10-30": 1,
      },
    });
    expect(currentStreak(h, "2026-11-01")).toBe(3);
    expect(currentStreak(h, "2026-10-31")).toBe(3);
    expect(currentStreak(h, "2026-10-29")).toBe(2);
  });

  it("gives today grace only when today is scheduled", () => {
    const h = habit({
      kind: "check",
      target: undefined,
      scheduleDays: [1, 3, 5],
      log: { "2026-10-26": 1, "2026-10-28": 1 },
    });
    expect(currentStreak(h, "2026-10-30")).toBe(2);
    expect(currentStreak(h, "2026-10-31")).toBe(0);
  });

  it("skips off days in the longest streak", () => {
    const h = habit({
      kind: "check",
      target: undefined,
      scheduleDays: [1, 3, 5],
      log: {
        "2026-10-26": 1,
        "2026-10-28": 1,
        "2026-10-30": 1,
        "2026-11-02": 1,
      },
    });
    expect(bestStreak(h)).toBe(4);
  });

  it("keeps a streak alive when today is still empty", () => {
    const h = habit({
      log: { "2026-10-24": 10, "2026-10-25": 10, "2026-10-26": 0 },
    });
    expect(currentStreak(h, "2026-10-26")).toBe(2);
  });

  it("does not break the streak on a partial today", () => {
    const h = habit({ log: { "2026-10-24": 10, "2026-10-25": 10, "2026-10-26": 3 } });
    expect(currentStreak(h, "2026-10-26")).toBe(2);
  });

  it("finds the longest streak in history", () => {
    const h = habit({
      log: {
        "2026-10-01": 10,
        "2026-10-02": 10,
        "2026-10-03": 10,
        "2026-10-05": 10,
        "2026-10-06": 10,
      },
    });
    expect(bestStreak(h)).toBe(3);
    expect(bestStreak(habit())).toBe(0);
  });

  it("ignores partial numeric days when finding the longest streak", () => {
    const h = habit({
      log: { "2026-10-01": 10, "2026-10-02": 3, "2026-10-03": 10 },
    });
    expect(bestStreak(h)).toBe(1);
  });

  it("calculates a 30-day completion rate", () => {
    const h = habit({ log: logs });
    expect(completionRate(h, 30, "2026-10-26")).toBe(12);
  });

  it("includes entries backfilled before createdAt in the completion window", () => {
    const h = habit({
      createdAt: "2026-10-26",
      log: { "2026-10-25": 10, "2026-10-26": 10 },
    });
    expect(completionRate(h, 30, "2026-10-26")).toBe(100);
  });

  it("returns null for a habit with no entries", () => {
    expect(completionRate(habit(), 30, "2026-10-26")).toBeNull();
    expect(earliestLogDate(habit())).toBeNull();
  });

  it("finds the first log date", () => {
    expect(earliestLogDate(habit({ log: logs }))).toBe("2026-10-23");
  });

  it("starts ranges at backfilled entries, never before them", () => {
    const h = habit({ createdAt: "2026-10-26", log: { "2026-10-25": 666 } });
    expect(effectiveStart(h, "2026-10-01")).toBe("2026-10-25");
    expect(effectiveStart(h, "2026-10-26")).toBe("2026-10-26");
    expect(effectiveStart(habit(), "2026-10-01")).toBe("2026-10-01");
  });

  it("maps daily values to heat levels", () => {
    const check = habit({ kind: "check" });
    expect(heatLevel(check, 0)).toBe(0);
    expect(heatLevel(check, 1)).toBe(3);

    const numeric = habit({ kind: "numeric", target: 10 });
    expect(heatLevel(numeric, 0)).toBe(0);
    expect(heatLevel(numeric, 1)).toBe(1);
    expect(heatLevel(numeric, 5)).toBe(2);
    expect(heatLevel(numeric, 10)).toBe(3);
    expect(heatLevel(numeric, 12)).toBe(3);
  });

  it("tracks an optional weekly goal", () => {
    const check = habit({
      kind: "check",
      target: undefined,
      weeklyGoal: 3,
      log: { "2026-10-20": 1, "2026-10-22": 1, "2026-10-24": 1 },
    });
    expect(weeklyGoalProgress(check, "2026-10-19", "2026-10-26")).toEqual({
      current: 3,
      target: 3,
      rate: 100,
    });

    const numeric = habit({
      weeklyGoal: 100,
      log: { "2026-10-24": 40, "2026-10-25": 80 },
    });
    expect(weeklyGoalProgress(numeric, "2026-10-19", "2026-10-26")).toEqual({
      current: 120,
      target: 100,
      rate: 100,
    });
    expect(weeklyGoalProgress(habit(), "2026-10-19", "2026-10-26")).toBeNull();
  });

  it("counts a numeric minimum as done without hiding partial progress", () => {
    const h = habit({ target: 10, minimum: 5, log: { "2026-10-26": 5 } });
    expect(isDoneValue(h, 5)).toBe(true);
    expect(isDone(h, "2026-10-26")).toBe(true);
    expect(heatLevel(h, 5)).toBe(2);
    expect(heatLevel(h, 10)).toBe(3);
    expect(isDoneValue(h, 4)).toBe(false);
  });

  it("excludes skipped and paused days from expected completion", () => {
    const h = habit({
      kind: "check",
      target: undefined,
      createdAt: "2026-10-20",
      skips: { "2026-10-25": "yolculuk" },
      pausedFrom: "2026-10-26",
      pausedUntil: "2026-10-26",
      log: { "2026-10-20": 1, "2026-10-21": 1 },
    });
    expect(expectedScheduledDays(h, "2026-10-20", "2026-10-26")).toBe(5);
    expect(doneScheduledDays(h, "2026-10-20", "2026-10-26")).toBe(2);
    expect(completionRate(h, 30, "2026-10-26")).toBe(40);
  });

  it("keeps skipped and paused days from breaking a streak", () => {
    const h = habit({
      kind: "check",
      target: undefined,
      createdAt: "2026-10-20",
      skips: { "2026-10-26": "hasta" },
      log: { "2026-10-24": 1, "2026-10-25": 1 },
    });
    expect(currentStreak(h, "2026-10-26")).toBe(2);

    const paused = habit({
      kind: "check",
      target: undefined,
      createdAt: "2026-10-20",
      pausedFrom: "2026-10-26",
      pausedUntil: "2026-10-27",
      log: { "2026-10-24": 1, "2026-10-25": 1 },
    });
    expect(currentStreak(paused, "2026-10-27")).toBe(2);
  });

  it("formats thousands for Turkish readers", () => {
    expect(formatAmount(1110)).toBe("1.110");
  });
});
