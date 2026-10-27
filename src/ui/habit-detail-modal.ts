import { App, Modal } from "obsidian";
import {
  addDays,
  dayNum,
  formatLongDate,
  formatRange,
  lastNDays,
  monthShort,
  startOfMonth,
  startOfWeek,
  weekdayShort,
} from "../core/date";
import {
  dayBreakdown,
  monthTrend,
  weekdayTrend,
  type DayBreakdown,
  type TrendPoint,
} from "../core/insights";
import {
  bestStreak,
  completionRate,
  currentStreak,
  doneDays,
  doneScheduledDays,
  earliestLogDate,
  effectiveStart,
  expectedScheduledDays,
  formatAmount,
  heatLevel,
  isDone,
  isDoneValue,
  sumRange,
  weeklyGoalProgress,
} from "../core/stats";
import {
  isDailySchedule,
  isPaused,
  isScheduled,
  isSkipped,
  scheduleLabel,
} from "../core/schedule";
import type { Habit, HabitDayPart } from "../core/types";

interface HabitDetailOptions {
  habit: Habit;
  today: string;
  weekStart: 0 | 1;
  onCalendar?: () => void;
}

interface RangeStats {
  days: number;
  done: number;
  rate: number;
  amount: number;
}

export class HabitDetailModal extends Modal {
  constructor(
    app: App,
    private readonly options: HabitDetailOptions,
  ) {
    super(app);
  }

  onOpen(): void {
    this.modalEl.addClass("ritim-detail-modal");
    this.render();
  }

  onClose(): void {
    this.contentEl.empty();
    this.modalEl.removeClass("ritim-detail-modal");
  }

  private render(): void {
    const { contentEl } = this;
    const { habit, today } = this.options;
    contentEl.empty();
    contentEl.setCssProps({ "--ritim-habit-color": habit.color });

    const head = contentEl.createDiv({ cls: "ritim-detail-head" });
    head.createSpan({ text: habit.emoji, cls: "ritim-detail-emoji" });
    const titles = head.createDiv({ cls: "ritim-detail-titles" });
    titles.createEl("h2", { text: habit.name, cls: "ritim-detail-title" });
    titles.createDiv({ text: this.metaText(habit), cls: "ritim-muted" });

    const tiles = contentEl.createDiv({ cls: "ritim-detail-grid" });
    this.tile(tiles, "Bugün", this.todayValue(habit, today), this.todayNote(habit));
    this.tile(tiles, "Güncel seri", `${currentStreak(habit, today)} gün`);
    this.tile(tiles, "En uzun seri", `${bestStreak(habit)} gün`);

    const rate = completionRate(habit, 30, today);
    this.tile(
      tiles,
      "30 gün skoru",
      rate === null ? "—" : `%${rate}`,
      "Tamamlama oranı",
    );

    const last30From = addDays(today, -29);
    const last30 = this.rangeStats(habit, last30From, today);
    this.tile(
      tiles,
      "30 gün toplam",
      habit.kind === "numeric" ? this.amountText(habit, last30.amount) : `${last30.done} gün`,
      habit.kind === "numeric" ? "Toplam değer" : "Tamamlanan gün",
    );

    const allFrom = this.allTimeStart(habit, today);
    const totalDone = doneDays(habit, allFrom, today);
    const totalAmount = sumRange(habit, allFrom, today);
    const loggedDays = this.loggedDayCount(habit, allFrom, today);
    this.tile(
      tiles,
      "Toplam",
      habit.kind === "numeric" ? this.amountText(habit, totalAmount) : `${totalDone} gün`,
      `${loggedDays} kayıtlı gün`,
    );

    this.breakdownSection(contentEl, dayBreakdown(habit, last30From, today));

    const ranges = contentEl.createDiv({ cls: "ritim-detail-ranges" });
    const weekFrom = startOfWeek(today, this.options.weekStart);
    const monthFrom = startOfMonth(today);
    this.rangeBlock(
      ranges,
      "Bu hafta",
      habit,
      weekFrom,
      today,
      weeklyGoalProgress(habit, weekFrom, today),
    );
    this.rangeBlock(ranges, "Bu ay", habit, monthFrom, today);
    this.rangeBlock(ranges, "Tüm zamanlar", habit, this.allTimeStart(habit, today), today);

    const insights = contentEl.createDiv({ cls: "ritim-detail-insights" });
    this.monthSection(insights, habit);
    this.weekdaySection(insights, habit);

    const recent = contentEl.createDiv({ cls: "ritim-detail-recent" });
    const recentHead = recent.createDiv({ cls: "ritim-detail-recent-head" });
    recentHead.createSpan({ text: "Son 30 gün" });
    recentHead.createSpan({
      text: "Dolu hedef, çerçeve kısmi",
      cls: "ritim-muted",
    });

    const days = recent.createDiv({ cls: "ritim-detail-days" });
    for (const date of lastNDays(30, today)) {
      const value = habit.log[date] ?? 0;
      const done = isDoneValue(habit, value);
      const partial = value > 0 && !done;
      const skipped = isSkipped(habit, date);
      const paused = isPaused(habit, date);
      const cell = days.createDiv({
        cls:
          "ritim-detail-day" +
          (done ? " is-done" : "") +
          (partial ? " is-partial" : "") +
          (date === today ? " is-today" : "") +
          (!isScheduled(habit, date) ? " is-off" : "") +
          (skipped ? " is-skipped" : "") +
          (paused ? " is-paused" : ""),
      });
      if (habit.kind === "check" && done) cell.setText("✓");
      if (skipped) cell.setText("–");
      const valueText = skipped
        ? "atlandı"
        : paused
          ? "molada"
          : habit.kind === "numeric"
            ? `${formatAmount(value)} ${habit.unit ?? ""}`.trim()
            : done
              ? "yapıldı"
              : "yapılmadı";
      cell.setAttr("title", `${formatLongDate(date)} · ${valueText}`);
      cell.setAttr("aria-label", `${formatLongDate(date)}, ${valueText}`);
    }

    const history = contentEl.createDiv({ cls: "ritim-detail-history" });
    const historyHead = history.createDiv({ cls: "ritim-detail-recent-head" });
    const gridStart = addDays(startOfWeek(today, this.options.weekStart), -77);
    historyHead.createSpan({ text: "Son 12 hafta" });
    historyHead.createSpan({
      text: formatRange(gridStart, today),
      cls: "ritim-muted",
    });

    const heatmap = history.createDiv({ cls: "ritim-heatmap" });
    const labels = heatmap.createDiv({ cls: "ritim-heatmap-days" });
    for (let i = 0; i < 7; i++) {
      labels.createSpan({
        text: weekdayShort(addDays(gridStart, i)),
        cls: "ritim-heatmap-label",
      });
    }

    const grid = heatmap.createDiv({ cls: "ritim-heatmap-grid" });
    for (let i = 0; i < 84; i++) {
      const date = addDays(gridStart, i);
      const future = date > today;
      const off = !isScheduled(habit, date);
      const skipped = isSkipped(habit, date);
      const paused = isPaused(habit, date);
      const value = habit.log[date] ?? 0;
      const level = heatLevel(habit, value);
      const classes = ["ritim-heatmap-cell", `is-level-${level}`];
      if (off) classes.push("is-off");
      if (skipped) classes.push("is-skipped");
      if (paused) classes.push("is-paused");
      if (future) classes.push("is-future");
      if (date === today) classes.push("is-today");

      const cell = grid.createDiv({ cls: classes.join(" ") });
      if (future) continue;

      const valueText = skipped
        ? "atlandı"
        : paused
          ? "molada"
          : habit.kind === "numeric"
            ? `${formatAmount(value)} ${habit.unit ?? ""}`.trim()
            : value > 0
              ? "yapıldı"
              : "yapılmadı";
      const offText = off ? " · kapalı gün" : "";
      cell.setAttr("title", `${formatLongDate(date)} · ${valueText}${offText}`);
      cell.setAttr("aria-label", `${formatLongDate(date)}, ${valueText}${offText}`);
    }

    const legend = history.createDiv({ cls: "ritim-heatmap-legend" });
    legend.createSpan({ text: "Az", cls: "ritim-muted" });
    for (const level of [1, 2, 3]) {
      legend.createSpan({ cls: `ritim-heatmap-key is-level-${level}` });
    }
    legend.createSpan({ text: "Çok", cls: "ritim-muted" });
    const offKey = legend.createSpan({ cls: "ritim-heatmap-key is-off" });
    offKey.setAttr("title", "Kapalı gün");
    legend.createSpan({ text: "Kapalı gün", cls: "ritim-muted" });

    this.recordsSection(contentEl, habit);
    this.planSection(contentEl, habit);

    const footer = contentEl.createDiv({ cls: "ritim-modal-footer" });
    if (this.options.onCalendar) {
      const calendar = footer.createEl("button", { text: "Takvim" });
      calendar.type = "button";
      calendar.onclick = () => {
        this.close();
        this.options.onCalendar?.();
      };
    }

    const close = footer.createEl("button", { text: "Kapat", cls: "mod-cta" });
    close.type = "button";
    close.onclick = () => this.close();
  }

  private section(root: HTMLElement, title: string, note?: string): HTMLElement {
    const section = root.createDiv({ cls: "ritim-detail-section" });
    const head = section.createDiv({ cls: "ritim-detail-section-head" });
    head.createSpan({ text: title });
    if (note) head.createSpan({ text: note, cls: "ritim-muted" });
    return section;
  }

  private breakdownSection(root: HTMLElement, data: DayBreakdown): void {
    const section = this.section(
      root,
      "Son 30 gün dağılımı",
      "Beklenen günlere göre",
    );
    const chips = section.createDiv({ cls: "ritim-detail-chips" });
    this.breakdownChip(chips, "Tam", data.done, "is-done");
    this.breakdownChip(chips, "Kısmi", data.partial, "is-partial");
    this.breakdownChip(chips, "Boş", data.missed, "is-missed");
    this.breakdownChip(chips, "Atlandı", data.skipped, "is-skipped");
    this.breakdownChip(chips, "Molada", data.paused, "is-paused");
    if (data.off > 0) {
      this.breakdownChip(chips, "Kapalı", data.off, "is-off");
    }
  }

  private breakdownChip(
    root: HTMLElement,
    label: string,
    value: number,
    tone: string,
  ): void {
    const chip = root.createSpan({ cls: `ritim-detail-chip ${tone}` });
    chip.createSpan({ cls: "ritim-detail-chip-dot" });
    chip.createSpan({ text: label });
    chip.createSpan({ cls: "ritim-detail-chip-value", text: String(value) });
  }

  private monthSection(root: HTMLElement, habit: Habit): void {
    const section = this.section(root, "Aylık eğilim", "Son 6 ay");
    const rows = section.createDiv({ cls: "ritim-detail-trend" });
    for (const point of monthTrend(habit, 6, this.options.today)) {
      this.trendRow(rows, point, this.trendTitle(habit, point));
    }
  }

  private weekdaySection(root: HTMLElement, habit: Habit): void {
    const section = this.section(root, "Haftanın günleri", "Son 12 hafta");
    const rows = section.createDiv({ cls: "ritim-detail-trend" });
    for (const point of weekdayTrend(
      habit,
      12,
      this.options.today,
      this.options.weekStart,
    )) {
      this.trendRow(rows, point, this.trendTitle(habit, point));
    }
  }

  private trendTitle(habit: Habit, point: TrendPoint): string {
    if (point.days === 0) return `${point.label} · veri yok`;
    const amount =
      habit.kind === "numeric" && point.amount > 0
        ? ` · ${this.amountText(habit, point.amount)}`
        : "";
    return `${point.label} · ${point.done}/${point.days} gün${amount}`;
  }

  private trendRow(root: HTMLElement, point: TrendPoint, title: string): void {
    const row = root.createDiv({ cls: "ritim-detail-trend-row" });
    row.setAttr("title", title);
    row.setAttr("aria-label", title);
    const head = row.createDiv({ cls: "ritim-detail-range-head" });
    head.createSpan({ text: point.label });
    head.createSpan({
      text: point.rate === null ? "—" : `%${point.rate}`,
      cls: "ritim-detail-range-value",
    });
    const track = row.createDiv({ cls: "ritim-detail-range-track" });
    const fill = track.createDiv({ cls: "ritim-detail-range-fill" });
    fill.setCssProps({ width: `${point.rate ?? 0}%` });
  }

  private recordsSection(root: HTMLElement, habit: Habit): void {
    const entries = Object.entries(habit.log)
      .filter(([, value]) => value > 0)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 5);
    const section = this.section(
      root,
      "Son kayıtlar",
      entries.length > 0 ? `Son ${entries.length}` : undefined,
    );
    if (entries.length === 0) {
      section.createDiv({ cls: "ritim-empty", text: "Henüz kayıt yok." });
      return;
    }

    const list = section.createDiv({ cls: "ritim-detail-records" });
    for (const [date, value] of entries) {
      const done = isDoneValue(habit, value);
      const valueText =
        habit.kind === "numeric"
          ? `${this.amountText(habit, value)}${done ? "" : " · kısmi"}`
          : "Yapıldı";
      const row = list.createDiv({
        cls: `ritim-detail-record${done ? "" : " is-partial"}`,
      });
      row.createSpan({ text: this.shortDate(date), cls: "ritim-detail-record-date" });
      row.createSpan({ text: valueText, cls: "ritim-detail-record-value" });
      row.setAttr("title", `${formatLongDate(date)} · ${valueText}`);
      row.setAttr("aria-label", `${formatLongDate(date)}, ${valueText}`);
    }
  }

  private planSection(root: HTMLElement, habit: Habit): void {
    const section = this.section(root, "Plan", "Alışkanlık kuralları");
    const chips = section.createDiv({ cls: "ritim-detail-chips" });
    const add = (text: string): void => {
      chips.createSpan({ cls: "ritim-detail-chip", text });
    };

    add(scheduleLabel(habit));
    if (habit.kind === "numeric" && (habit.target ?? 0) > 0) {
      add(`Hedef ${this.amountText(habit, habit.target ?? 0)}`);
    }
    if (habit.kind === "numeric" && (habit.minimum ?? 0) > 0) {
      add(`Minimum ${this.amountText(habit, habit.minimum ?? 0)}`);
    }
    if (habit.kind === "numeric" && (habit.quickValue ?? 0) > 0) {
      add(`Hızlı değer ${this.amountText(habit, habit.quickValue ?? 0)}`);
    }
    if ((habit.weeklyGoal ?? 0) > 0) {
      add(
        habit.kind === "numeric"
          ? `Haftalık hedef ${this.amountText(habit, habit.weeklyGoal ?? 0)}`
          : `Haftalık hedef ${habit.weeklyGoal} gün`,
      );
    }
    if (habit.pausedFrom && habit.pausedUntil) {
      const pause =
        habit.pausedFrom === habit.pausedUntil
          ? this.shortDate(habit.pausedFrom)
          : formatRange(habit.pausedFrom, habit.pausedUntil);
      add(`Mola ${pause}`);
    }
    if (habit.dayPart && habit.dayPart !== "anytime") {
      const labels: Record<HabitDayPart, string> = {
        anytime: "Gün içinde",
        morning: "Sabah",
        afternoon: "Öğleden sonra",
        evening: "Akşam",
      };
      add(labels[habit.dayPart]);
    }
    if (habit.createdAt) add(`Başlangıç ${this.shortDate(habit.createdAt)}`);
  }

  private amountText(habit: Habit, value: number): string {
    const unit = (habit.unit ?? "").trim();
    return `${formatAmount(value)}${unit ? ` ${unit}` : ""}`;
  }

  private shortDate(date: string): string {
    const year = date.slice(0, 4) === this.options.today.slice(0, 4) ? "" : ` ${date.slice(0, 4)}`;
    return `${dayNum(date)} ${monthShort(date)}${year}`;
  }

  private loggedDayCount(habit: Habit, from: string, to: string): number {
    return Object.entries(habit.log).filter(
      ([date, value]) => date >= from && date <= to && value > 0,
    ).length;
  }

  private tile(
    grid: HTMLElement,
    label: string,
    value: string,
    note?: string,
  ): void {
    const tile = grid.createDiv({ cls: "ritim-detail-tile" });
    tile.createDiv({ text: label, cls: "ritim-detail-label" });
    tile.createDiv({ text: value, cls: "ritim-detail-value" });
    if (note) tile.createDiv({ text: note, cls: "ritim-detail-note" });
  }

  private rangeBlock(
    root: HTMLElement,
    label: string,
    habit: Habit,
    from: string,
    today: string,
    goal: ReturnType<typeof weeklyGoalProgress> = null,
  ): void {
    const stats = this.rangeStats(habit, from, today);
    const block = root.createDiv({ cls: "ritim-detail-range" });
    const head = block.createDiv({ cls: "ritim-detail-range-head" });
    head.createSpan({ text: label });
    head.createSpan({
      text: stats.days === 0 ? "—" : `%${stats.rate} · ${stats.done}/${stats.days} gün`,
      cls: "ritim-detail-range-value",
    });
    const track = block.createDiv({ cls: "ritim-detail-range-track" });
    const fill = track.createDiv({ cls: "ritim-detail-range-fill" });
    fill.setCssProps({ width: `${stats.rate}%` });

    if (habit.kind === "numeric" && stats.days > 0) {
      block.createDiv({
        cls: "ritim-detail-range-note",
        text: `${formatAmount(stats.amount)} ${habit.unit ?? ""}`.trim(),
      });
    }

    if (goal) {
      block.createDiv({
        cls: "ritim-detail-range-note ritim-detail-goal",
        text:
          habit.kind === "numeric"
            ? `Haftalık hedef ${formatAmount(goal.current)}/${formatAmount(goal.target)} ${habit.unit ?? ""}`.trim()
            : `Haftalık hedef ${goal.current}/${goal.target} gün`,
      });
    }
  }

  private rangeStats(habit: Habit, from: string, today: string): RangeStats {
    const start = effectiveStart(habit, from);
    const days = expectedScheduledDays(habit, start, today);
    const done = doneScheduledDays(habit, start, today);
    const amount = sumRange(habit, start, today);
    const rate = days > 0 ? Math.round((done / days) * 100) : 0;
    return { days, done, rate, amount };
  }

  private allTimeStart(habit: Habit, today: string): string {
    const earliest = earliestLogDate(habit);
    const anchors = [habit.createdAt, earliest].filter((date): date is string => Boolean(date));
    if (anchors.length === 0) return today;
    return anchors.reduce((min, date) => (date < min ? date : min));
  }

  private metaText(habit: Habit): string {
    const schedule = isDailySchedule(habit) ? "" : ` · ${scheduleLabel(habit)}`;
    const minimum = habit.minimum ? ` · min ${formatAmount(habit.minimum)}` : "";
    if (habit.kind === "numeric") {
      return `Günlük hedef ${formatAmount(habit.target ?? 0)} ${habit.unit ?? ""}${minimum}`.trim() + schedule;
    }
    if (habit.kind === "quit") return `Bırakma alışkanlığı${schedule}`;
    return schedule ? scheduleLabel(habit) : "Her gün";
  }

  private todayValue(habit: Habit, today: string): string {
    if (isSkipped(habit, today)) return "–";
    if (isPaused(habit, today) && (habit.log[today] ?? 0) <= 0) return "⏸";
    if (habit.kind === "numeric") {
      return formatAmount(habit.log[today] ?? 0);
    }
    return isDone(habit, today) ? "✓" : "—";
  }

  private todayNote(habit: Habit): string {
    const today = this.options.today;
    if (isSkipped(habit, today)) return "Atlandı";
    if (isPaused(habit, today) && (habit.log[today] ?? 0) <= 0) return "Molada";
    if (habit.kind === "numeric") {
      const minimum = habit.minimum ? ` · min ${formatAmount(habit.minimum)}` : "";
      return ((habit.unit ?? "").trim() || "Bugünkü değer") + minimum;
    }
    return isDone(habit, today) ? "Yapıldı" : "Henüz yapılmadı";
  }
}
