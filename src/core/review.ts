import { eachDay, formatRange, startOfWeek } from "./date";
import { periodStart, periodTitle, periodValue } from "./period";
import { perfectDayStatus } from "./perfect-day";
import {
  currentStreak,
  doneScheduledDays,
  expectedScheduledDays,
  formatAmount,
  weeklyGoalProgress,
} from "./stats";
import { habitCadence, type Habit } from "./types";

export interface WeeklyReviewOptions {
  today: string;
  weekStart: 0 | 1;
  hijri?: string;
  note?: string;
}

interface HabitWeek {
  habit: Habit;
  done: number;
  expected: number;
  rate: number;
}

export function buildWeeklyReview(
  habits: Habit[],
  options: WeeklyReviewOptions,
): string {
  const { today, weekStart, hijri, note } = options;
  const from = startOfWeek(today, weekStart);
  const active = habits.filter((habit) => !habit.archived);
  const daily = active.filter((habit) => habitCadence(habit) === "daily");
  const periodic = active.filter((habit) => habitCadence(habit) !== "daily");

  const habitWeeks: HabitWeek[] = daily.map((habit) => {
    const expected = expectedScheduledDays(habit, from, today);
    const done = doneScheduledDays(habit, from, today);
    return {
      habit,
      done,
      expected,
      rate: expected > 0 ? Math.round((done / expected) * 100) : 0,
    };
  });

  const statuses = eachDay(from, today).map((date) => perfectDayStatus(active, date));
  const perfectDays = statuses.filter((status) => status.perfect).length;
  const due = statuses.reduce((sum, status) => sum + status.due, 0);
  const done = statuses.reduce((sum, status) => sum + status.done, 0);
  const skipped = statuses.reduce((sum, status) => sum + status.skipped, 0);
  const paused = statuses.reduce((sum, status) => sum + status.paused, 0);
  const overall = due > 0 ? Math.round((done / due) * 100) : null;

  const ranked = habitWeeks
    .filter((row) => row.expected > 0)
    .sort((a, b) => b.rate - a.rate || b.done - a.done);
  const strongest = ranked[0];
  const weakest = ranked[ranked.length - 1];

  const lines = [
    `# Kalp Ritmi haftalık değerlendirmesi — ${formatRange(from, today)}`,
    "",
  ];
  if (hijri) lines.push(`_${hijri}_`, "");

  lines.push(
    "## Haftanın özeti",
    "",
    `- Genel tamamlama: ${overall === null ? "—" : `%${overall}`} (${done}/${due} beklenen gün)`,
    `- Perfect day: ${perfectDays} gün`,
    `- Atlanan gün: ${skipped} · Molada: ${paused}`,
    `- Etkin günlük alışkanlık: ${daily.length}`,
    "",
    "## Günlük alışkanlıklar",
    "",
  );

  if (daily.length === 0) {
    lines.push("_Etkin günlük alışkanlık yok._");
  } else {
    lines.push(
      "| Alışkanlık | Tamamlanan | Beklenen | Oran | Seri | Haftalık hedef |",
      "| --- | ---: | ---: | ---: | ---: | --- |",
    );
    for (const row of habitWeeks) {
      lines.push(
        `| ${cell(`${row.habit.emoji} ${row.habit.name}`)} | ${row.done} | ${row.expected} | ` +
          `${row.expected > 0 ? `%${row.rate}` : "—"} | ${currentStreak(row.habit, today)} gün | ` +
          `${goalText(row.habit, from, today)} |`,
      );
    }
  }

  if (periodic.length > 0) {
    lines.push("", "## Dönemlik alışkanlıklar", "");
    lines.push("| Alışkanlık | Dönem | Değer |", "| --- | --- | --- |");
    for (const habit of periodic) {
      const cadence = habitCadence(habit);
      if (cadence === "daily") continue;
      const start = periodStart(today, cadence, weekStart);
      lines.push(
        `| ${cell(`${habit.emoji} ${habit.name}`)} | ${
          cadence === "weekly" ? periodTitle(start, "weekly") : periodTitle(start, "monthly")
        } | ${periodValueText(habit, periodValue(habit, start))} |`,
      );
    }
  }

  lines.push("", "## Öne çıkanlar", "");
  if (strongest && weakest) {
    lines.push(
      `- En istikrarlı: ${strongest.habit.emoji} ${strongest.habit.name} (%${strongest.rate})`,
      `- Destek gerekebilir: ${weakest.habit.emoji} ${weakest.habit.name} (%${weakest.rate})`,
    );
  } else {
    lines.push("- Bu hafta değerlendirilecek tamamlanmış gün yok.");
  }

  if (note?.trim()) {
    lines.push("", "## Haftanın notu", "", note.trim());
  }

  lines.push(
    "",
    "## Değerlendirme soruları",
    "",
    "- Bu hafta neyi kolaylaştırdı?",
    "- Neyi zorlaştırdı; hangi engel tekrar etti?",
    "- Gelecek hafta minimum hedefim ne olsun?",
    "- Bir alışkanlığı hangi mevcut rutine bağlayabilirim?",
    "",
    "---",
    "_Kalp Ritmi tarafından oluşturuldu._",
    "",
  );

  return lines.join("\n");
}

function cell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function goalText(habit: Habit, from: string, today: string): string {
  const goal = weeklyGoalProgress(habit, from, today);
  if (!goal) return "—";
  if (habit.kind === "numeric") {
    return `${formatAmount(goal.current)}/${formatAmount(goal.target)} ${habit.unit ?? ""}`.trim();
  }
  return `${goal.current}/${goal.target} gün`;
}

function periodValueText(habit: Habit, value: number): string {
  if (habit.kind === "numeric") {
    const target = habit.target ? ` / ${formatAmount(habit.target)}` : "";
    return `${formatAmount(value)}${target} ${habit.unit ?? ""}`.trim();
  }
  return value > 0 ? "✓" : "—";
}
