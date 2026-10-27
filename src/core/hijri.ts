const HIJRI_MONTHS_TR = [
  "Muharrem",
  "Safer",
  "Rebiülevvel",
  "Rebiülahir",
  "Cemaziyelevvel",
  "Cemaziyelahir",
  "Recep",
  "Şaban",
  "Ramazan",
  "Şevval",
  "Zilkade",
  "Zilhicce",
];

export interface HijriDate {
  day: number;
  month: number;
  year: number;
}

let formatter: Intl.DateTimeFormat | null | undefined;

function getFormatter(): Intl.DateTimeFormat | null {
  if (formatter !== undefined) return formatter;

  try {
    formatter = new Intl.DateTimeFormat("en-US-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    });
  } catch {
    formatter = null;
  }

  return formatter;
}

function parseLocalDate(date: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

/** Gregorian YYYY-MM-DD to the Umm al-Qura Hijri date, with an optional day shift. */
export function hijriParts(date: string, offsetDays = 0): HijriDate | null {
  const parsed = parseLocalDate(date);
  const format = getFormatter();
  if (!parsed || !format) return null;

  parsed.setDate(parsed.getDate() + offsetDays);

  try {
    const parts = format.formatToParts(parsed);
    const day = Number(parts.find((part) => part.type === "day")?.value);
    const month = Number(parts.find((part) => part.type === "month")?.value);
    const year = Number(parts.find((part) => part.type === "year")?.value);

    if (
      !Number.isInteger(day) ||
      !Number.isInteger(month) ||
      !Number.isInteger(year) ||
      day < 1 ||
      day > 30 ||
      month < 1 ||
      month > 12 ||
      year < 1000 ||
      year > 1600
    ) {
      return null;
    }

    return { day, month, year };
  } catch {
    return null;
  }
}

export function formatHijri(date: string, offsetDays = 0): string {
  const hijri = hijriParts(date, offsetDays);
  if (!hijri) return "";
  return `${hijri.day} ${HIJRI_MONTHS_TR[hijri.month - 1]} ${hijri.year}`;
}
