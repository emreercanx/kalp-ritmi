import type { PrayerKey } from "./prayer";
import type { HabitDefinition } from "./types";

export const PRAYER_HABITS: Record<PrayerKey, HabitDefinition> = {
  fajr: {
    id: "sabah-namazi",
    name: "Sabah namazı",
    emoji: "🕌",
    kind: "check",
    color: "#4a7fc1",
  },
  dhuhr: {
    id: "ogle-namazi",
    name: "Öğle namazı",
    emoji: "🕌",
    kind: "check",
    color: "#c9a227",
  },
  asr: {
    id: "ikindi-namazi",
    name: "İkindi namazı",
    emoji: "🕌",
    kind: "check",
    color: "#c07a4a",
  },
  maghrib: {
    id: "aksam-namazi",
    name: "Akşam namazı",
    emoji: "🕌",
    kind: "check",
    color: "#b45a5a",
  },
  isha: {
    id: "yatsi-namazi",
    name: "Yatsı namazı",
    emoji: "🕌",
    kind: "check",
    color: "#5b5f9e",
  },
};

export function prayerHabitId(key: PrayerKey): string {
  return PRAYER_HABITS[key].id;
}

/** Prefer the stable id, but adopt an existing habit with the same Turkish name. */
export function findPrayerHabit<T extends { id: string; name: string }>(
  habits: T[],
  key: PrayerKey,
): T | undefined {
  const definition = PRAYER_HABITS[key];
  const byId = habits.find((habit) => habit.id === definition.id);
  if (byId) return byId;

  const name = definition.name.toLocaleLowerCase("tr");
  return habits.find((habit) => habit.name.trim().toLocaleLowerCase("tr") === name);
}
