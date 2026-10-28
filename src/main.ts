import {
  ItemView,
  Notice,
  Plugin,
  TFile,
  WorkspaceLeaf,
  normalizePath,
} from "obsidian";
import { addDays, todayLocal } from "./core/date";
import { ensureHabitDoc } from "./core/habit-doc";
import { formatHijri } from "./core/hijri";
import { createHabitId } from "./core/id";
import {
  deleteHabitNotes,
  normalizeHabitNotes,
  type HabitNotes,
} from "./core/notes";
import type { PrayerSlot } from "./core/prayer";
import {
  addPeriods,
  periodStart,
  type PeriodCadence,
} from "./core/period";
import { findPrayerHabit, PRAYER_HABITS } from "./core/prayer-habits";
import { appendQuickTodo, ensureQuickTodoFile } from "./core/quick-todo";
import {
  DEFAULT_SETTINGS,
  normalizeQuickTodoPath,
  normalizeSettings,
  type RitimSettings,
} from "./core/settings";
import { RitimStore } from "./core/store";
import { habitCadence, type Habit, type HabitCadence } from "./core/types";
import { CalendarModal } from "./ui/calendar-modal";
import { HabitDetailModal } from "./ui/habit-detail-modal";
import { ConfirmDeleteModal, HabitModal } from "./ui/habit-modal";
import { HabitQuickNoteModal } from "./ui/habit-quick-note-modal";
import { renderHabitList } from "./ui/list";
import { PeriodCalendarModal } from "./ui/period-calendar-modal";
import { PeriodDetailModal } from "./ui/period-detail-modal";
import { QuickTodoModal } from "./ui/quick-todo-modal";
import { SettingsModal } from "./ui/settings-modal";

const VIEW_TYPE_RITIM = "ritim-view";

class RitimView extends ItemView {
  private store: RitimStore | null = null;
  private endDate: string;
  private focusDate: string;
  private lastToday: string;
  private weekOffset = 0;
  private monthOffset = 0;

  constructor(
    leaf: WorkspaceLeaf,
    private readonly plugin: RitimPlugin,
  ) {
    super(leaf);
    const today = this.today;
    this.endDate = today;
    this.focusDate = today;
    this.lastToday = today;
  }

  private get today(): string {
    return todayLocal(this.plugin.settings.cutoffHour);
  }

  getViewType(): string {
    return VIEW_TYPE_RITIM;
  }

  getDisplayText(): string {
    return "Kalp Ritmi";
  }

  getIcon(): string {
    return "list-checks";
  }

  async onOpen(): Promise<void> {
    this.registerInterval(
      window.setInterval(() => {
        if (!this.store) return;
        if (this.syncToday()) this.render();
      }, 30_000),
    );
    await this.loadBoard();
  }

  async onClose(): Promise<void> {
    await this.store?.flush();
    this.store = null;
  }

  refreshFromSettings(): void {
    const today = this.today;
    const wasAtToday = this.endDate === this.lastToday;
    this.lastToday = today;
    if (wasAtToday) {
      this.endDate = today;
      this.focusDate = today;
    }

    if (this.store) this.render();
    else void this.loadBoard();
  }

  private syncToday(): boolean {
    const today = this.today;
    if (today === this.lastToday) return false;

    const wasAtToday = this.endDate === this.lastToday;
    this.lastToday = today;
    if (wasAtToday) {
      this.endDate = today;
      this.focusDate = today;
    }
    return true;
  }

  private async loadBoard(): Promise<void> {
    this.contentEl.empty();
    this.contentEl.addClass("ritim-root");
    this.contentEl.createDiv({ cls: "ritim-loading", text: "Yükleniyor…" });

    try {
      this.store = await RitimStore.open(this.app, this.today);
      this.endDate = this.today;
      this.focusDate = this.today;
      if (this.store.warning) {
        new Notice(`Kalp Ritmi: ${this.store.warning}`, 10000);
      }
      await this.ensureHabitDocs(this.store);
      this.render();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.contentEl.empty();
      this.contentEl.createEl("h2", { text: "Kalp Ritmi" });
      this.contentEl.createDiv({
        text: "Veri klasörü açılamadı. Ritim/ klasörüne yazma iznini kontrol et.",
      });
      this.contentEl.createEl("pre", { text: message, cls: "ritim-error-detail" });
      new Notice(`Kalp Ritmi: veriler açılamadı. ${message}`, 10000);
    }
  }

  private render(): void {
    if (!this.store) return;

    this.syncToday();
    const today = this.today;
    if (this.endDate > today) this.endDate = today;

    const activeHabits = this.store.habits.filter((habit) => !habit.archived);
    renderHabitList(this.contentEl, activeHabits, {
      today,
      endDate: this.endDate,
      focusDate: this.focusDate,
      days: this.plugin.settings.visibleDays,
      visibleWeeks: this.plugin.settings.visibleWeeks,
      visibleMonths: this.plugin.settings.visibleMonths,
      weekOffset: this.weekOffset,
      monthOffset: this.monthOffset,
      weekStart: this.plugin.settings.weekStart,
      onChange: async (habit, date, value) => {
        if (!this.store) return;
        await this.store.setValue(habit, date, value);
      },
      onNavigate: (deltaDays) => {
        this.endDate = addDays(this.endDate, deltaDays);
        if (this.endDate > today) this.endDate = today;
        this.focusDate = this.endDate;
        this.render();
      },
      onToday: () => {
        this.endDate = today;
        this.focusDate = today;
        this.render();
      },
      onAdd: () => this.openHabitModal(null, "daily"),
      onAddCadence: (cadence) => this.openHabitModal(null, cadence),
      onEdit: (habit) => this.openHabitModal(habit),
      onHabitCalendar: (habit) => this.openHabitCalendar(habit),
      onHabitDetail: (habit) => this.openHabitDetail(habit),
      onPeriodDetail: (habit) => this.openPeriodDetail(habit),
      onDelete: (habit) => this.openDeleteHabit(habit),
      onSkip: (habit, date, skipped) => this.toggleSkip(habit, date, skipped),
      onQuickNote: (habit) => this.openQuickNote(habit),
      onHabitDoc: (habit) => void this.openHabitDoc(habit),
      onPeriodNavigate: (cadence, delta) => this.navigatePeriod(cadence, delta),
      onPeriodToday: (cadence) => this.resetPeriod(cadence),
      onCalendar: () => this.openCalendar(),
      onSettings: () => this.openSettings(),
      onQuickTodo: () => this.openQuickTodo(),
      hasArchived: this.store.habits.some((habit) => habit.archived),
      onError: (error) => {
        const message = error instanceof Error ? error.message : String(error);
        new Notice(`Kalp Ritmi: kaydedilemedi, değişiklik geri alındı. ${message}`, 10000);
        this.render();
      },
      hijriDate: this.plugin.settings.hijriEnabled
        ? formatHijri(today, this.plugin.settings.hijriOffset)
        : undefined,
      prayer: this.plugin.settings.prayerEnabled
        ? {
            city: this.plugin.settings.prayerCity,
            config: {
              latitude: this.plugin.settings.prayerLatitude,
              longitude: this.plugin.settings.prayerLongitude,
              method: this.plugin.settings.prayerMethod,
              madhab: this.plugin.settings.prayerMadhab,
            },
            onToggle: (slot) => this.togglePrayer(slot),
          }
        : undefined,
    });
  }

  private async togglePrayer(slot: PrayerSlot): Promise<void> {
    const store = this.store;
    if (!store) return;

    const date = this.today;
    let habit = findPrayerHabit(
      store.habits.filter((item) => !item.archived),
      slot.key,
    );
    let created = false;
    let restored = false;

    try {
      if (!habit) {
        const archived = findPrayerHabit(
          store.habits.filter((item) => item.archived),
          slot.key,
        );
        if (archived) {
          await store.setArchived(archived, false);
          habit = archived;
          restored = true;
        }
      }

      if (!habit) {
        let docPath: string | undefined;
        try {
          docPath = await ensureHabitDoc(
            this.app,
            this.plugin.settings.habitDocFolder,
            PRAYER_HABITS[slot.key].name,
          );
        } catch {
          new Notice("Kalp Ritmi: namaz notu oluşturulamadı; namaz yine de eklenecek.", 8000);
        }
        habit = await store.addHabit({
          ...PRAYER_HABITS[slot.key],
          createdAt: date,
          docPath,
        });
        created = true;
      }

      const done = (habit.log[date] ?? 0) > 0;
      await store.setValue(habit, date, done ? 0 : 1);
      if (restored) new Notice("Namaz alışkanlığı arşivden geri alındı.");
    } catch (error) {
      if (created && habit) {
        try {
          await store.deleteHabit(habit);
        } catch {
          // The empty habit can stay if the cleanup itself fails.
        }
      }
      const message = error instanceof Error ? error.message : String(error);
      new Notice(`Kalp Ritmi: namaz kaydedilemedi. ${message}`, 10000);
    }

    this.render();
  }

  private async toggleSkip(
    habit: Habit,
    date: string,
    skipped: boolean,
  ): Promise<void> {
    const store = this.store;
    if (!store) return;
    if (skipped) await store.setSkip(habit, date);
    else await store.clearSkip(habit, date);
    this.render();
  }

  private openQuickTodo(): void {
    const path = normalizeQuickTodoPath(this.plugin.settings.quickTodoPath);
    new QuickTodoModal(this.app, {
      path,
      onAdd: async (text) => {
        await appendQuickTodo(this.app, path, text);
      },
      onOpen: async () => {
        await this.openQuickTodoFile(path);
      },
    }).open();
  }

  private async openQuickTodoFile(path: string): Promise<void> {
    const file = await ensureQuickTodoFile(this.app, path);
    const leaf = this.app.workspace.getLeaf("tab");
    await leaf.openFile(file);
    await this.app.workspace.revealLeaf(leaf);
  }

  private openCalendar(): void {
    new CalendarModal(this.app, {
      today: this.today,
      selected: this.focusDate,
      weekStart: this.plugin.settings.weekStart,
      onPick: (date) => this.jumpToDate(date),
    }).open();
  }

  private async ensureHabitDocs(store: RitimStore): Promise<void> {
    const missing = store.habits.filter((habit) => !habit.archived && !habit.docPath);
    if (missing.length === 0) return;

    let failed = 0;
    for (const habit of missing) {
      try {
        const docPath = await ensureHabitDoc(
          this.app,
          this.plugin.settings.habitDocFolder,
          habit.name,
        );
        await store.updateHabit(habit, { docPath });
      } catch {
        failed++;
      }
    }

    if (failed > 0) {
      new Notice(
        `Kalp Ritmi: ${failed} alışkanlık için Markdown dosyası oluşturulamadı. Ayarlardaki MD klasörünü kontrol et.`,
        10000,
      );
    }
  }

  private async openHabitDoc(habit: Habit): Promise<void> {
    const store = this.store;
    if (!store) return;

    try {
      const path = await ensureHabitDoc(
        this.app,
        this.plugin.settings.habitDocFolder,
        habit.name,
        habit.docPath,
      );
      if (habit.docPath !== path) {
        await store.updateHabit(habit, { docPath: path });
      }

      const file = this.app.vault.getAbstractFileByPath(path);
      if (!(file instanceof TFile)) {
        throw new Error(`${path} bir dosya değil.`);
      }

      const leaf = this.app.workspace.getLeaf("tab");
      await leaf.openFile(file);
      await this.app.workspace.revealLeaf(leaf);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      new Notice(`Kalp Ritmi: Markdown dosyası açılamadı. ${message}`, 10000);
    }
  }

  private openHabitDetail(habit: Habit): void {
    new HabitDetailModal(this.app, {
      habit,
      today: this.today,
      weekStart: this.plugin.settings.weekStart,
      onCalendar: () => this.openHabitCalendar(habit),
    }).open();
  }

  private openPeriodDetail(habit: Habit): void {
    new PeriodDetailModal(this.app, {
      habit,
      today: this.today,
      weekStart: this.plugin.settings.weekStart,
      onCalendar: () => this.openHabitCalendar(habit),
    }).open();
  }

  private openQuickNote(habit: Habit): void {
    new HabitQuickNoteModal(this.app, {
      habitName: habit.name,
      notes: this.plugin.notes[habit.id] ?? [],
      onSave: async (notes) => {
        await this.plugin.setHabitNotes(habit.id, notes);
      },
    }).open();
  }

  private openDeleteHabit(habit: Habit): void {
    if (!this.store) return;

    new ConfirmDeleteModal(this.app, habit.name, async () => {
      await this.deleteHabit(habit);
    }).open();
  }

  private async deleteHabit(habit: Habit): Promise<void> {
    const store = this.store;
    if (!store) return;

    await store.deleteHabit(habit);
    try {
      await this.plugin.removeHabitNotes(habit.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      new Notice(`Kalp Ritmi: alışkanlık notları temizlenemedi. ${message}`, 10000);
    }
    this.render();
  }

  private navigatePeriod(cadence: PeriodCadence, delta: 1 | -1): void {
    if (cadence === "weekly") {
      this.weekOffset = Math.max(0, this.weekOffset + delta);
    } else {
      this.monthOffset = Math.max(0, this.monthOffset + delta);
    }
    this.render();
  }

  private resetPeriod(cadence: PeriodCadence): void {
    if (cadence === "weekly") this.weekOffset = 0;
    else this.monthOffset = 0;
    this.render();
  }

  private openHabitCalendar(habit: Habit): void {
    const cadence = habitCadence(habit);
    if (cadence === "daily") {
      new CalendarModal(this.app, {
        today: this.today,
        selected: this.focusDate,
        weekStart: this.plugin.settings.weekStart,
        habit,
        onPick: (date) => this.jumpToDate(date),
        onSetValue: (date, value) => {
          const store = this.store;
          return store ? store.setValue(habit, date, value) : Promise.resolve();
        },
        onChanged: () => this.render(),
      }).open();
      return;
    }

    new PeriodCalendarModal(this.app, {
      habit,
      today: this.today,
      weekStart: this.plugin.settings.weekStart,
      onPick: (start) => this.jumpToPeriod(cadence, start),
    }).open();
  }

  private jumpToPeriod(cadence: PeriodCadence, start: string): void {
    const current = periodStart(
      this.today,
      cadence,
      this.plugin.settings.weekStart,
    );
    if (start > current) return;

    let offset = 0;
    let cursor = start;
    while (cursor < current && offset < 10000) {
      cursor = addPeriods(cursor, 1, cadence);
      offset++;
    }

    if (cadence === "weekly") this.weekOffset = offset;
    else this.monthOffset = offset;
    this.render();
  }

  private jumpToDate(date: string): void {
    const today = this.today;
    if (date > today) return;

    const middle = Math.floor((this.plugin.settings.visibleDays - 1) / 2);
    const centered = addDays(date, middle);
    this.endDate = centered > today ? today : centered;
    this.focusDate = date;
    this.render();
  }

  private openSettings(): void {
    const store = this.store;
    if (!store) return;

    new SettingsModal(this.app, this.plugin.settings, {
      onSave: async (next) => {
        await this.plugin.saveSettings(next);
      },
      archivedHabits: store.habits.filter((habit) => habit.archived),
      onUnarchive: async (habit) => {
        await store.setArchived(habit, false);
        this.render();
      },
    }).open();
  }

  private openHabitModal(
    habit: Habit | null,
    initialCadence: HabitCadence = "daily",
  ): void {
    const store = this.store;
    if (!store) return;
    const activeHabits = store.habits.filter((item) => !item.archived);
    const index = habit ? activeHabits.indexOf(habit) : -1;

    new HabitModal(this.app, habit, {
      onSave: async (draft) => {
        let docPath = draft.docPath?.trim();
        if (!docPath) {
          try {
            docPath = await ensureHabitDoc(
              this.app,
              this.plugin.settings.habitDocFolder,
              draft.name,
            );
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            new Notice(
              `Kalp Ritmi: Markdown dosyası oluşturulamadı; alışkanlık dosyasız kaydedilecek. ${message}`,
              10000,
            );
          }
        }
        const nextDraft = { ...draft, docPath };

        if (habit) {
          await store.updateHabit(habit, nextDraft);
        } else {
          await store.addHabit({
            ...nextDraft,
            id: createHabitId(),
            createdAt: this.today,
          });
          this.endDate = this.today;
          this.focusDate = this.today;
        }
        this.render();
      },
      onDelete: habit
        ? async () => {
            await this.deleteHabit(habit);
          }
        : undefined,
      onArchive: habit
        ? async () => {
            await store.setArchived(habit, true);
            this.render();
          }
        : undefined,
      position:
        habit && index >= 0
          ? { index, total: activeHabits.length }
          : undefined,
      onMove:
        habit && index >= 0
          ? async (direction) => {
              const moved = await store.moveHabit(habit, direction);
              if (!moved) throw new Error("Alışkanlık bulunamadı.");
              this.render();
            }
          : undefined,
      habits: activeHabits.filter(
        (candidate) =>
          habitCadence(candidate) === "daily" &&
          candidate.id !== habit?.id,
      ),
    }, initialCadence).open();
  }
}

export default class RitimPlugin extends Plugin {
  settings: RitimSettings = DEFAULT_SETTINGS;
  notes: HabitNotes = {};

  async onload(): Promise<void> {
    await this.loadSettings();
    this.registerView(VIEW_TYPE_RITIM, (leaf) => new RitimView(leaf, this));
    this.app.workspace.onLayoutReady(() => {
      this.removeSidebarViews();
      if (this.settings.openBoardOnStartup) void this.activateView();
    });

    this.addRibbonIcon("list-checks", "Kalp Ritmi: panoyu aç", () => {
      void this.activateView();
    });

    this.addCommand({
      id: "open-board",
      name: "Panoyu aç",
      callback: () => {
        void this.activateView();
      },
    });

    this.addCommand({
      id: "open-board-tab",
      name: "Panoyu yeni sekmede aç",
      callback: () => {
        void this.openInNewTab();
      },
    });
  }

  onunload(): void {
    // Views registered with registerView are detached by Obsidian.
  }

  async saveSettings(next: RitimSettings): Promise<void> {
    const settings = normalizeSettings(next);
    await this.saveData({ ...settings, quickNotes: this.notes });
    this.settings = settings;
    this.refreshViews();
  }

  async setHabitNotes(habitId: string, notes: HabitNotes[string]): Promise<void> {
    const clean = normalizeHabitNotes({ [habitId]: notes });
    const next = { ...this.notes };
    if (clean[habitId]) next[habitId] = clean[habitId];
    else delete next[habitId];
    await this.persistNotes(next);
  }

  async removeHabitNotes(habitId: string): Promise<void> {
    const next = deleteHabitNotes(this.notes, habitId);
    if (next === this.notes) return;
    await this.persistNotes(next);
  }

  private async persistNotes(next: HabitNotes): Promise<void> {
    const previous = this.notes;
    this.notes = next;
    try {
      await this.saveData({ ...this.settings, quickNotes: this.notes });
    } catch (error) {
      this.notes = previous;
      throw error;
    }
  }

  private async loadSettings(): Promise<void> {
    const raw = (await this.loadData()) as Record<string, unknown> | null;
    this.settings = normalizeSettings(raw);
    this.notes = normalizeHabitNotes(raw?.quickNotes);
  }

  private refreshViews(): void {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_RITIM)) {
      const view = leaf.view;
      if (view instanceof RitimView) view.refreshFromSettings();
    }
  }

  private isSidebarLeaf(leaf: WorkspaceLeaf): boolean {
    const root = leaf.getRoot();
    if (root === this.app.workspace.leftSplit || root === this.app.workspace.rightSplit) {
      return true;
    }
    return (
      leaf.view.containerEl.closest(
        ".workspace-drawer, .workspace-split.mod-left-split, .workspace-split.mod-right-split",
      ) !== null
    );
  }

  private removeSidebarViews(): void {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_RITIM)) {
      if (this.isSidebarLeaf(leaf)) leaf.detach();
    }
  }

  private collapseSidebars(): void {
    this.app.workspace.leftSplit.collapse();
    this.app.workspace.rightSplit.collapse();
  }

  private async activateView(): Promise<void> {
    const { workspace } = this.app;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE_RITIM);
    let leaf = leaves.find((candidate) => !this.isSidebarLeaf(candidate)) ?? null;

    // Views restored from an older workspace may still live in a sidebar.
    // Remove those copies so Kalp Ritmi always opens in the main workspace.
    this.removeSidebarViews();

    if (!leaf) {
      leaf = workspace.getLeaf("tab");
      await leaf.setViewState({ type: VIEW_TYPE_RITIM, active: true });
    }

    await workspace.revealLeaf(leaf);
    this.collapseSidebars();
  }

  private async openInNewTab(): Promise<void> {
    this.removeSidebarViews();
    const leaf = this.app.workspace.getLeaf("tab");
    await leaf.setViewState({ type: VIEW_TYPE_RITIM, active: true });
    await this.app.workspace.revealLeaf(leaf);
    this.collapseSidebars();
  }
}
