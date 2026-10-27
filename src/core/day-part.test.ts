import { describe, expect, it } from "vitest";
import { dayPartLabel, dayPartOf, normalizeDayPart } from "./day-part";

describe("day parts", () => {
  it("normalizes known parts and falls back to anytime", () => {
    expect(normalizeDayPart("morning")).toBe("morning");
    expect(normalizeDayPart("anytime")).toBe("anytime");
    expect(normalizeDayPart("gece")).toBeUndefined();
    expect(dayPartOf({ dayPart: "evening" })).toBe("evening");
    expect(dayPartOf({})).toBe("anytime");
  });

  it("labels parts in Turkish", () => {
    expect(dayPartLabel("afternoon")).toBe("Öğleden sonra");
  });
});
