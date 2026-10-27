import { describe, expect, it } from "vitest";
import { sortByStack, stackParentName, wouldCreateStackCycle } from "./stacking";
import type { Habit } from "./types";

function habit(id: string, stackAfter?: string): Habit {
  return {
    id,
    name: id,
    emoji: "•",
    kind: "check",
    color: "#000",
    stackAfter,
    log: {},
  };
}

describe("habit stacking", () => {
  it("puts cue habits before stacked habits while keeping stable order", () => {
    const habits = [habit("b", "a"), habit("c"), habit("a"), habit("d", "c")];
    expect(sortByStack(habits).map((item) => item.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("detects direct and indirect cycles", () => {
    const habits = [habit("a"), habit("b", "c"), habit("c", "a")];
    expect(wouldCreateStackCycle(habits, "a", "a")).toBe(true);
    expect(wouldCreateStackCycle(habits, "a", "b")).toBe(true);
    expect(wouldCreateStackCycle(habits, "a", "c")).toBe(true);
    expect(wouldCreateStackCycle(habits, "b", "c")).toBe(false);
  });

  it("survives malformed cycles and finds cue names", () => {
    const habits = [habit("a", "b"), habit("b", "a")];
    expect(sortByStack(habits)).toHaveLength(2);
    expect(stackParentName(habits, habits[0])).toBe("b");
    expect(stackParentName(habits, habit("x"))).toBeUndefined();
  });
});
