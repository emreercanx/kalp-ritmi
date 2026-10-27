import { App, Modal, Notice, setIcon } from "obsidian";
import { addMonths, habitDayMark, monthGrid, monthOf, type CalendarCell } from "../core/calendar";
import { addDays, formatLongDate, formatMonth, startOfWeek, weekdayShort } from "../core/date";
import { isPaused, isScheduled, isSkipped, scheduleLabel } from "../core/schedule";
import { formatAmount } from "../core/stats";
import type { Habit } from "../core/types";

interface CalendarModalOptions {
  today: string;
  selected: string;
  weekStart: 0 | 1;
  habit?: Habit;
  onPick: (date: string) => void;
  onSetValue?: (date: string, value: number) => Promise<void>;
  onChanged?: () => void;
}

export class CalendarModal extends Modal {
  private month: string;
  private changed = false;

  constructor(
    app: App,
    private readonly options: CalendarModalOptions,
  ) {
    super(app);
    this.month = monthOf(options.selected);
  }

  onOpen(): void {
    this.modalEl.addClass("ritim-calendar-modal");
    if (this.options.habit) {
      this.modalEl.addClass("is-habit");
      this.modalEl.setCssProps({ "--ritim-habit-color": this.options.habit.color });
    }
    this.render();
  }

  onClose(): void {
    this.contentEl.empty();
    this.modalEl.removeClass("ritim-calendar-modal");
    this.modalEl.removeClass("is-habit");
    if (this.changed) this.options.onChanged?.();
  }

  private render(): void {
    const { contentEl } = this;
    contentEl.empty();

    const head = contentEl.createDiv({ cls: "ritim-calendar-head" });
    const prev = head.createEl("button", { cls: "ritim-calendar-nav" });
    prev.type = "button";
    prev.setAttr("aria-label", "Önceki ay");
    setIcon(prev, "chevron-left");
    prev.onclick = () => this.shiftMonth(-1);

    head.createDiv({
      cls: "ritim-calendar-title",
      text: formatMonth(this.month),
    });

    const next = head.createEl("button", { cls: "ritim-calendar-nav" });
    next.type = "button";
    next.setAttr("aria-label", "Sonraki ay");
    setIcon(next, "chevron-right");
    const currentMonth = monthOf(this.options.today);
    next.disabled = this.month >= currentMonth;
    next.onclick = () => {
      if (this.month < currentMonth) this.shiftMonth(1);
    };

    if (this.options.habit) {
      const habitInfo = contentEl.createDiv({ cls: "ritim-calendar-habit" });
      habitInfo.createSpan({ text: this.options.habit.emoji, cls: "ritim-emoji" });
      habitInfo.createSpan({ text: this.options.habit.name });
      const detail =
        this.options.habit.kind === "numeric"
          ? `${this.options.habit.target ?? 0} ${this.options.habit.unit ?? ""}`.trim()
          : scheduleLabel(this.options.habit);
      habitInfo.createSpan({ text: `· ${detail}`, cls: "ritim-calendar-habit-meta" });

      if (this.options.onSetValue) {
        const hint = contentEl.createDiv({
          cls: "ritim-calendar-hint ritim-muted",
          text:
            this.options.habit.kind === "numeric"
              ? "Güne dokun: rakam gir · alttaki düğme: hızlı değer"
              : "Güne dokun: tik at veya kaldır",
        });
        hint.setAttr("aria-hidden", "true");
      }
    }

    const start = startOfWeek(`${this.month}-01`, this.options.weekStart);
    const weekdays = contentEl.createDiv({ cls: "ritim-calendar-weekdays" });
    for (let index = 0; index < 7; index++) {
      weekdays.createSpan({ text: weekdayShort(addDays(start, index)) });
    }

    const grid = contentEl.createDiv({ cls: "ritim-calendar-grid" });
    for (const cell of monthGrid(this.month, this.options.weekStart)) {
      if (this.options.habit && this.options.onSetValue) {
        if (this.options.habit.kind === "numeric") {
          this.renderNumericDay(grid, cell);
        } else {
          this.renderToggleDay(grid, cell);
        }
        continue;
      }

      const button = grid.createEl("button", { cls: "ritim-calendar-day" });
      button.type = "button";
      button.createSpan({
        cls: "ritim-calendar-daynum",
        text: String(Number(cell.date.slice(8, 10))),
      });

      const mark = this.options.habit
        ? habitDayMark(this.options.habit, cell.date)
        : null;
      if (!cell.inMonth) button.addClass("is-outside");
      const skipped = this.options.habit
        ? isSkipped(this.options.habit, cell.date)
        : false;
      const paused = this.options.habit
        ? isPaused(this.options.habit, cell.date)
        : false;
      if (this.options.habit && !isScheduled(this.options.habit, cell.date)) {
        button.addClass("is-off");
      }
      if (skipped) button.addClass("is-skipped");
      if (paused) button.addClass("is-paused");
      if (cell.date === this.options.today) button.addClass("is-today");
      if (cell.date === this.options.selected) {
        button.addClass("is-selected");
        button.setAttr("aria-pressed", "true");
      }

      if (mark) {
        button.addClass(mark.done ? "is-done" : "is-partial");
        button.createSpan({ cls: "ritim-calendar-dayvalue", text: mark.label });
      }

      const valueText = skipped
        ? "atlandı"
        : paused
          ? "molada"
          : mark && this.options.habit
            ? this.options.habit.kind === "numeric"
              ? `${mark.value} ${this.options.habit.unit ?? ""}`.trim()
              : "yapıldı"
            : "kayıt yok";
      button.setAttr("aria-label", `${formatLongDate(cell.date)}, ${valueText}`);

      if (cell.date > this.options.today) {
        button.disabled = true;
      } else {
        button.onclick = () => {
          this.options.onPick(cell.date);
          this.close();
        };
      }
    }

    const footer = contentEl.createDiv({ cls: "ritim-modal-footer" });
    const today = footer.createEl("button", { text: "Bugün" });
    today.type = "button";
    today.onclick = () => {
      this.options.onPick(this.options.today);
      this.close();
    };

    const close = footer.createEl("button", { text: "Kapat" });
    close.type = "button";
    close.onclick = () => this.close();
  }

  private renderNumericDay(grid: HTMLElement, cell: CalendarCell): void {
    const habit = this.options.habit;
    if (!habit) return;

    const editable = cell.date <= this.options.today;
    const quickValue = habit.quickValue;
    const wrapper = grid.createDiv({
      cls: `ritim-calendar-cell${quickValue ? " has-quick" : ""}`,
    });
    const day = wrapper.createDiv({ cls: "ritim-calendar-day is-editable" });

    if (!cell.inMonth) day.addClass("is-outside");
    if (!isScheduled(habit, cell.date)) day.addClass("is-off");
    if (cell.date === this.options.today) day.addClass("is-today");
    if (cell.date === this.options.selected) {
      day.addClass("is-selected");
      day.setAttr("aria-pressed", "true");
    }
    if (!editable) day.addClass("is-future");

    const paint = (): void => {
      day.empty();
      day.removeClass("is-editing", "is-done", "is-partial", "is-skipped", "is-paused");
      if (editable) day.setAttr("role", "button");
      day.createSpan({
        cls: "ritim-calendar-daynum",
        text: String(Number(cell.date.slice(8, 10))),
      });

      const mark = habitDayMark(habit, cell.date);
      const skipped = isSkipped(habit, cell.date);
      const paused = isPaused(habit, cell.date);
      if (skipped) day.addClass("is-skipped");
      if (paused) day.addClass("is-paused");
      if (mark) {
        day.addClass(mark.done ? "is-done" : "is-partial");
        day.createSpan({ cls: "ritim-calendar-dayvalue", text: mark.label });
      }

      const valueText = skipped
        ? "atlandı"
        : paused
          ? "molada"
          : mark
            ? `${mark.value} ${habit.unit ?? ""}`.trim()
            : "kayıt yok";
      day.setAttr(
        "aria-label",
        `${formatLongDate(cell.date)}, ${valueText}${editable ? ", değeri düzenlemek için dokun" : ""}`,
      );
      day.setAttr("title", editable ? "Değeri düzenle" : valueText);
    };

    const openEditor = (): void => {
      if (!editable || day.hasClass("is-editing")) return;

      day.empty();
      day.removeClass("is-done", "is-partial", "is-skipped", "is-paused");
      day.removeAttribute("role");
      day.addClass("is-editing");
      const input = day.createEl("input", { cls: "ritim-calendar-input" });
      input.type = "text";
      input.inputMode = "decimal";
      input.enterKeyHint = "done";
      input.placeholder = habit.target ? String(habit.target) : "0";
      input.setAttr("aria-label", `${habit.name}, ${formatLongDate(cell.date)} değeri`);

      const before = habit.log[cell.date] ?? 0;
      input.value = before > 0 ? String(Math.round(before * 100) / 100).replace(".", ",") : "";
      let settled = false;

      const finish = (save: boolean): void => {
        if (settled) return;
        settled = true;

        let next = before;
        if (save) {
          const raw = input.value.trim();
          const parsed = Number.parseFloat(raw.replace(",", "."));
          if (!raw || parsed === 0) {
            next = 0;
          } else if (Number.isFinite(parsed) && parsed > 0) {
            next = parsed;
          } else {
            paint();
            return;
          }
        }

        if (save && next !== before) {
          this.saveDayValue(cell.date, next, paint);
        } else {
          paint();
        }
      };

      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          finish(true);
        } else if (event.key === "Escape") {
          event.preventDefault();
          finish(false);
        }
      });
      input.addEventListener("blur", () => finish(true));
      window.setTimeout(() => {
        input.focus();
        input.select();
      }, 0);
    };

    if (editable) {
      day.setAttr("role", "button");
      day.tabIndex = 0;
      day.onclick = (event) => {
        event.stopPropagation();
        openEditor();
      };
      day.onkeydown = (event) => {
        if (event.target !== day) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openEditor();
        }
      };
    } else {
      day.tabIndex = -1;
    }

    paint();

    if (quickValue) {
      const quick = wrapper.createEl("button", {
        cls: "ritim-calendar-quick",
        text: formatAmount(quickValue),
      });
      quick.type = "button";
      quick.disabled = !editable;
      quick.setAttr(
        "aria-label",
        `${habit.name}, ${formatLongDate(cell.date)}, hızlı değer ${formatAmount(quickValue)}`,
      );
      quick.setAttr("title", `Hızlı değer: ${formatAmount(quickValue)}`);
      quick.onclick = (event) => {
        event.stopPropagation();
        this.saveDayValue(cell.date, quickValue, paint);
      };
    }
  }

  private renderToggleDay(grid: HTMLElement, cell: CalendarCell): void {
    const habit = this.options.habit;
    if (!habit) return;

    const editable = cell.date <= this.options.today;
    const button = grid.createEl("button", { cls: "ritim-calendar-day is-editable" });
    button.type = "button";
    if (!cell.inMonth) button.addClass("is-outside");
    if (!isScheduled(habit, cell.date)) button.addClass("is-off");
    if (cell.date === this.options.today) button.addClass("is-today");
    if (cell.date === this.options.selected) button.addClass("is-selected");

    const paint = (): void => {
      button.empty();
      button.removeClass("is-done", "is-skipped", "is-paused");
      button.createSpan({
        cls: "ritim-calendar-daynum",
        text: String(Number(cell.date.slice(8, 10))),
      });

      const mark = habitDayMark(habit, cell.date);
      const skipped = isSkipped(habit, cell.date);
      const paused = isPaused(habit, cell.date);
      if (skipped) button.addClass("is-skipped");
      if (paused) button.addClass("is-paused");
      if (mark) {
        button.addClass("is-done");
        button.createSpan({ cls: "ritim-calendar-dayvalue", text: mark.label });
      }
      button.setAttr("aria-pressed", mark?.done ? "true" : "false");
      const valueText = skipped
        ? "atlandı"
        : paused
          ? "molada"
          : mark
            ? "yapıldı"
            : "yapılmadı";
      button.setAttr(
        "aria-label",
        `${formatLongDate(cell.date)}, ${valueText}${editable ? ", tiki değiştirmek için dokun" : ""}`,
      );
      button.setAttr("title", editable ? "Tiki aç veya kapat" : valueText);
    };

    if (editable) {
      button.onclick = () => {
        const next = (habit.log[cell.date] ?? 0) > 0 ? 0 : 1;
        this.saveDayValue(cell.date, next, paint);
      };
    } else {
      button.disabled = true;
    }
    paint();
  }

  private saveDayValue(date: string, value: number, repaint: () => void): void {
    const save = this.options.onSetValue;
    if (!save) return;

    const pending = save(date, value);
    this.changed = true;
    repaint();
    void pending
      .then(() => {
        repaint();
      })
      .catch((error: unknown) => {
        repaint();
        const message = error instanceof Error ? error.message : String(error);
        new Notice(`Kalp Ritmi: değer kaydedilemedi. ${message}`, 8000);
      });
  }

  private shiftMonth(delta: number): void {
    this.month = addMonths(this.month, delta);
    this.render();
  }
}
