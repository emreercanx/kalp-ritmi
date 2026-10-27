import { App, Modal } from "obsidian";
import { formatAmount } from "../core/stats";
import {
  completedPeriodCount,
  lastNPeriods,
  periodCurrentStreak,
  periodBestStreak,
  periodDone,
  periodHeadLabel,
  periodStart,
  periodTitle,
  periodValue,
  type PeriodCadence,
} from "../core/period";
import { habitCadence, type Habit } from "../core/types";

interface PeriodDetailOptions {
  habit: Habit;
  today: string;
  weekStart: 0 | 1;
  onCalendar?: () => void;
}

export class PeriodDetailModal extends Modal {
  constructor(
    app: App,
    private readonly options: PeriodDetailOptions,
  ) {
    super(app);
  }

  onOpen(): void {
    this.modalEl.addClass("ritim-detail-modal");
    this.modalEl.addClass("ritim-period-detail");
    this.render();
  }

  onClose(): void {
    this.contentEl.empty();
    this.modalEl.removeClass("ritim-detail-modal");
    this.modalEl.removeClass("ritim-period-detail");
  }

  private render(): void {
    const { contentEl } = this;
    const { habit, today, weekStart } = this.options;
    const cadence = habitCadence(habit);
    if (cadence === "daily") {
      this.close();
      return;
    }

    contentEl.empty();
    contentEl.setCssProps({ "--ritim-habit-color": habit.color });

    const head = contentEl.createDiv({ cls: "ritim-detail-head" });
    head.createSpan({ text: habit.emoji, cls: "ritim-detail-emoji" });
    const titles = head.createDiv({ cls: "ritim-detail-titles" });
    titles.createEl("h2", { text: habit.name, cls: "ritim-detail-title" });
    titles.createDiv({
      text: cadence === "weekly" ? "Haftalık alışkanlık" : "Aylık alışkanlık",
      cls: "ritim-muted",
    });

    const current = periodStart(today, cadence, weekStart);
    const value = periodValue(habit, current);
    const tiles = contentEl.createDiv({ cls: "ritim-detail-grid" });
    this.tile(
      tiles,
      cadence === "weekly" ? "Bu hafta" : "Bu ay",
      this.valueText(habit, value),
      periodTitle(current, cadence),
    );
    this.tile(
      tiles,
      "Tamamlanan",
      `${completedPeriodCount(habit)} ${cadence === "weekly" ? "hafta" : "ay"}`,
    );
    this.tile(
      tiles,
      "Güncel seri",
      `${periodCurrentStreak(habit, cadence, today, weekStart)} ${
        cadence === "weekly" ? "hafta" : "ay"
      }`,
    );
    this.tile(
      tiles,
      "En uzun seri",
      `${periodBestStreak(habit, cadence, today, weekStart)} ${
        cadence === "weekly" ? "hafta" : "ay"
      }`,
    );

    const recent = contentEl.createDiv({ cls: "ritim-period-history" });
    const recentHead = recent.createDiv({ cls: "ritim-detail-recent-head" });
    recentHead.createSpan({
      text: cadence === "weekly" ? "Son 12 hafta" : "Son 12 ay",
    });
    recentHead.createSpan({ text: "Dolu kutu tamamlandı", cls: "ritim-muted" });

    const grid = recent.createDiv({ cls: "ritim-period-history-grid" });
    for (const start of lastNPeriods(12, today, cadence, weekStart)) {
      const label = periodHeadLabel(start, cadence);
      const done = periodDone(habit, start);
      const periodValueNumber = periodValue(habit, start);
      const cell = grid.createDiv({
        cls:
          "ritim-period-history-cell" +
          (done ? " is-done" : "") +
          (start === current ? " is-current" : ""),
      });
      cell.createSpan({ text: label.top, cls: "ritim-period-history-top" });
      cell.createSpan({ text: label.bottom, cls: "ritim-period-history-bottom" });
      const valueText = this.valueText(habit, periodValueNumber);
      cell.setAttr(
        "title",
        `${periodTitle(start, cadence)} · ${valueText}`,
      );
      cell.setAttr("aria-label", `${periodTitle(start, cadence)}, ${valueText}`);
      cell.createSpan({
        text: done
          ? "✓"
          : periodValueNumber > 0
            ? formatAmount(periodValueNumber)
            : "",
        cls: "ritim-period-history-value",
      });
    }

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

  private tile(grid: HTMLElement, label: string, value: string, note?: string): void {
    const tile = grid.createDiv({ cls: "ritim-detail-tile" });
    tile.createDiv({ text: label, cls: "ritim-detail-label" });
    tile.createDiv({ text: value, cls: "ritim-detail-value" });
    if (note) tile.createDiv({ text: note, cls: "ritim-detail-note" });
  }

  private valueText(habit: Habit, value: number): string {
    if (habit.kind === "numeric") {
      return `${formatAmount(value)}${habit.target ? ` / ${formatAmount(habit.target)}` : ""} ${
        habit.unit ?? ""
      }`.trim();
    }
    return value > 0 ? "✓" : "—";
  }
}
