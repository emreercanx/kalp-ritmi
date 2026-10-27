import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, normalizeSettings } from "./settings";

describe("normalizeSettings", () => {
  it("returns defaults for missing or invalid data", () => {
    expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings("bad")).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings({ visibleDays: "x", weekStart: 2, cutoffHour: 2 })).toEqual(
      DEFAULT_SETTINGS,
    );
  });

  it("clamps visible days to the supported range", () => {
    expect(normalizeSettings({ visibleDays: 1 }).visibleDays).toBe(3);
    expect(normalizeSettings({ visibleDays: 20 }).visibleDays).toBe(14);
    expect(normalizeSettings({ visibleDays: 10 }).visibleDays).toBe(10);
  });

  it("keeps Sunday as an explicit week start", () => {
    expect(normalizeSettings({ weekStart: 0 }).weekStart).toBe(0);
    expect(normalizeSettings({ weekStart: 1 }).weekStart).toBe(1);
    expect(normalizeSettings({}).weekStart).toBe(1);
  });

  it("normalizes period panel settings", () => {
    expect(DEFAULT_SETTINGS.visibleWeeks).toBe(4);
    expect(DEFAULT_SETTINGS.visibleMonths).toBe(4);
    expect(normalizeSettings({}).visibleWeeks).toBe(4);
    expect(normalizeSettings({ visibleWeeks: 1 }).visibleWeeks).toBe(2);
    expect(normalizeSettings({ visibleWeeks: 20 }).visibleWeeks).toBe(8);
    expect(normalizeSettings({ visibleWeeks: "x" }).visibleWeeks).toBe(4);
    expect(normalizeSettings({ visibleMonths: 1 }).visibleMonths).toBe(3);
    expect(normalizeSettings({ visibleMonths: 20 }).visibleMonths).toBe(12);
    expect(normalizeSettings({ visibleMonths: "x" }).visibleMonths).toBe(4);
  });

  it("normalizes the habit note folder", () => {
    expect(DEFAULT_SETTINGS.habitDocFolder).toBe("Ritim/alışkanlıklar");
    expect(normalizeSettings({}).habitDocFolder).toBe("Ritim/alışkanlıklar");
    expect(
      normalizeSettings({ habitDocFolder: "  Notlar\\Alışkanlık//  " }).habitDocFolder,
    ).toBe("Notlar/Alışkanlık");
    expect(normalizeSettings({ habitDocFolder: "..//" }).habitDocFolder).toBe(
      "Ritim/alışkanlıklar",
    );
  });

  it("normalizes the quick to-do file path", () => {
    expect(DEFAULT_SETTINGS.quickTodoPath).toBe("Ritim/Hızlı yapılacaklar.md");
    expect(normalizeSettings({}).quickTodoPath).toBe("Ritim/Hızlı yapılacaklar.md");
    expect(
      normalizeSettings({ quickTodoPath: "  Notlar\\Görevler//" }).quickTodoPath,
    ).toBe("Notlar/Görevler.md");
    expect(normalizeSettings({ quickTodoPath: "Todo.MD" }).quickTodoPath).toBe("Todo.MD");
    expect(normalizeSettings({ quickTodoPath: "..//" }).quickTodoPath).toBe(
      "Ritim/Hızlı yapılacaklar.md",
    );
  });

  it("accepts only supported cutoff hours", () => {
    expect(normalizeSettings({ cutoffHour: 3 }).cutoffHour).toBe(3);
    expect(normalizeSettings({ cutoffHour: 4 }).cutoffHour).toBe(4);
    expect(normalizeSettings({ cutoffHour: 5 }).cutoffHour).toBe(5);
    expect(normalizeSettings({ cutoffHour: 2 }).cutoffHour).toBe(0);
  });

  it("keeps Hijri display on by default and clamps its offset", () => {
    expect(DEFAULT_SETTINGS.hijriEnabled).toBe(true);
    expect(normalizeSettings({}).hijriEnabled).toBe(true);
    expect(normalizeSettings({ hijriEnabled: false }).hijriEnabled).toBe(false);
    expect(normalizeSettings({ hijriOffset: 9 }).hijriOffset).toBe(2);
    expect(normalizeSettings({ hijriOffset: -9 }).hijriOffset).toBe(-2);
    expect(normalizeSettings({ hijriOffset: "x" }).hijriOffset).toBe(0);
  });

  it("normalizes prayer settings", () => {
    expect(DEFAULT_SETTINGS.prayerEnabled).toBe(false);
    expect(DEFAULT_SETTINGS.prayerCity).toBe("İstanbul");
    expect(normalizeSettings({ prayerEnabled: true, prayerCity: "  Ankara " }).prayerCity).toBe(
      "Ankara",
    );
    expect(
      normalizeSettings({
        prayerMethod: "unknown",
        prayerMadhab: "unknown",
        prayerLatitude: 100,
        prayerLongitude: -200,
      }),
    ).toMatchObject({
      prayerMethod: "turkey",
      prayerMadhab: "hanefi",
      prayerLatitude: DEFAULT_SETTINGS.prayerLatitude,
      prayerLongitude: DEFAULT_SETTINGS.prayerLongitude,
    });
    expect(
      normalizeSettings({
        prayerMethod: "mwl",
        prayerMadhab: "safi",
        prayerLatitude: 39.9,
        prayerLongitude: 32.8,
      }),
    ).toMatchObject({
      prayerMethod: "mwl",
      prayerMadhab: "safi",
      prayerLatitude: 39.9,
      prayerLongitude: 32.8,
    });
  });
});
