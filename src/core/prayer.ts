import {
  CalculationMethod,
  Coordinates,
  Madhab,
  PrayerTimes,
  type CalculationParameters,
} from "adhan";

export type PrayerMethodId =
  | "turkey"
  | "mwl"
  | "ummAlQura"
  | "isna"
  | "karachi"
  | "egyptian";

export type PrayerMadhab = "hanefi" | "safi";

export interface PrayerMethod {
  id: PrayerMethodId;
  label: string;
  parameters: () => CalculationParameters;
}

export const PRAYER_METHODS: PrayerMethod[] = [
  { id: "turkey", label: "Diyanet (Türkiye)", parameters: CalculationMethod.Turkey },
  {
    id: "mwl",
    label: "Dünya Müslüman Birliği",
    parameters: CalculationMethod.MuslimWorldLeague,
  },
  { id: "ummAlQura", label: "Ümmü'l-Kura", parameters: CalculationMethod.UmmAlQura },
  { id: "isna", label: "Kuzey Amerika (ISNA)", parameters: CalculationMethod.NorthAmerica },
  { id: "karachi", label: "Karachi", parameters: CalculationMethod.Karachi },
  { id: "egyptian", label: "Mısır", parameters: CalculationMethod.Egyptian },
];

export const PRAYER_METHOD_IDS: PrayerMethodId[] = PRAYER_METHODS.map((method) => method.id);

export interface PrayerConfig {
  latitude: number;
  longitude: number;
  method: PrayerMethodId;
  madhab: PrayerMadhab;
}

export type PrayerKey = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";

export interface PrayerSlot {
  key: PrayerKey;
  label: string;
  time: Date;
}

const PRAYER_LABELS: Record<PrayerKey, string> = {
  fajr: "Fecr",
  dhuhr: "Öğle",
  asr: "İkindi",
  maghrib: "Akşam",
  isha: "Yatsı",
};

export function findPrayerMethod(id: PrayerMethodId): PrayerMethod {
  return PRAYER_METHODS.find((method) => method.id === id) ?? PRAYER_METHODS[0];
}

export function prayerSlots(date: Date, config: PrayerConfig): PrayerSlot[] {
  const parameters = findPrayerMethod(config.method).parameters();
  parameters.madhab = config.madhab === "safi" ? Madhab.Shafi : Madhab.Hanafi;

  const times = new PrayerTimes(
    new Coordinates(config.latitude, config.longitude),
    date,
    parameters,
  );

  return (["fajr", "dhuhr", "asr", "maghrib", "isha"] as PrayerKey[]).map((key) => ({
    key,
    label: PRAYER_LABELS[key],
    time: times[key],
  }));
}

export interface NextPrayer {
  slot: PrayerSlot;
  tomorrow: boolean;
}

export function nextPrayer(
  slots: PrayerSlot[],
  now: Date,
  tomorrowSlots: PrayerSlot[] = [],
): NextPrayer | null {
  const current = slots.find((slot) => slot.time.getTime() > now.getTime());
  if (current) return { slot: current, tomorrow: false };

  const fajr = tomorrowSlots.find((slot) => slot.key === "fajr");
  return fajr ? { slot: fajr, tomorrow: true } : null;
}

export function addLocalDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function formatClock(date: Date): string {
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${hour}:${minute}`;
}

export function formatCountdown(milliseconds: number): string {
  const minutes = Math.max(0, Math.ceil(milliseconds / 60_000));
  if (minutes < 60) return `${minutes} dk`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours} sa ${rest} dk` : `${hours} sa`;
}
