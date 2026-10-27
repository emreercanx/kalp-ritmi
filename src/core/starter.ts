import { todayLocal } from "./date";
import type { Habit } from "./types";

/** First-run habits. They are written to the vault on the first open so the
 *  board is usable immediately; no fake history is created. */
export function starterHabits(today = todayLocal()): Habit[] {
  const createdAt = today;
  return [
    {
      id: "dhikr-111",
      name: "Lâ ilâhe illallâh",
      emoji: "☝️",
      kind: "numeric",
      cadence: "daily",
      unit: "adet",
      target: 111,
      color: "#c06a7a",
      createdAt,
      log: {},
    },
    {
      id: "sabah-namazi",
      name: "Sabah namazı",
      emoji: "🕌",
      kind: "check",
      cadence: "daily",
      color: "#4a7fc1",
      createdAt,
      log: {},
    },
    {
      id: "su",
      name: "Su",
      emoji: "💧",
      kind: "numeric",
      cadence: "daily",
      unit: "bardak",
      target: 8,
      color: "#3d9c88",
      createdAt,
      log: {},
    },
    {
      id: "kuran",
      name: "Kur'an okuma",
      emoji: "📖",
      kind: "numeric",
      cadence: "daily",
      unit: "sayfa",
      target: 5,
      color: "#a8853e",
      createdAt,
      log: {},
    },
  ];
}
