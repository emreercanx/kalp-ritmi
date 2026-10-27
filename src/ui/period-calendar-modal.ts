import { App, Modal, setIcon } from "obsidian";
import { monthOf } from "../core/calendar";
import { addDays, addMonths, formatMonth, monthShort } from "../core/date";
import {
  completedPeriodCount,
  periodBestStreak,
  periodCurrentStreak,
  periodDone,
  periodStart,
  periodTitle,
  periodValue,
  type PeriodCadence,
} from "../core/period";
import { monthsInYear, weeksInMonth } from "../core/period-calendar";
import { formatAmount } from "../core/stats";
import { habitCadence, type Habit } from "../core/types";

interface PeriodCalendarOptions {
  habit: Habit;
  today: string;
  weekStart: 0 | 1;
  onPick: (start: string) => void;
}

export class PeriodCalendarModal extends Modal {
  private page: string;
  private year: number;

  constructor(
    app: App,
    private readonly options: PeriodCalendarOptions,
  ) {
    super(app);
    this.page = monthOf(options.today);
    this.year = Number(options.today.slice(0, 4));
  }

  onOpen(): void {
    this.modalEl.addClass("ritim-detail-modal");
    this.modalEl.addClass("ritim-period-calendar");
    this.modalEl.setCssProps({
      "--ritim-habit-color": this.options.habit.color,
    });
    this.render();
  }

  onClose(): void {
    this.contentEl.empty();
    this.modalEl.removeClass("ritim-detail-modal");
    this.modalEl.removeClass("ritim-period-calendar");
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
    const current = periodStart(today, cadence, weekStart);

    const head = contentEl.createDiv({ cls: "ritim-detail-head" });
    head.createSpan({ text: habit.emoji, cls: "ritim-detail-emoji" });
    const titles = head.createDiv({ cls: "ritim-detail-titles" });
    titles.createEl("h2", { text: habit.name, cls: "ritim-detail-title" });
    titles.createDiv({
      text:
        cadence === "weekly"
          ? "Haftalık alışkanlık takvimi"
          : "Aylık alışkanlık takvimi",
      cls: "ritim-muted",
    });
    titles.createDiv({ text: this.metaText(habit, cadence), cls: "ritim-muted" });

    const tiles = contentEl.createDiv({ cls: "ritim-detail-grid" });
    this.tile(
      tiles,
      cadence === "weekly" ? "Bu hafta" : "Bu ay",
      this.valueText(habit, periodValue(habit, current)),
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

    this.renderPage(contentEl, cadence, current);
    this.renderLegend(contentEl, cadence);

    const footer = contentEl.createDiv({ cls: "ritim-modal-footer" });
    const now = footer.createEl("button", {
      text: cadence === "weekly" ? "Bu hafta" : "Bu ay",
    });
    now.type = "button";
    now.onclick = () => {
      this.options.onPick(current);
      this.close();
    };

    const close = footer.createEl("button", { text: "Kapat", cls: "mod-cta" });
    close.type = "button";
    close.onclick = () => this.close();
  }

  private renderPage(
    root: HTMLElement,
    cadence: PeriodCadence,
    current: string,
  ): void {
    const head = root.createDiv({ cls: "ritim-calendar-head" });
    const prev = head.createEl("button", { cls: "ritim-calendar-nav" });
    prev.type = "button";
    prev.setAttr(
      "aria-label",
      cadence === "weekly" ? "Önceki ay" : "Önceki yıl",
    );
    setIcon(prev, "chevron-left");
    prev.onclick = () => this.shiftPage(-1);

    head.createDiv({
      cls: "ritim-calendar-title",
      text: cadence === "weekly" ? formatMonth(this.page) : String(this.year),
    });

    const next = head.createEl("button", { cls: "ritim-calendar-nav" });
    next.type = "button";
    next.setAttr(
      "aria-label",
      cadence === "weekly" ? "Sonraki ay" : "Sonraki yıl",
    );
    setIcon(next, "chevron-right");
    const atCurrent =
      cadence === "weekly"
        ? this.page >= monthOf(this.options.today)
        : this.year >= Number(this.options.today.slice(0, 4));
    next.disabled = atCurrent;
    next.onclick = () => {
      if (!atCurrent) this.shiftPage(1);
    };

    const hint = root.createDiv({
      cls: "ritim-period-calendar-hint",
      text:
        cadence === "weekly"
          ? "Her satır bir hafta · döneme dokunup panoya git"
          : "Her kutu bir ay · döneme dokunup panoya git",
    });
    hint.addClass("ritim-muted");

    if (cadence === "weekly") {
      this.renderWeeks(root, current);
    } else {
      this.renderMonths(root, current);
    }
  }

  private renderWeeks(root: HTMLElement, current: string): void {
    const { habit, weekStart } = this.options;
    const pageStart = `${this.page}-01`;
    const pageEnd = addDays(addMonths(pageStart, 1), -1);
    const grid = root.createDiv({ cls: "ritim-week-calendar" });

    for (const start of weeksInMonth(this.page, weekStart)) {
      const value = periodValue(habit, start);
      const done = periodDone(habit, start);
      const future = start > current;
      const outside = start < pageStart || start > pageEnd;
      const button = grid.createEl("button", {
        cls:
          "ritim-week-cell" +
          (done ? " is-done" : value > 0 ? " is-partial" : "") +
          (start === current ? " is-current" : "") +
          (future ? " is-future" : "") +
          (outside ? " is-outside" : ""),
      });
      button.type = "button";

      const text = button.createDiv({ cls: "ritim-week-text" });
      text.createSpan({
        text: periodTitle(start, "weekly"),
        cls: "ritim-week-range",
      });
      text.createSpan({
        text: this.periodNote(habit, value),
        cls: "ritim-week-note",
      });
      button.createSpan({
        text: this.cellText(habit, value),
        cls: "ritim-week-value",
      });

      button.setAttr("title", `${periodTitle(start, "weekly")} · ${this.valueText(habit, value)}`);
      button.setAttr(
        "aria-label",
        `${periodTitle(start, "weekly")}, ${this.valueText(habit, value)}`,
      );
      if (future) {
        button.disabled = true;
      } else {
        button.onclick = () => {
          this.options.onPick(start);
          this.close();
        };
      }
    }
  }

  private renderMonths(root: HTMLElement, current: string): void {
    const { habit } = this.options;
    const grid = root.createDiv({ cls: "ritim-month-calendar" });

    for (const start of monthsInYear(this.year)) {
      const value = periodValue(habit, start);
      const done = periodDone(habit, start);
      const future = start > current;
      const button = grid.createEl("button", {
        cls:
          "ritim-month-cell" +
          (done ? " is-done" : value > 0 ? " is-partial" : "") +
          (start === current ? " is-current" : "") +
          (future ? " is-future" : ""),
      });
      button.type = "button";
      button.createSpan({ text: monthShort(start), cls: "ritim-month-name" });
      button.createSpan({
        text: this.cellText(habit, value),
        cls: "ritim-month-value",
      });
      button.setAttr("title", `${periodTitle(start, "monthly")} · ${this.valueText(habit, value)}`);
      button.setAttr(
        "aria-label",
        `${periodTitle(start, "monthly")}, ${this.valueText(habit, value)}`,
      );
      if (future) {
        button.disabled = true;
      } else {
        button.onclick = () => {
          this.options.onPick(start);
          this.close();
        };
      }
    }
  }

  private renderLegend(root: HTMLElement, cadence: PeriodCadence): void {
    const legend = root.createDiv({ cls: "ritim-period-calendar-legend" });
    legend.createSpan({
      text:
        this.options.habit.kind === "numeric"
          ? "Renkli dönem hedefe ulaştı"
          : "Renkli dönem tamamlandı",
      cls: "ritim-muted",
    });
  }

  private shiftPage(delta: number): void {
    if (habitCadence(this.options.habit) === "weekly") {
      this.page = addMonths(this.page, delta);
    } else {
      this.year += delta;
    }
    this.render();
  }

  private metaText(habit: Habit, cadence: PeriodCadence): string {
    if (habit.kind === "numeric") {
      const unit = habit.unit ? ` ${habit.unit}` : "";
      return `Hedef ${formatAmount(habit.target ?? 0)}${unit} / ${
        cadence === "weekly" ? "hafta" : "ay"
      }`;
    }
    return cadence === "weekly" ? "Her hafta tek kutu" : "Her ay tek kutu";
  }

  private periodNote(habit: Habit, value: number): string {
    if (value <= 0) return "kayıt yok";
    if (habit.kind === "numeric") {
      return `${formatAmount(value)} / ${formatAmount(habit.target ?? 0)} ${
        habit.unit ?? ""
      }`.trim();
    }
    return "tamamlandı";
  }

  private cellText(habit: Habit, value: number): string {
    if (habit.kind === "numeric") {
      return value > 0 ? formatAmount(value) : "·";
    }
    return value > 0 ? "✓" : "·";
  }

  private valueText(habit: Habit, value: number): string {
    if (habit.kind === "numeric") {
      return `${formatAmount(value)}${habit.target ? ` / ${formatAmount(habit.target)}` : ""} ${
        habit.unit ?? ""
      }`.trim();
    }
    return value > 0 ? "✓" : "—";
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
}
