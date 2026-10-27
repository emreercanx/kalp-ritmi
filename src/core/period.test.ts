import { describe, expect, it } from "vitest";
import {
  addPeriods,
  completedPeriodCount,
  eachPeriod,
  lastNPeriods,
  periodBestStreak,
  periodCurrentStreak,
  periodEnd,
  periodHeadLabel,
  periodStart,
  periodTitle,
} from "./period";
import type { Habit } from "./types";

function habit(log: Record<string, number>, createdAt = "2026-10-01"): Habit {
  return {
    id: "test",
    name: "Test",
    emoji: "•",
    kind: "check",
    cadence: "weekly",
    color: "#000",
    createdAt,
    log,
  };
}

describe("period helpers", () => {
  it("calculates Monday and calendar-month boundaries", () => {
    expect(periodStart("2026-10-26", "weekly", 1)).toBe("2026-10-26");
    expect(periodStart("2026-10-26", "weekly", 0)).toBe("2026-10-25");
    expect(periodEnd("2026-10-26", "weekly")).toBe("2026-11-01");
    expect(periodStart("2026-10-26", "monthly", 1)).toBe("2026-10-01");
    expect(periodEnd("2026-10-01", "monthly")).toBe("2026-10-31");
    expect(addPeriods("2026-01-31", 1, "monthly")).toBe("2026-02-28");
  });

  it("lists periods oldest first", () => {
    expect(lastNPeriods(4, "2026-10-26", "weekly", 1)).toEqual([
      "2026-10-05",
      "2026-10-12",
      "2026-10-19",
      "2026-10-26",
    ]);
    expect(eachPeriod("2026-08-15", "2026-10-26", "monthly", 1)).toEqual([
      "2026-08-01",
      "2026-09-01",
      "2026-10-01",
    ]);
  });

  it("formats period labels", () => {
    expect(periodTitle("2026-10-26", "weekly")).toBe("26 Ekim – 1 Kasım 2026");
    expect(periodHeadLabel("2026-10-26", "weekly")).toEqual({
      top: "26–01",
      bottom: "Kas",
    });
    expect(periodHeadLabel("2026-10-01", "monthly")).toEqual({
      top: "Eki",
      bottom: "26",
    });
  });

  it("counts completions and streaks in weeks", () => {
    const value = habit({
      "2026-10-05": 1,
      "2026-10-12": 1,
      "2026-10-19": 1,
    });

    expect(completedPeriodCount(value)).toBe(3);
    expect(periodCurrentStreak(value, "weekly", "2026-10-26", 1)).toBe(3);
    expect(periodCurrentStreak(value, "weekly", "2026-10-20", 1)).toBe(3);
    expect(periodBestStreak(value, "weekly", "2026-10-26", 1)).toBe(3);
    expect(periodBestStreak(habit({ "2026-10-05": 1, "2026-10-19": 1 }), "weekly", "2026-10-26", 1)).toBe(1);
  });
});
