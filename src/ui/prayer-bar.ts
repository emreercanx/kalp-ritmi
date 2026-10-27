import { ymd } from "../core/date";
import {
  addLocalDays,
  formatClock,
  formatCountdown,
  nextPrayer,
  prayerSlots,
  type PrayerConfig,
  type PrayerSlot,
} from "../core/prayer";
import { findPrayerHabit } from "../core/prayer-habits";
import type { Habit } from "../core/types";

export interface PrayerBarOptions {
  config: PrayerConfig;
  city: string;
  /** Logical board date; keeps marks consistent with the day cutoff. */
  today?: string;
  habits: Habit[];
  onToggle?: (slot: PrayerSlot) => void | Promise<void>;
  now?: Date;
}

export function renderPrayerBar(root: HTMLElement, options: PrayerBarOptions): void {
  const bar = root.createDiv({ cls: "ritim-prayer" });
  const nowProvider = options.now ? () => options.now as Date : () => new Date();
  let timer: number | undefined;

  const update = (): void => {
    if (!bar.isConnected) {
      if (timer !== undefined) window.clearInterval(timer);
      return;
    }

    const now = nowProvider();
    const date = options.today ?? ymd(now);
    const base = options.today ? new Date(`${options.today}T12:00:00`) : now;

    try {
      const slots = prayerSlots(base, options.config);
      const tomorrow = prayerSlots(addLocalDays(base, 1), options.config);
      const upcoming = nextPrayer(slots, now, tomorrow);

      bar.empty();

      const head = bar.createDiv({ cls: "ritim-prayer-head" });
      const next = head.createDiv({ cls: "ritim-prayer-next" });
      if (upcoming) {
        next.createSpan({ text: upcoming.tomorrow ? "Yarın " : "Sıradaki " });
        next.createSpan({ text: upcoming.slot.label, cls: "ritim-prayer-next-name" });
        next.createSpan({ text: ` ${formatClock(upcoming.slot.time)}` });
      } else {
        next.createSpan({ text: "Vakit bulunamadı." });
      }
      head.createSpan({ text: options.city, cls: "ritim-prayer-city" });

      if (upcoming) {
        head.createSpan({
          text: formatCountdown(upcoming.slot.time.getTime() - now.getTime()),
          cls: "ritim-prayer-countdown",
        });
      }

      const times = bar.createDiv({ cls: "ritim-prayer-times" });
      for (const slot of slots) {
        const isNext =
          upcoming !== null && !upcoming.tomorrow && upcoming.slot.key === slot.key;
        const habit = findPrayerHabit(options.habits, slot.key);
        const done = habit !== undefined && (habit.log[date] ?? 0) > 0;
        const item = times.createEl("button", {
          cls:
            "ritim-prayer-item" +
            (isNext ? " is-next" : "") +
            (done ? " is-done" : "") +
            (options.onToggle ? " is-tappable" : ""),
        });
        item.type = "button";
        item.createSpan({ text: slot.label, cls: "ritim-prayer-label" });
        item.createSpan({ text: formatClock(slot.time), cls: "ritim-prayer-time" });
        item.createSpan({
          text: done ? "✓" : "",
          cls: "ritim-prayer-check",
        });

        if (options.onToggle) {
          item.setAttr(
            "aria-label",
            `${slot.label} namazını ${done ? "işaretsiz bırak" : "işaretle"}`,
          );
          item.setAttr("title", done ? "İşareti geri al" : "Namazı işaretle");
          item.onclick = () => {
            void Promise.resolve(options.onToggle?.(slot)).catch(() => undefined);
          };
        } else {
          item.disabled = true;
        }
      }

      bar.setAttr("aria-label", `${options.city} namaz vakitleri`);
    } catch {
      bar.empty();
      bar.createDiv({
        cls: "ritim-prayer-error",
        text: "Namaz vakitleri bu konum ve tarih için hesaplanamadı.",
      });
    }
  };

  update();
  timer = window.setInterval(update, 30_000);
}
