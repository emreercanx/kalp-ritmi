import { describe, expect, it } from "vitest";
import { addMonths, habitDayMark, monthGrid, monthOf } from "./calendar";
import { formatMonth } from "./date";
import type { Habit } from "./types";

describe("calendar helpers", () => {
  it("finds and formats the month", () => {
    expect(monthOf("2026-10-26")).toBe("2026-10");
    expect(formatMonth("2026-10")).toBe("Ekim 2026");
  });

  it("moves across year boundaries", () => {
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-10", 12)).toBe("2027-10");
  });

  it("builds a six-week Monday-start grid", () => {
    const grid = monthGrid("2026-10", 1);

    expect(grid).toHaveLength(42);
    expect(grid[0]).toEqual({ date: "2026-09-28", inMonth: false });
    expect(grid[41]).toEqual({ date: "2026-11-08", inMonth: false });
    expect(grid.filter((cell) => cell.inMonth)).toHaveLength(31);
  });

  it("supports a Sunday-start grid", () => {
    const grid = monthGrid("2026-10", 0);

    expect(grid[0]).toEqual({ date: "2026-09-27", inMonth: false });
    expect(grid[41]).toEqual({ date: "2026-11-07", inMonth: false });
    expect(grid.filter((cell) => cell.inMonth)).toHaveLength(31);
  });
});

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

describe("habitDayMark", () => {
  it("returns nothing for an empty day", () => {
    expect(habitDayMark(habit(), "2026-10-26")).toBeNull();
  });

  it("marks a partial numeric day", () => {
    const h = habit({ log: { "2026-10-26": 4.5 } });
    expect(habitDayMark(h, "2026-10-26")).toEqual({ value: 4.5, done: false, label: "4,5" });
  });

  it("marks a completed numeric day", () => {
    const h = habit({ log: { "2026-10-26": 11 } });
    expect(habitDayMark(h, "2026-10-26")).toEqual({ value: 11, done: true, label: "11" });
  });

  it("marks a check habit with a tick", () => {
    const h = habit({ kind: "check", target: undefined, log: { "2026-10-26": 1 } });
    expect(habitDayMark(h, "2026-10-26")).toEqual({ value: 1, done: true, label: "✓" });
  });
});
