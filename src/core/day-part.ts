import type { HabitDayPart } from "./types";

export const DAY_PART_ORDER: HabitDayPart[] = [
  "morning",
  "afternoon",
  "evening",
  "anytime",
];

export const DAY_PART_LABELS: Record<HabitDayPart, string> = {
  morning: "Sabah",
  afternoon: "Öğleden sonra",
  evening: "Akşam",
  anytime: "Gün içinde",
};

export function normalizeDayPart(raw: unknown): HabitDayPart | undefined {
  if (raw === "morning" || raw === "afternoon" || raw === "evening") return raw;
  if (raw === "anytime") return "anytime";
  return undefined;
}

export function dayPartOf(habit: { dayPart?: HabitDayPart }): HabitDayPart {
  return normalizeDayPart(habit.dayPart) ?? "anytime";
}

export function dayPartLabel(part: HabitDayPart): string {
  return DAY_PART_LABELS[part];
}
