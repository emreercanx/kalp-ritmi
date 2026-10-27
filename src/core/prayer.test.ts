import { describe, expect, it } from "vitest";
import {
  addLocalDays,
  formatClock,
  formatCountdown,
  nextPrayer,
  prayerSlots,
  type PrayerSlot,
} from "./prayer";

const config = {
  latitude: 41.0082,
  longitude: 28.9784,
  method: "turkey" as const,
  madhab: "hanefi" as const,
};

function slot(key: PrayerSlot["key"], hour: number, minute = 0): PrayerSlot {
  return {
    key,
    label: key,
    time: new Date(2026, 9, 26, hour, minute),
  };
}

describe("prayerSlots", () => {
  it("returns the five daily prayers in order", () => {
    const slots = prayerSlots(new Date(2026, 9, 26), config);
    expect(slots.map((item) => item.key)).toEqual([
      "fajr",
      "dhuhr",
      "asr",
      "maghrib",
      "isha",
    ]);
    expect(slots.map((item) => item.label)).toEqual([
      "Fecr",
      "Öğle",
      "İkindi",
      "Akşam",
      "Yatsı",
    ]);

    for (let index = 1; index < slots.length; index++) {
      expect(slots[index].time.getTime()).toBeGreaterThan(slots[index - 1].time.getTime());
    }
  });

  it("uses the Hanafi shadow length for Asr", () => {
    const hanefi = prayerSlots(new Date(2026, 9, 26), config);
    const shafi = prayerSlots(new Date(2026, 9, 26), { ...config, madhab: "safi" });
    const hanefiAsr = hanefi.find((item) => item.key === "asr");
    const shafiAsr = shafi.find((item) => item.key === "asr");

    expect(hanefiAsr).toBeDefined();
    expect(shafiAsr).toBeDefined();
    expect(hanefiAsr?.time.getTime()).toBeGreaterThan(shafiAsr?.time.getTime() ?? 0);
  });
});

describe("nextPrayer", () => {
  const slots = [
    slot("fajr", 5),
    slot("dhuhr", 12),
    slot("asr", 15),
    slot("maghrib", 18),
    slot("isha", 19),
  ];
  const tomorrow = [slot("fajr", 5)];
  tomorrow[0].time = addLocalDays(tomorrow[0].time, 1);

  it("finds the next prayer of the day", () => {
    const next = nextPrayer(slots, new Date(2026, 9, 26, 12, 30), tomorrow);
    expect(next?.slot.key).toBe("asr");
    expect(next?.tomorrow).toBe(false);
  });

  it("rolls over to tomorrow's Fajr after Isha", () => {
    const next = nextPrayer(slots, new Date(2026, 9, 26, 20), tomorrow);
    expect(next?.slot.key).toBe("fajr");
    expect(next?.tomorrow).toBe(true);
  });

  it("does not invent a prayer when no tomorrow data exists", () => {
    expect(nextPrayer(slots, new Date(2026, 9, 26, 20))).toBeNull();
  });
});

describe("prayer formatting", () => {
  it("formats clock values with leading zeroes", () => {
    expect(formatClock(new Date(2026, 9, 26, 5, 7))).toBe("05:07");
    expect(formatClock(new Date(2026, 9, 26, 23, 59))).toBe("23:59");
  });

  it("formats countdowns in minutes and hours", () => {
    expect(formatCountdown(0)).toBe("0 dk");
    expect(formatCountdown(60_000)).toBe("1 dk");
    expect(formatCountdown(3_600_000)).toBe("1 sa");
    expect(formatCountdown(5_400_000)).toBe("1 sa 30 dk");
  });

  it("adds local days across month boundaries", () => {
    const next = addLocalDays(new Date(2026, 9, 31, 23, 30), 1);
    expect([next.getFullYear(), next.getMonth(), next.getDate()]).toEqual([2026, 10, 1]);
  });
});
