import { describe, expect, it } from "vitest";
import { formatHijri, hijriParts } from "./hijri";

describe("hijriParts", () => {
  it("converts known Gregorian dates with Umm al-Qura", () => {
    expect(hijriParts("2026-10-26")).toEqual({ day: 15, month: 5, year: 1448 });
    expect(hijriParts("2026-03-20")).toEqual({ day: 1, month: 10, year: 1447 });
    expect(hijriParts("2026-06-16")).toEqual({ day: 1, month: 1, year: 1448 });
  });

  it("applies a day shift", () => {
    expect(hijriParts("2026-10-26", 1)).toEqual({ day: 16, month: 5, year: 1448 });
    expect(hijriParts("2026-10-26", -1)).toEqual({ day: 14, month: 5, year: 1448 });
  });

  it("rejects invalid dates", () => {
    expect(hijriParts("2026-02-30")).toBeNull();
    expect(hijriParts("26.10.2026")).toBeNull();
  });
});

describe("formatHijri", () => {
  it("uses Turkish month names", () => {
    expect(formatHijri("2026-10-26")).toBe("15 Cemaziyelevvel 1448");
    expect(formatHijri("2026-03-20")).toBe("1 Şevval 1447");
    expect(formatHijri("2026-06-16")).toBe("1 Muharrem 1448");
  });

  it("returns an empty string when it cannot convert", () => {
    expect(formatHijri("bad-date")).toBe("");
  });
});
