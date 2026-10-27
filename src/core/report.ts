import { formatLongDate, formatRange, startOfMonth, startOfWeek } from "./date";
import {
  completedPeriodCount,
  periodStart,
  periodTitle,
  periodValue,
} from "./period";
import {
  completionRate,
  currentStreak,
  doneScheduledDays,
  effectiveStart,
  expectedScheduledDays,
  formatAmount,
  isDone,
  sumRange,
  weeklyGoalProgress,
} from "./stats";
import { habitCadence, type Habit } from "./types";

export interface ReportOptions {
  today: string;
  weekStart: 0 | 1;
  hijri?: string;
  note?: string;
}

export function buildMarkdownReport(habits: Habit[], options: ReportOptions): string {
  const { today, weekStart, hijri, note } = options;
  const active = habits.filter((habit) => !habit.archived);
  const archived = habits.filter((habit) => habit.archived);
  const daily = active.filter((habit) => habitCadence(habit) === "daily");
  const periodic = active.filter((habit) => habitCadence(habit) !== "daily");
  const weekFrom = startOfWeek(today, weekStart);
  const monthFrom = startOfMonth(today);

  const rates = daily
    .map((habit) => completionRate(habit, 30, today))
    .filter((rate): rate is number => rate !== null);
  const overall =
    rates.length > 0
      ? Math.round(rates.reduce((sum, rate) => sum + rate, 0) / rates.length)
      : null;

  const lines = [
    `# Kalp Ritmi raporu — ${formatLongDate(today)}`,
    "",
  ];
  if (hijri) lines.push(`_${hijri}_`, "");

  lines.push(
    "## Genel",
    `- Genel skor: ${overall === null ? "—" : `%${overall}`}`,
    `- Etkin alışkanlık: ${active.length}`,
    `- Arşivde: ${archived.length}`,
    `- Hafta: ${formatRange(weekFrom, today)} · Ay: ${formatRange(monthFrom, today)}`,
    "",
    "## Günlük alışkanlıklar",
    "",
  );

  if (daily.length === 0) {
    lines.push("_Etkin günlük alışkanlık yok._");
  } else {
    lines.push(
      "| Alışkanlık | Bugün | Bu hafta | Bu ay | Seri | 30 gün | Haftalık hedef |",
      "| --- | ---: | ---: | ---: | ---: | ---: | --- |",
    );
    for (const habit of daily) {
      lines.push(
        `| ${cell(`${habit.emoji} ${habit.name}`)} | ${todayValue(habit, today)} | ` +
          `${rangeValue(habit, weekFrom, today)} | ${rangeValue(habit, monthFrom, today)} | ` +
          `${currentStreak(habit, today)} gün | ${scoreText(habit, today)} | ` +
          `${goalText(habit, weekFrom, today)} |`,
      );
    }
  }

  if (periodic.length > 0) {
    lines.push(
      "",
      "## Haftalık ve aylık alışkanlıklar",
      "",
      "| Alışkanlık | Sıklık | Bu dönem | Tamamlanan |",
      "| --- | --- | ---: | ---: |",
    );
    for (const habit of periodic) {
      const cadence = habitCadence(habit);
      if (cadence === "daily") continue;
      const start = periodStart(today, cadence, weekStart);
      const value = periodValue(habit, start);
      const count = completedPeriodCount(habit);
      lines.push(
        `| ${cell(`${habit.emoji} ${habit.name}`)} | ${
          cadence === "weekly" ? "Haftalık" : "Aylık"
        } | ${periodValueText(habit, value)} | ${count} ${
          cadence === "weekly" ? "hafta" : "ay"
        } |`,
      );
    }
    lines.push(
      "",
      `_${periodTitle(
        periodStart(today, "weekly", weekStart),
        "weekly",
      )} · ${periodTitle(periodStart(today, "monthly", weekStart), "monthly")}_`,
    );
  }

  if (note?.trim()) {
    lines.push("", "## Günün notu", "", note.trim());
  }

  if (archived.length > 0) {
    lines.push("", "## Arşiv", "");
    for (const habit of archived) {
      lines.push(`- ${habit.emoji} ${habit.name}`);
    }
  }

  lines.push("", "---", "_Kalp Ritmi tarafından oluşturuldu._", "");
  return lines.join("\n");
}

function cell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function todayValue(habit: Habit, today: string): string {
  if (habit.kind === "numeric") {
    return `${formatAmount(habit.log[today] ?? 0)} ${habit.unit ?? ""}`.trim();
  }
  return isDone(habit, today) ? "✓" : "—";
}

function rangeValue(habit: Habit, from: string, today: string): string {
  const start = effectiveStart(habit, from);
  if (habit.kind === "numeric") return formatAmount(sumRange(habit, start, today));

  const total = expectedScheduledDays(habit, start, today);
  return total > 0 ? `${doneScheduledDays(habit, start, today)}/${total}` : "—";
}

function scoreText(habit: Habit, today: string): string {
  const rate = completionRate(habit, 30, today);
  return rate === null ? "—" : `%${rate}`;
}

function periodValueText(habit: Habit, value: number): string {
  if (habit.kind === "numeric") {
    const target = habit.target ? ` / ${formatAmount(habit.target)}` : "";
    return `${formatAmount(value)}${target} ${habit.unit ?? ""}`.trim();
  }
  return value > 0 ? "✓" : "—";
}

function goalText(habit: Habit, from: string, today: string): string {
  const goal = weeklyGoalProgress(habit, from, today);
  if (!goal) return "—";
  if (habit.kind === "numeric") {
    return `${formatAmount(goal.current)}/${formatAmount(goal.target)} ${habit.unit ?? ""}`.trim();
  }
  return `${goal.current}/${goal.target} gün`;
}
