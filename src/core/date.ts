const WEEKDAYS_TR = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
const WEEKDAYS_LONG_TR = [
  "Pazar",
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
];
const MONTHS_TR = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

function parseLocalDate(date: string): Date {
  return new Date(date + "T00:00:00");
}

/** Local calendar date as YYYY-MM-DD. Never uses UTC, so evening check-ins stay on
 *  the day the user sees in their own timezone. */
export function ymd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Local date used by the tracker. With a cutoff of 4, 02:30 still belongs to
 *  the previous calendar day. */
export function cutoffDate(now: Date, cutoffHour = 0): string {
  const date = new Date(now);
  if (cutoffHour > 0 && date.getHours() < cutoffHour) {
    date.setDate(date.getDate() - 1);
  }
  return ymd(date);
}

export function todayLocal(cutoffHour = 0): string {
  return cutoffDate(new Date(), cutoffHour);
}

export function addDays(date: string, delta: number): string {
  const next = parseLocalDate(date);
  next.setDate(next.getDate() + delta);
  return ymd(next);
}

/** Shift by calendar months, clamping the day to the target month's length. */
export function addMonths(date: string, delta: number): string {
  const source = parseLocalDate(date);
  const day = source.getDate();
  const next = new Date(source.getFullYear(), source.getMonth() + delta, 1);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, lastDay));
  return ymd(next);
}

/** The last `count` days ending at `end`, oldest first. */
export function lastNDays(count: number, end: string): string[] {
  const days: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    days.push(addDays(end, -i));
  }
  return days;
}

export function weekdayShort(date: string): string {
  return WEEKDAYS_TR[parseLocalDate(date).getDay()];
}

export function dayNum(date: string): string {
  return date.slice(8, 10);
}

export function formatLongDate(date: string): string {
  const d = parseLocalDate(date);
  return `${WEEKDAYS_LONG_TR[d.getDay()]}, ${d.getDate()} ${MONTHS_TR[d.getMonth()]} ${d.getFullYear()}`;
}

/** Local timestamp for note cards, e.g. "26 Ekim 2026, 15:40". */
export function formatTimestamp(timestamp: number): string {
  const d = new Date(timestamp);
  const hour = String(d.getHours()).padStart(2, "0");
  const minute = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} ${MONTHS_TR[d.getMonth()]} ${d.getFullYear()}, ${hour}:${minute}`;
}

/** "2026-10" -> "Ekim 2026". */
export function formatMonth(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return `${MONTHS_TR[monthNumber - 1]} ${year}`;
}

/** Short Turkish month name for a date or YYYY-MM value. */
export function monthShort(date: string): string {
  const monthNumber = Number(date.slice(5, 7));
  return [
    "Oca",
    "Şub",
    "Mar",
    "Nis",
    "May",
    "Haz",
    "Tem",
    "Ağu",
    "Eyl",
    "Eki",
    "Kas",
    "Ara",
  ][monthNumber - 1];
}

/** Start of the week. 1 = Monday (default), 0 = Sunday. */
export function startOfWeek(date: string, weekStart: 1 | 0 = 1): string {
  const d = parseLocalDate(date);
  const offset = weekStart === 0 ? d.getDay() : (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return ymd(d);
}

export function startOfMonth(date: string): string {
  return date.slice(0, 7) + "-01";
}

/** Every local date from `from` to `to`, inclusive. Empty when from > to. */
export function eachDay(from: string, to: string): string[] {
  const days: string[] = [];
  let cursor = from;
  while (cursor <= to) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

export function dayCount(from: string, to: string): number {
  if (from > to) return 0;
  return eachDay(from, to).length;
}

/** Whole-day distance between two local dates, independent of DST. */
export function dayDiff(from: string, to: string): number {
  const a = parseLocalDate(from);
  const b = parseLocalDate(to);
  const start = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const end = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((end - start) / 86_400_000);
}

export function formatRange(start: string, end: string): string {
  const a = parseLocalDate(start);
  const b = parseLocalDate(end);
  const month = (d: Date): string => MONTHS_TR[d.getMonth()];
  const sameMonth = a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
  const sameYear = a.getFullYear() === b.getFullYear();

  if (sameMonth) return `${a.getDate()}–${b.getDate()} ${month(b)} ${b.getFullYear()}`;
  if (sameYear) {
    return `${a.getDate()} ${month(a)} – ${b.getDate()} ${month(b)} ${b.getFullYear()}`;
  }
  return (
    `${a.getDate()} ${month(a)} ${a.getFullYear()} – ` +
    `${b.getDate()} ${month(b)} ${b.getFullYear()}`
  );
}
