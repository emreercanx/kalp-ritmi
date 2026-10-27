import { describe, expect, it } from "vitest";
import { monthsInYear, weeksInMonth } from "./period-calendar";

describe("period calendar pages", () => {
  it("lists the weeks overlapping a Monday-start month", () => {
    expect(weeksInMonth("2026-10", 1)).toEqual([
      "2026-09-28",
      "2026-10-05",
      "2026-10-12",
      "2026-10-19",
      "2026-10-26",
    ]);
  });

  it("lists the weeks overlapping a Sunday-start month", () => {
    expect(weeksInMonth("2026-02", 0)).toEqual([
      "2026-02-01",
      "2026-02-08",
      "2026-02-15",
      "2026-02-22",
    ]);
  });

  it("includes a leading week from the previous month", () => {
    expect(weeksInMonth("2026-02", 1)[0]).toBe("2026-01-26");
  });

  it("returns all twelve months of a year", () => {
    const months = monthsInYear(2026);
    expect(months).toHaveLength(12);
    expect(months[0]).toBe("2026-01-01");
    expect(months[11]).toBe("2026-12-01");
  });
});
