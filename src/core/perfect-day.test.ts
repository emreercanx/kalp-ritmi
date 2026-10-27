import { describe, expect, it } from "vitest";
import { perfectDayStatus } from "./perfect-day";
import type { Habit } from "./types";

function habit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: "h",
    name: "Test",
    emoji: "•",
    kind: "check",
    color: "#000",
    createdAt: "2026-10-20",
    log: {},
    ...overrides,
  };
}

describe("perfectDayStatus", () => {
  it("counts due and done daily habits", () => {
    const status = perfectDayStatus(
      [
        habit({ id: "a", log: { "2026-10-26": 1 } }),
        habit({ id: "b" }),
        habit({ id: "c", skips: { "2026-10-26": "" } }),
        habit({ id: "d", pausedFrom: "2026-10-26", pausedUntil: "2026-10-26" }),
        habit({ id: "e", cadence: "weekly" }),
      ],
      "2026-10-26",
    );
    expect(status).toEqual({
      due: 2,
      done: 1,
      skipped: 1,
      paused: 1,
      perfect: false,
    });
  });

  it("marks a day perfect only when every expected daily habit is done", () => {
    const done = [
      habit({ id: "a", log: { "2026-10-26": 1 } }),
      habit({ id: "b", kind: "numeric", target: 10, minimum: 5, log: { "2026-10-26": 5 } }),
    ];
    expect(perfectDayStatus(done, "2026-10-26").perfect).toBe(true);
    expect(
      perfectDayStatus([habit({ id: "a", log: { "2026-10-26": 1 } }), habit({ id: "b" })], "2026-10-26")
        .perfect,
    ).toBe(false);
  });

  it("does not call a day with no expectations perfect", () => {
    expect(
      perfectDayStatus(
        [habit({ pausedFrom: "2026-10-26", pausedUntil: "2026-10-26" })],
        "2026-10-26",
      ),
    ).toMatchObject({ due: 0, perfect: false });
  });
});
