import { describe, expect, it } from "vitest";
import { findPrayerHabit, prayerHabitId } from "./prayer-habits";

describe("prayer habits", () => {
  it("uses stable ids for the five prayers", () => {
    expect(prayerHabitId("fajr")).toBe("sabah-namazi");
    expect(prayerHabitId("dhuhr")).toBe("ogle-namazi");
    expect(prayerHabitId("asr")).toBe("ikindi-namazi");
    expect(prayerHabitId("maghrib")).toBe("aksam-namazi");
    expect(prayerHabitId("isha")).toBe("yatsi-namazi");
  });

  it("finds a habit by id first", () => {
    const habits = [{ id: "sabah-namazi", name: "Sabah" }];
    expect(findPrayerHabit(habits, "fajr")).toBe(habits[0]);
  });

  it("adopts an existing habit with the same Turkish name", () => {
    const habits = [{ id: "custom", name: "ÖĞLE NAMAZI" }];
    expect(findPrayerHabit(habits, "dhuhr")).toBe(habits[0]);
  });
});
