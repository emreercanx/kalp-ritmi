import { describe, expect, it } from "vitest";
import { dayBreakdown, monthTrend, weekdayTrend } from "./insights";
import type { Habit } from "./types";

function habit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: "h",
    name: "Test",
    emoji: "•",
    kind: "numeric",
    target: 10,
    minimum: 5,
    color: "#000",
    createdAt: "2026-10-01",
    log: {},
    ...overrides,
  };
}

describe("dayBreakdown", () => {
  it("separates done, partial, missed, skipped, paused and off days", () => {
    const result = dayBreakdown(
      habit({
        scheduleDays: [0, 1, 2, 4, 5, 6],
        pausedFrom: "2026-10-06",
        pausedUntil: "2026-10-06",
        skips: { "2026-10-05": "izin" },
        log: {
          "2026-10-01": 10,
          "2026-10-02": 6,
          "2026-10-03": 3,
        },
      }),
      "2026-09-25",
      "2026-10-07",
    );

    expect(result).toEqual({
      done: 2,
      partial: 1,
      missed: 1,
      skipped: 1,
      paused: 1,
      off: 1,
    });
  });

  it("counts check habits as done for any positive value", () => {
    const result = dayBreakdown(
      habit({
        kind: "check",
        log: { "2026-10-01": 1, "2026-10-02": 2 },
      }),
      "2026-10-01",
      "2026-10-03",
    );

    expect(result.done).toBe(2);
    expect(result.missed).toBe(1);
    expect(result.partial).toBe(0);
  });
});

describe("monthTrend", () => {
  it("returns recent months oldest first and skips months before creation", () => {
    const result = monthTrend(
      habit({
        kind: "check",
        createdAt: "2026-10-01",
        log: { "2026-10-01": 1, "2026-10-02": 1 },
      }),
      2,
      "2026-10-03",
    );

    expect(result.map((point) => point.label)).toEqual(["Eyl", "Eki"]);
    expect(result[0]).toMatchObject({ days: 0, done: 0, rate: null });
    expect(result[1]).toMatchObject({ days: 3, done: 2, rate: 67 });
  });
});

describe("weekdayTrend", () => {
  it("orders weekdays from the configured start and uses expected days", () => {
    const result = weekdayTrend(
      habit({
        createdAt: "2026-09-28",
        log: {
          "2026-09-28": 10,
          "2026-10-05": 10,
        },
      }),
      2,
      "2026-10-11",
      1,
    );

    expect(result.map((point) => point.label)).toEqual([
      "Pzt",
      "Sal",
      "Çar",
      "Per",
      "Cum",
      "Cmt",
      "Paz",
    ]);
    expect(result[0]).toMatchObject({ days: 2, done: 2, rate: 100 });
    expect(result[1]).toMatchObject({ days: 2, done: 0, rate: 0 });
  });

  it("ignores days before the habit was created", () => {
    const result = weekdayTrend(
      habit({
        createdAt: "2026-10-05",
        log: { "2026-10-05": 10 },
      }),
      2,
      "2026-10-11",
      1,
    );

    expect(result[0]).toMatchObject({ label: "Pzt", days: 1, done: 1, rate: 100 });
    expect(result[1]).toMatchObject({ label: "Sal", days: 1, done: 0, rate: 0 });
  });
});
