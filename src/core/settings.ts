import {
  PRAYER_METHOD_IDS,
  type PrayerMadhab,
  type PrayerMethodId,
} from "./prayer";

export interface RitimSettings {
  /** Number of day columns on the board. */
  visibleDays: number;
  /** Number of week columns in the weekly panel. */
  visibleWeeks: number;
  /** Number of month columns in the monthly panel. */
  visibleMonths: number;
  /** 1 = Monday, 0 = Sunday. */
  weekStart: 0 | 1;
  /** Entries before this local hour count as the previous day. */
  cutoffHour: number;
  /** Vault folder for auto-created per-habit Markdown notes. */
  habitDocFolder: string;
  /** Markdown file used by the quick to-do button and note widget. */
  quickTodoPath: string;
  /** Bring the board forward when Obsidian launches. */
  openBoardOnStartup: boolean;
  /** Show the Umm al-Qura date under the board title. */
  hijriEnabled: boolean;
  /** Day shift for matching a local Hijri calendar, from -2 to +2. */
  hijriOffset: number;
  /** Show the daily prayer time strip. */
  prayerEnabled: boolean;
  prayerCity: string;
  prayerLatitude: number;
  prayerLongitude: number;
  prayerMethod: PrayerMethodId;
  prayerMadhab: PrayerMadhab;
}

export const DEFAULT_SETTINGS: RitimSettings = {
  visibleDays: 7,
  visibleWeeks: 4,
  visibleMonths: 4,
  weekStart: 1,
  cutoffHour: 0,
  habitDocFolder: "Ritim/alışkanlıklar",
  quickTodoPath: "Ritim/Hızlı yapılacaklar.md",
  openBoardOnStartup: false,
  hijriEnabled: true,
  hijriOffset: 0,
  prayerEnabled: false,
  prayerCity: "İstanbul",
  prayerLatitude: 41.0082,
  prayerLongitude: 28.9784,
  prayerMethod: "turkey",
  prayerMadhab: "hanefi",
};

const CUTOFF_HOURS = [0, 3, 4, 5];

export const DEFAULT_HABIT_DOC_FOLDER = "Ritim/alışkanlıklar";
export const DEFAULT_QUICK_TODO_PATH = "Ritim/Hızlı yapılacaklar.md";

/** Keep the auto-doc folder a clean vault-relative path. */
export function normalizeHabitDocFolder(raw: unknown): string {
  if (typeof raw !== "string") return DEFAULT_HABIT_DOC_FOLDER;
  const value = raw
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .split("/")
    .filter((part) => part && part !== "." && part !== "..")
    .join("/");
  return value || DEFAULT_HABIT_DOC_FOLDER;
}

/** Keep the quick to-do file a clean, Markdown-path vault path. */
export function normalizeQuickTodoPath(raw: unknown): string {
  if (typeof raw !== "string") return DEFAULT_QUICK_TODO_PATH;
  const value = raw
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .split("/")
    .filter((part) => part && part !== "." && part !== "..")
    .join("/");
  if (!value) return DEFAULT_QUICK_TODO_PATH;
  return /\.md$/i.test(value) ? value : `${value}.md`;
}

export function normalizeSettings(raw: unknown): RitimSettings {
  const value = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  const days = Number(value.visibleDays);
  const visibleDays = Number.isFinite(days)
    ? Math.min(14, Math.max(3, Math.round(days)))
    : DEFAULT_SETTINGS.visibleDays;

  const weeks = Number(value.visibleWeeks);
  const visibleWeeks = Number.isFinite(weeks)
    ? Math.min(8, Math.max(2, Math.round(weeks)))
    : DEFAULT_SETTINGS.visibleWeeks;

  const months = Number(value.visibleMonths);
  const visibleMonths = Number.isFinite(months)
    ? Math.min(12, Math.max(3, Math.round(months)))
    : DEFAULT_SETTINGS.visibleMonths;

  const weekStart: 0 | 1 = value.weekStart === 0 ? 0 : 1;

  const cutoff = Number(value.cutoffHour);
  const cutoffHour = CUTOFF_HOURS.includes(cutoff) ? cutoff : DEFAULT_SETTINGS.cutoffHour;

  const offset = Number(value.hijriOffset);
  const hijriOffset = Number.isFinite(offset)
    ? Math.min(2, Math.max(-2, Math.round(offset)))
    : DEFAULT_SETTINGS.hijriOffset;

  const city =
    typeof value.prayerCity === "string" && value.prayerCity.trim()
      ? value.prayerCity.trim().slice(0, 60)
      : DEFAULT_SETTINGS.prayerCity;

  const latitude = Number(value.prayerLatitude);
  const longitude = Number(value.prayerLongitude);

  const method =
    typeof value.prayerMethod === "string" &&
    PRAYER_METHOD_IDS.includes(value.prayerMethod as PrayerMethodId)
      ? (value.prayerMethod as PrayerMethodId)
      : DEFAULT_SETTINGS.prayerMethod;

  return {
    visibleDays,
    visibleWeeks,
    visibleMonths,
    weekStart,
    cutoffHour,
    habitDocFolder: normalizeHabitDocFolder(value.habitDocFolder),
    quickTodoPath: normalizeQuickTodoPath(value.quickTodoPath),
    openBoardOnStartup: value.openBoardOnStartup === true,
    hijriEnabled: value.hijriEnabled !== false,
    hijriOffset,
    prayerEnabled: value.prayerEnabled === true,
    prayerCity: city,
    prayerLatitude:
      Number.isFinite(latitude) && latitude >= -90 && latitude <= 90
        ? latitude
        : DEFAULT_SETTINGS.prayerLatitude,
    prayerLongitude:
      Number.isFinite(longitude) && longitude >= -180 && longitude <= 180
        ? longitude
        : DEFAULT_SETTINGS.prayerLongitude,
    prayerMethod: method,
    prayerMadhab: value.prayerMadhab === "safi" ? "safi" : "hanefi",
  };
}
