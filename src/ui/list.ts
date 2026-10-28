import { setIcon } from "obsidian";
import {
  addDays,
  dayNum,
  formatRange,
  lastNDays,
  startOfMonth,
  weekdayShort,
} from "../core/date";
import { DAY_PART_ORDER, dayPartLabel, dayPartOf } from "../core/day-part";
import { perfectDayStatus } from "../core/perfect-day";
import {
  addPeriods,
  lastNPeriods,
  periodContains,
  periodEnd,
  periodHeadLabel,
  periodStatus,
  periodTitle,
  type PeriodCadence,
} from "../core/period";
import type { PrayerConfig, PrayerSlot } from "../core/prayer";
import {
  isDailySchedule,
  isPaused,
  isScheduled,
  isSkipped,
  scheduleShort,
} from "../core/schedule";
import { sortByStack } from "../core/stacking";
import { formatAmount, isDoneValue } from "../core/stats";
import {
  habitCadence,
  type Habit,
  type HabitCadence,
} from "../core/types";
import { renderPrayerBar } from "./prayer-bar";

export interface HabitListOptions {
  today: string;
  endDate: string;
  focusDate: string;
  days: number;
  visibleWeeks: number;
  visibleMonths: number;
  weekOffset: number;
  monthOffset: number;
  weekStart: 0 | 1;
  onChange: (habit: Habit, date: string, value: number) => Promise<void>;
  onNavigate: (deltaDays: number) => void;
  onToday: () => void;
  onPeriodNavigate: (cadence: PeriodCadence, delta: 1 | -1) => void;
  onPeriodToday: (cadence: PeriodCadence) => void;
  onAdd: () => void;
  onAddCadence?: (cadence: Exclude<HabitCadence, "daily">) => void;
  onEdit: (habit: Habit) => void;
  onHabitCalendar: (habit: Habit) => void;
  onHabitDetail: (habit: Habit) => void;
  onPeriodDetail?: (habit: Habit) => void;
  onDelete?: (habit: Habit) => void;
  onSkip?: (habit: Habit, date: string, skipped: boolean) => Promise<void>;
  onQuickNote?: (habit: Habit) => void;
  onHabitDoc?: (habit: Habit) => void;
  onHabitDocPreview?: (habit: Habit) => void;
  onCalendar: () => void;
  onSettings: () => void;
  onQuickTodo?: () => void;
  hasArchived?: boolean;
  onError?: (error: unknown) => void;
  prayer?: {
    config: PrayerConfig;
    city: string;
    onToggle: (slot: PrayerSlot) => void | Promise<void>;
  };
  hijriDate?: string;
}

export function renderHabitList(
  root: HTMLElement,
  habits: Habit[],
  options: HabitListOptions,
): void {
  root.empty();
  root.addClass("ritim-root");

  renderHeader(root, options, perfectDayStatus(habits, options.today));

  if (options.prayer) {
    renderPrayerBar(root, {
      config: options.prayer.config,
      city: options.prayer.city,
      today: options.today,
      habits,
      onToggle: options.prayer.onToggle,
    });
  }

  const dailyHabits = habits.filter((habit) => habitCadence(habit) === "daily");
  const weeklyHabits = habits.filter((habit) => habitCadence(habit) === "weekly");
  const monthlyHabits = habits.filter((habit) => habitCadence(habit) === "monthly");

  const afterChange = (habit: Habit, date: string, value: number): void => {
    void options
      .onChange(habit, date, value)
      .catch((error: unknown) => options.onError?.(error));
  };

  renderDailySection(root, dailyHabits, options, afterChange);

  renderPeriodSection(root, {
    cadence: "weekly",
    habits: weeklyHabits,
    starts: weeklyStarts(options),
    options,
    afterChange,
  });

  renderPeriodSection(root, {
    cadence: "monthly",
    habits: monthlyHabits,
    starts: monthlyStarts(options),
    options,
    afterChange,
  });

  root.createDiv({
    cls: "ritim-hint",
    text: "Geçmiş günlere dokunarak düzeltebilirsin. Dönemlik kayıtlar seçili hafta veya aya yazılır.",
  });
}

function weeklyStarts(options: HabitListOptions): string[] {
  const anchor = addDays(options.today, -options.weekOffset * 7);
  return lastNPeriods(options.visibleWeeks, anchor, "weekly", options.weekStart);
}

function monthlyStarts(options: HabitListOptions): string[] {
  const current = startOfMonth(options.today);
  const anchor = addPeriods(current, -options.monthOffset, "monthly");
  return lastNPeriods(options.visibleMonths, anchor, "monthly", options.weekStart);
}

function renderHeader(
  root: HTMLElement,
  options: HabitListOptions,
  perfect: ReturnType<typeof perfectDayStatus>,
): void {
  const { today, endDate } = options;
  const header = root.createDiv({ cls: "ritim-header" });
  const text = header.createDiv({ cls: "ritim-header-text" });
  text.createEl("h2", { text: "Alışkanlıklar", cls: "ritim-title" });
  text.createDiv({ text: "Yerel kayıt · Ritim/", cls: "ritim-muted" });
  if (options.hijriDate) {
    text.createDiv({ text: options.hijriDate, cls: "ritim-hijri" });
  }
  text.createDiv({
    text:
      perfect.due === 0
        ? "Bugün beklenen yok"
        : perfect.perfect
          ? `Perfect day · ${perfect.done}/${perfect.due}`
          : `Bugün ${perfect.done}/${perfect.due}`,
    cls: "ritim-perfect" + (perfect.perfect ? " is-perfect" : ""),
  });
  const actions = header.createDiv({ cls: "ritim-header-actions" });
  actions.createSpan({ text: "kayıtlı", cls: "ritim-badge" });

  if (options.onQuickTodo) {
    const quickTodo = actions.createEl("button", { cls: "ritim-add-btn" });
    quickTodo.type = "button";
    quickTodo.setAttr("aria-label", "Hızlı yapılacaklar");
    quickTodo.setAttr("title", "Hızlı yapılacaklar");
    setIcon(quickTodo, "zap");
    quickTodo.onclick = () => options.onQuickTodo?.();
  }

  const settings = actions.createEl("button", { cls: "ritim-add-btn" });
  settings.type = "button";
  settings.setAttr("aria-label", "Kalp Ritmi ayarları");
  settings.setAttr("title", "Ayarlar");
  setIcon(settings, "settings");
  settings.onclick = () => options.onSettings();

  const add = actions.createEl("button", { cls: "ritim-add-btn" });
  add.type = "button";
  add.setAttr("aria-label", "Yeni alışkanlık ekle");
  add.setAttr("title", "Yeni alışkanlık");
  setIcon(add, "plus");
  add.onclick = () => options.onAdd();

  const nav = root.createDiv({ cls: "ritim-nav" });

  const prev = nav.createEl("button", { cls: "ritim-nav-btn", text: "‹" });
  prev.type = "button";
  prev.setAttr("aria-label", `Önceki ${options.days} gün`);
  prev.onclick = () => options.onNavigate(-options.days);

  const range = nav.createSpan({
    cls: "ritim-nav-range",
    text: formatRange(addDays(endDate, -(options.days - 1)), endDate),
  });
  range.setAttr("title", `Görünen ${options.days} gün`);

  const calendar = nav.createEl("button", { cls: "ritim-nav-btn" });
  calendar.type = "button";
  calendar.setAttr("aria-label", "Takvimden tarihe git");
  calendar.setAttr("title", "Takvim");
  setIcon(calendar, "calendar");
  calendar.onclick = () => options.onCalendar();

  const atToday = endDate >= today;
  const next = nav.createEl("button", { cls: "ritim-nav-btn", text: "›" });
  next.type = "button";
  next.setAttr("aria-label", `Sonraki ${options.days} gün`);
  next.disabled = atToday;
  next.onclick = () => {
    if (!atToday) options.onNavigate(options.days);
  };

  const todayButton = nav.createEl("button", { cls: "ritim-today-btn", text: "Bugün" });
  todayButton.type = "button";
  todayButton.disabled = atToday;
  todayButton.onclick = () => {
    if (!atToday) options.onToday();
  };
}

function renderDailySection(
  root: HTMLElement,
  habits: Habit[],
  options: HabitListOptions,
  afterChange: (habit: Habit, date: string, value: number) => void,
): void {
  const { section } = createSectionHeader(
    root,
    "Günlük alışkanlıklar",
    habits.length > 0 ? `${habits.length} alışkanlık` : "Her gün",
  );
  const dates = lastNDays(options.days, options.endDate);
  const ordered = sortByStack(habits);
  const groups = DAY_PART_ORDER.map((part) => ({
    part,
    habits: ordered.filter((habit) => dayPartOf(habit) === part),
  })).filter((group) => group.habits.length > 0);
  const showPartLabels = groups.length > 1;

  if (habits.length === 0) {
    const table = section.createDiv({
      cls: "ritim-list" + (options.days > 7 ? " is-dense" : ""),
    });
    renderHeadRow(table, dates, options.today, options.focusDate);
    renderEmpty(table, {
      text: options.hasArchived
        ? "Panoda etkin günlük alışkanlık yok."
        : "Henüz günlük alışkanlık yok.",
      hint: options.hasArchived
        ? "Arşivdekileri Ayarlar > Arşiv bölümünden geri alabilirsin."
        : undefined,
      button: "Günlük alışkanlık ekle",
      onAdd: options.onAdd,
    });
    return;
  }

  for (const group of groups) {
    if (showPartLabels) {
      groupHead(section, dayPartLabel(group.part), group.habits.length);
    }
    const table = section.createDiv({
      cls: "ritim-list" + (options.days > 7 ? " is-dense" : ""),
    });
    renderHeadRow(table, dates, options.today, options.focusDate);
    for (const habit of group.habits) {
      renderHabitRow(
        table,
        habit,
        dates,
        options,
        afterChange,
        stackName(habits, habit),
      );
    }
  }
}

function groupHead(root: HTMLElement, label: string, count: number): void {
  const head = root.createDiv({ cls: "ritim-daypart-head" });
  head.createSpan({ text: label, cls: "ritim-daypart-title" });
  head.createSpan({ text: `${count} alışkanlık`, cls: "ritim-muted" });
}

function stackName(habits: Habit[], habit: Habit): string | undefined {
  if (!habit.stackAfter) return undefined;
  return habits.find((candidate) => candidate.id === habit.stackAfter)?.name;
}

interface PeriodSectionOptions {
  cadence: PeriodCadence;
  habits: Habit[];
  starts: string[];
  options: HabitListOptions;
  afterChange: (habit: Habit, date: string, value: number) => void;
}

function renderPeriodSection(root: HTMLElement, period: PeriodSectionOptions): void {
  const { cadence, options, starts } = period;
  const manualCount = period.habits.length;
  const title = cadence === "weekly" ? "Haftalık alışkanlıklar" : "Aylık alışkanlıklar";
  const detail = cadence === "weekly" ? "Her sütun bir hafta." : "Her sütun bir ay.";
  const countText =
    manualCount === 0
      ? detail
      : `${manualCount} ${cadence === "weekly" ? "haftalık" : "aylık"}`;

  const { section, head } = createSectionHeader(root, title, countText);
  renderPeriodNav(head, cadence, starts, options);

  const table = section.createDiv({
    cls:
      "ritim-list is-period" +
      (starts.length > 6 ? " is-dense" : ""),
  });
  renderPeriodHeadRow(table, starts, cadence, options.today);

  if (manualCount === 0) {
    renderEmpty(table, {
      text: cadence === "weekly" ? "Henüz haftalık alışkanlık yok." : "Henüz aylık alışkanlık yok.",
      hint:
        cadence === "weekly"
          ? "7 günü tek kutuda takip eden bir alışkanlık ekle."
          : "Her ayı tek kutuda takip eden bir alışkanlık ekle.",
      button: cadence === "weekly" ? "Haftalık alışkanlık ekle" : "Aylık alışkanlık ekle",
      onAdd: options.onAddCadence ? () => options.onAddCadence?.(cadence) : undefined,
    });
    return;
  }

  for (const habit of period.habits) {
    renderPeriodHabitRow(table, habit, cadence, starts, period, options);
  }
}

function createSectionHeader(
  root: HTMLElement,
  title: string,
  subtitle: string,
): { section: HTMLElement; head: HTMLElement } {
  const section = root.createDiv({ cls: "ritim-section" });
  const head = section.createDiv({ cls: "ritim-section-head" });
  const info = head.createDiv({ cls: "ritim-section-info" });
  info.createEl("h3", { text: title, cls: "ritim-section-title" });
  info.createDiv({ text: subtitle, cls: "ritim-muted" });
  return { section, head };
}

function renderPeriodNav(
  head: HTMLElement,
  cadence: PeriodCadence,
  starts: string[],
  options: HabitListOptions,
): void {
  if (starts.length === 0) return;

  const nav = head.createDiv({ cls: "ritim-period-nav" });
  const label = cadence === "weekly" ? "hafta" : "ay";
  const anchor = options[cadence === "weekly" ? "weekOffset" : "monthOffset"];
  const first = starts[0];
  const last = starts[starts.length - 1];

  const prev = nav.createEl("button", { cls: "ritim-nav-btn", text: "‹" });
  prev.type = "button";
  prev.setAttr("aria-label", `Önceki ${label}`);
  prev.setAttr("title", `Önceki ${label}`);
  prev.onclick = () => options.onPeriodNavigate(cadence, 1);

  const range = nav.createSpan({
    cls: "ritim-period-range",
    text: formatRange(first, periodEnd(last, cadence)),
  });
  range.setAttr("title", `Görünen ${starts.length} ${label}`);

  const next = nav.createEl("button", { cls: "ritim-nav-btn", text: "›" });
  next.type = "button";
  next.setAttr("aria-label", `Sonraki ${label}`);
  next.setAttribute("title", `Sonraki ${label}`);
  next.disabled = anchor <= 0;
  next.onclick = () => {
    if (anchor > 0) options.onPeriodNavigate(cadence, -1);
  };

  const today = nav.createEl("button", { cls: "ritim-today-btn", text: "Bugün" });
  today.type = "button";
  today.disabled = anchor <= 0;
  today.onclick = () => {
    if (anchor > 0) options.onPeriodToday(cadence);
  };

  if (options.onAddCadence) {
    const add = head.createEl("button", { cls: "ritim-add-btn ritim-section-add" });
    add.type = "button";
    add.setAttr(
      "aria-label",
      cadence === "weekly" ? "Haftalık alışkanlık ekle" : "Aylık alışkanlık ekle",
    );
    add.setAttr("title", cadence === "weekly" ? "Yeni haftalık alışkanlık" : "Yeni aylık alışkanlık");
    setIcon(add, "plus");
    add.onclick = () => options.onAddCadence?.(cadence);
  }
}

function renderEmpty(
  table: HTMLElement,
  options: { text: string; hint?: string; button: string; onAdd?: () => void },
): void {
  const empty = table.createDiv({ cls: "ritim-empty" });
  empty.createDiv({ text: options.text });
  if (options.hint) empty.createDiv({ text: options.hint, cls: "ritim-muted" });
  if (!options.onAdd) return;
  const add = empty.createEl("button", { text: options.button, cls: "mod-cta" });
  add.type = "button";
  add.onclick = () => options.onAdd?.();
}

function renderHeadRow(
  table: HTMLElement,
  dates: string[],
  today: string,
  focusDate: string,
): void {
  const row = table.createDiv({ cls: "ritim-row ritim-row-head" });
  applyColumns(row, dates.length);
  row.createDiv({ cls: "ritim-name-cell" });

  for (const date of dates) {
    const classes = ["ritim-day-head"];
    if (date === today) classes.push("is-today");
    if (date === focusDate && date !== today) classes.push("is-picked");
    const cell = row.createDiv({ cls: classes.join(" ") });
    cell.createSpan({ text: weekdayShort(date), cls: "ritim-weekday" });
    cell.createSpan({ text: dayNum(date), cls: "ritim-daynum" });
  }
}

function renderPeriodHeadRow(
  table: HTMLElement,
  starts: string[],
  cadence: PeriodCadence,
  today: string,
): void {
  const row = table.createDiv({ cls: "ritim-row ritim-row-head" });
  applyColumns(row, starts.length);
  row.createDiv({ cls: "ritim-name-cell" });

  for (const start of starts) {
    const label = periodHeadLabel(start, cadence);
    const classes = ["ritim-day-head", "ritim-period-head"];
    if (periodContains(start, today, cadence)) classes.push("is-today");
    const cell = row.createDiv({ cls: classes.join(" ") });
    cell.createSpan({ text: label.top, cls: "ritim-weekday" });
    cell.createSpan({ text: label.bottom, cls: "ritim-daynum" });
    cell.setAttr("title", periodTitle(start, cadence));
  }
}

function renderHabitRow(
  table: HTMLElement,
  habit: Habit,
  dates: string[],
  options: HabitListOptions,
  afterChange: (habit: Habit, date: string, value: number) => void,
  cueName?: string,
): void {
  const hasQuick = habit.kind === "numeric" && Boolean(habit.quickValue);
  const row = table.createDiv({
    cls:
      "ritim-row" +
      (cueName ? " has-stack" : "") +
      (hasQuick ? " has-quick" : ""),
  });
  applyColumns(row, dates.length);
  row.setCssProps({ "--ritim-habit-color": habit.color });

  const nameCell = row.createDiv({ cls: "ritim-name-cell" });
  const editArea = nameCell.createDiv({ cls: "ritim-name-open" });
  editArea.createSpan({ text: habit.emoji, cls: "ritim-emoji" });

  const nameWrap = editArea.createDiv({ cls: "ritim-name-wrap" });
  nameWrap.createDiv({ text: habit.name, cls: "ritim-name" });
  nameWrap.createDiv({ text: metaText(habit, cueName), cls: "ritim-name-meta" });

  bindNameOpen(editArea, habit, options);

  renderRowActions(nameCell, habit, options, true);

  for (const date of dates) {
    const paused = isPaused(habit, date);
    const classes = ["ritim-cell"];
    if (date === options.today) classes.push("is-today");
    if (date === options.focusDate && date !== options.today) classes.push("is-picked");
    if (!isScheduled(habit, date)) classes.push("is-off");
    if (paused) classes.push("is-paused");
    if (hasQuick) classes.push("has-quick");
    const cell = row.createDiv({ cls: classes.join(" ") });
    paintDayCell(cell, habit, date, options, afterChange);
  }
}

function paintDayCell(
  cell: HTMLElement,
  habit: Habit,
  date: string,
  options: HabitListOptions,
  afterChange: (habit: Habit, date: string, value: number) => void,
): void {
  cell.empty();
  cell.removeClass("is-editing");
  cell.removeClass("is-clickable");
  cell.onclick = null;
  cell.onkeydown = null;
  cell.removeAttribute("title");

  const skipped = isSkipped(habit, date);
  cell.toggleClass("is-skipped", skipped);
  const rerender = (): void =>
    paintDayCell(cell, habit, date, options, afterChange);
  if (skipped) {
    renderSkippedCell(cell, habit, date, options);
  } else if (habit.kind === "numeric") {
    renderNumericCell(cell, habit, date, date, afterChange, rerender);
  } else {
    renderCheckCell(cell, habit, date, date, afterChange);
  }

  if (habit.kind === "numeric" && habit.quickValue) {
    appendQuickValueButton(
      cell,
      habit,
      date,
      habit.quickValue,
      options,
      rerender,
    );
  }
}

function appendQuickValueButton(
  cell: HTMLElement,
  habit: Habit,
  date: string,
  value: number,
  options: HabitListOptions,
  repaint: () => void,
): void {
  const button = cell.createEl("button", { cls: "ritim-quick-btn" });
  button.type = "button";
  setIcon(button, "plus");
  button.setAttr(
    "aria-label",
    `${habit.name}, ${date}, hızlı değer ${formatAmount(value)} yaz`,
  );
  button.setAttr("title", `Bu güne ${formatAmount(value)} yaz`);
  button.onclick = (event) => {
    event.stopPropagation();
    void options
      .onChange(habit, date, value)
      .then(repaint)
      .catch((error: unknown) => {
        repaint();
        options.onError?.(error);
      });
  };
  button.onkeydown = (event) => {
    event.stopPropagation();
  };
}

function renderPeriodHabitRow(
  table: HTMLElement,
  habit: Habit,
  cadence: PeriodCadence,
  starts: string[],
  period: PeriodSectionOptions,
  options: HabitListOptions,
): void {
  const row = table.createDiv({ cls: "ritim-row ritim-period-row" });
  applyColumns(row, starts.length);
  row.setCssProps({ "--ritim-habit-color": habit.color });

  const nameCell = row.createDiv({ cls: "ritim-name-cell" });
  const editArea = nameCell.createDiv({ cls: "ritim-name-open" });
  editArea.createSpan({ text: habit.emoji, cls: "ritim-emoji" });
  const nameWrap = editArea.createDiv({ cls: "ritim-name-wrap" });
  nameWrap.createDiv({ text: habit.name, cls: "ritim-name" });
  nameWrap.createDiv({ text: metaText(habit), cls: "ritim-name-meta" });

  bindNameOpen(editArea, habit, options);

  renderRowActions(nameCell, habit, options, false);

  for (const start of starts) {
    const classes = ["ritim-cell", "ritim-period-cell"];
    if (periodContains(start, options.today, cadence)) classes.push("is-current");
    if (periodStatus(start, cadence, options.today) === "future") classes.push("is-off");
    const cell = row.createDiv({ cls: classes.join(" ") });
    const label = periodTitle(start, cadence);
    if (habit.kind === "numeric") {
      renderNumericCell(cell, habit, start, label, period.afterChange);
    } else {
      renderCheckCell(cell, habit, start, label, period.afterChange);
    }
  }
}

function bindNameOpen(
  area: HTMLElement,
  habit: Habit,
  options: HabitListOptions,
): void {
  const open = (): void => {
    if (options.onHabitDocPreview) options.onHabitDocPreview(habit);
    else options.onEdit(habit);
  };
  area.setAttr("role", "button");
  area.setAttr("tabindex", "0");
  area.setAttr(
    "aria-label",
    options.onHabitDocPreview
      ? `${habit.name} Markdown dosyasını önizle`
      : `${habit.name} alışkanlığını düzenle`,
  );
  area.setAttr("title", options.onHabitDocPreview ? "Notu önizle" : "Düzenle");
  area.onclick = open;
  area.onkeydown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open();
    }
  };
}

function renderRowActions(
  nameCell: HTMLElement,
  habit: Habit,
  options: HabitListOptions,
  daily: boolean,
): void {
  const actions = nameCell.createDiv({ cls: "ritim-row-actions" });
  const action = (
    icon: string,
    label: string,
    title: string,
    run: () => void,
  ): void => {
    const button = actions.createEl("button", { cls: "ritim-row-action" });
    button.type = "button";
    button.setAttr("aria-label", `${habit.name} ${label}`);
    button.setAttr("title", title);
    setIcon(button, icon);
    button.onclick = (event) => {
      event.stopPropagation();
      run();
    };
  };

  action("calendar", "takvimini aç", "Takvim", () => options.onHabitCalendar(habit));
  action("pencil", "alışkanlığını düzenle", "Düzenle", () => options.onEdit(habit));
  action(
    "activity",
    "ayrıntılarını aç",
    "Ayrıntılar",
    () => (daily ? options.onHabitDetail(habit) : options.onPeriodDetail?.(habit)),
  );
  if (options.onHabitDoc) {
    action("file-text", "Markdown dosyasını aç", "Markdown dosyası", () =>
      options.onHabitDoc?.(habit),
    );
  }
  if (daily && options.onQuickNote) {
    action("notebook-pen", "hızlı notlarını aç", "Hızlı notlar", () =>
      options.onQuickNote?.(habit),
    );
  }
  if (!daily && options.onDelete) {
    action("trash-2", "alışkanlığını sil", "Sil", () => options.onDelete?.(habit));
  }
}

function applyColumns(row: HTMLElement, columns: number): void {
  const nameWidth = 140;
  row.setCssProps({
    "grid-template-columns":
      `minmax(${nameWidth}px, 1fr) repeat(${columns}, var(--ritim-col, minmax(20px, 30px)))`,
  });
}

function metaText(habit: Habit, cueName?: string): string {
  const cue = cueName ? ` · ${cueName} sonrası` : "";
  const pause = habit.pausedFrom && habit.pausedUntil ? " · mola" : "";
  const cadence = habitCadence(habit);
  if (cadence === "weekly" || cadence === "monthly") {
    const period = cadence === "weekly" ? "haftalık" : "aylık";
    if (habit.kind === "numeric") {
      return `${formatAmount(habit.target ?? 0)} ${habit.unit ?? ""} / ${
        cadence === "weekly" ? "hafta" : "ay"
      }`.trim() + cue + pause;
    }
    return period + cue + pause;
  }

  const daily = isDailySchedule(habit);
  const schedule = daily ? "" : ` · ${scheduleShort(habit)}`;
  if (habit.kind === "numeric") {
    const quick = habit.quickValue
      ? ` (${formatAmount(habit.quickValue)})`
      : "";
    const minimum = habit.minimum ? ` · min ${formatAmount(habit.minimum)}` : "";
    return `${formatAmount(habit.target ?? 0)} ${habit.unit ?? ""}`.trim() + quick + minimum + schedule + cue + pause;
  }
  if (habit.kind === "quit") return "bırak" + schedule + cue + pause;
  return (daily ? "her gün" : scheduleShort(habit)) + cue + pause;
}

function formatValue(value: number): string {
  return String(Math.round(value * 100) / 100).replace(".", ",");
}

function renderSkippedCell(
  cell: HTMLElement,
  habit: Habit,
  key: string,
  options: HabitListOptions,
): void {
  cell.createSpan({ cls: "ritim-skip-mark", text: "–" });
  cell.setAttr("aria-label", `${habit.name}, ${key}, atlandı`);
  cell.setAttr("title", "Atlandı; dokunarak geri al");
  if (!options.onSkip) return;
  cell.addClass("is-clickable");
  cell.setAttr("role", "button");
  cell.setAttr("tabindex", "0");
  const restore = (): void => {
    void options
      .onSkip?.(habit, key, false)
      .catch((error: unknown) => options.onError?.(error));
  };
  cell.onclick = restore;
  cell.onkeydown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      restore();
    }
  };
}

function renderNumericCell(
  cell: HTMLElement,
  habit: Habit,
  key: string,
  label: string,
  afterChange: (habit: Habit, date: string, value: number) => void,
  rerender?: () => void,
): void {
  const paint = (): void => {
    cell.empty();
    cell.removeClass("is-editing");

    const value = habit.log[key] ?? 0;
    const done = isDoneValue(habit, value);
    const targetHit = (habit.target ?? 0) > 0 && value >= (habit.target ?? 0);

    cell.createSpan({
      text: value > 0 ? formatValue(value) : "·",
      cls:
        "ritim-value" +
        (done ? " is-hit" : "") +
        (done && !targetHit ? " is-minimum" : "") +
        (value > 0 ? "" : " is-empty"),
    });
    cell.setAttr(
      "aria-label",
      `${habit.name}, ${label}, ${value} ${habit.unit ?? ""}, hedef ${habit.target ?? 0}` +
        (habit.minimum ? `, minimum ${habit.minimum}` : ""),
    );
    cell.setAttr("title", "Değeri düzenle");
  };

  const openEditor = (): void => {
    if (cell.hasClass("is-editing")) return;

    cell.empty();
    cell.addClass("is-editing");

    const input = cell.createEl("input", { cls: "ritim-input" });
    input.type = "text";
    input.inputMode = "decimal";
    input.enterKeyHint = "done";
    input.placeholder = habit.target ? String(habit.target) : "0";
    input.setAttr("aria-label", `${habit.name}, ${label} için değer`);

    const before = habit.log[key] ?? 0;
    input.value = before > 0 ? formatValue(before) : "";

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
          delete habit.log[key];
        } else if (Number.isFinite(parsed) && parsed > 0) {
          next = parsed;
          habit.log[key] = parsed;
        } else {
          paint();
          rerender?.();
          return;
        }
      }

      paint();
      if (save && next !== before) afterChange(habit, key, next);
      rerender?.();
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

    input.focus();
    input.select();
  };

  paint();
  cell.addClass("is-clickable");
  cell.setAttr("role", "button");
  cell.setAttr("tabindex", "0");
  cell.onclick = (event) => {
    event.stopPropagation();
    openEditor();
  };
  cell.onkeydown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openEditor();
    }
  };
}

function renderCheckCell(
  cell: HTMLElement,
  habit: Habit,
  key: string,
  label: string,
  afterChange: (habit: Habit, date: string, value: number) => void,
): void {
  const dot = cell.createSpan({ cls: "ritim-dot" });

  const paint = (done: boolean): void => {
    dot.toggleClass("is-done", done);
    dot.setText(done ? "✓" : "");
    cell.setAttr("aria-label", `${habit.name}, ${label}, ${done ? "yapıldı" : "yapılmadı"}`);
  };

  const toggle = (): void => {
    if (habit.log[key]) delete habit.log[key];
    else habit.log[key] = 1;
    const value = habit.log[key] ?? 0;
    paint(value > 0);
    afterChange(habit, key, value);
  };

  paint((habit.log[key] ?? 0) > 0);
  cell.addClass("is-clickable");
  cell.setAttr("role", "button");
  cell.setAttr("tabindex", "0");
  cell.onclick = toggle;
  cell.onkeydown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggle();
    }
  };
}
