import { App, TFile, TFolder, normalizePath } from "obsidian";
import { todayLocal } from "./date";
import { normalizeDayPart } from "./day-part";
import { normalizeIntervalDays } from "./schedule";
import { starterHabits } from "./starter";
import type {
  Habit,
  HabitCadence,
  HabitChanges,
  HabitDefinition,
  HabitKind,
} from "./types";

const DATA_FOLDER = "Ritim";
const LOG_FOLDER = "Ritim/log";
const HABITS_FILE = "Ritim/habits.json";

interface LogLine {
  h: string;
  d: string;
  v: number;
  s?: string;
  ts?: number;
}

/** Vault-backed habit storage.
 *
 *  - Ritim/habits.json       habit definitions
 *  - Ritim/log/YYYY-MM.ndjson one append-only line per edit
 *
 *  Logs are append-only so two devices writing to a synced vault do not
 *  overwrite each other's history. The newest timestamp wins per habit/day. */
export class RitimStore {
  habits: Habit[] = [];
  warning: string | null = null;

  private writeQueue: Promise<unknown> = Promise.resolve();

  private constructor(
    private readonly app: App,
    private readonly today: string,
  ) {}

  static async open(app: App, today = todayLocal()): Promise<RitimStore> {
    const store = new RitimStore(app, today);
    await store.ensureFolders();
    await store.loadDefinitions();
    await store.loadLogs();
    return store;
  }

  async setValue(habit: Habit, date: string, value: number): Promise<void> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Geçersiz tarih.");
    if (!Number.isFinite(value) || value < 0) throw new Error("Geçersiz değer.");

    const previous = habit.log[date];
    const previousSkip = habit.skips?.[date];
    if (value > 0) habit.log[date] = value;
    else delete habit.log[date];
    if (habit.skips) delete habit.skips[date];

    try {
      await this.enqueue(() => this.appendLog(habit.id, date, value));
    } catch (error) {
      if (previous === undefined) delete habit.log[date];
      else habit.log[date] = previous;
      if (previousSkip !== undefined) {
        habit.skips ??= {};
        habit.skips[date] = previousSkip;
      }
      throw error;
    }
  }

  async setSkip(habit: Habit, date: string, reason = ""): Promise<void> {
    this.assertDate(date);
    const previous = habit.log[date];
    const previousSkip = habit.skips?.[date];
    delete habit.log[date];
    habit.skips ??= {};
    habit.skips[date] = reason.trim();

    try {
      await this.enqueue(() => this.appendLog(habit.id, date, 0, reason.trim()));
    } catch (error) {
      if (previous === undefined) delete habit.log[date];
      else habit.log[date] = previous;
      if (previousSkip === undefined) delete habit.skips?.[date];
      else habit.skips[date] = previousSkip;
      throw error;
    }
  }

  async clearSkip(habit: Habit, date: string): Promise<void> {
    this.assertDate(date);
    const previousSkip = habit.skips?.[date];
    if (previousSkip === undefined) return;
    delete habit.skips?.[date];

    try {
      await this.enqueue(() => this.appendLog(habit.id, date, 0));
    } catch (error) {
      habit.skips ??= {};
      habit.skips[date] = previousSkip;
      throw error;
    }
  }

  /** Wait for queued writes (used when the view closes). */
  async flush(): Promise<void> {
    await this.writeQueue;
  }

  async addHabit(definition: HabitDefinition): Promise<Habit> {
    if (this.habits.some((habit) => habit.id === definition.id)) {
      throw new Error("Bu alışkanlık kimliği zaten kullanılıyor.");
    }

    const habit: Habit = { ...definition, log: {} };
    this.habits.push(habit);

    try {
      await this.enqueue(() => this.writeDefinitions());
    } catch (error) {
      this.habits = this.habits.filter((item) => item !== habit);
      throw error;
    }
    return habit;
  }

  async updateHabit(habit: Habit, changes: HabitChanges): Promise<void> {
    const previous: Habit = { ...habit };
    Object.assign(habit, changes);

    try {
      await this.enqueue(() => this.writeDefinitions());
    } catch (error) {
      Object.assign(habit, previous);
      throw error;
    }
  }

  async setArchived(habit: Habit, archived: boolean): Promise<void> {
    const previous = habit.archived;
    if (archived) habit.archived = true;
    else delete habit.archived;

    try {
      await this.enqueue(() => this.writeDefinitions());
    } catch (error) {
      if (previous) habit.archived = previous;
      else delete habit.archived;
      throw error;
    }
  }

  /** Moves a habit one active place up or down, skipping archived habits. */
  async moveHabit(habit: Habit, direction: -1 | 1): Promise<boolean> {
    const index = this.habits.indexOf(habit);
    if (index < 0) return false;

    let target = index + direction;
    while (
      target >= 0 &&
      target < this.habits.length &&
      this.habits[target].archived
    ) {
      target += direction;
    }
    if (target < 0 || target >= this.habits.length) return false;

    const other = this.habits[target];
    this.habits[index] = other;
    this.habits[target] = habit;

    try {
      await this.enqueue(() => this.writeDefinitions());
    } catch (error) {
      this.habits[index] = habit;
      this.habits[target] = other;
      throw error;
    }
    return true;
  }

  async deleteHabit(habit: Habit): Promise<void> {
    const index = this.habits.indexOf(habit);
    if (index < 0) return;

    this.habits.splice(index, 1);
    try {
      await this.enqueue(() => this.writeDefinitions());
    } catch (error) {
      this.habits.splice(index, 0, habit);
      throw error;
    }
  }

  private assertDate(date: string): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Geçersiz tarih.");
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.writeQueue.then(task, task);
    this.writeQueue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private async ensureFolders(): Promise<void> {
    await this.ensureFolder(DATA_FOLDER);
    await this.ensureFolder(LOG_FOLDER);
  }

  private async ensureFolder(path: string): Promise<void> {
    const existing = this.app.vault.getAbstractFileByPath(normalizePath(path));
    if (existing instanceof TFolder) return;
    if (existing) throw new Error(`${path} bir klasör değil.`);
    await this.app.vault.createFolder(normalizePath(path));
  }

  private async loadDefinitions(): Promise<void> {
    const path = normalizePath(HABITS_FILE);
    const file = this.app.vault.getAbstractFileByPath(path);

    if (!file) {
      const seeded = starterHabits(this.today);
      this.habits = seeded;
      await this.writeDefinitions();
      return;
    }

    if (!(file instanceof TFile)) {
      this.habits = starterHabits(this.today);
      this.warning = `${HABITS_FILE} bir dosya değil; başlangıç listesi geçici olarak yüklendi.`;
      return;
    }

    try {
      const raw: unknown = JSON.parse(await this.app.vault.read(file));
      if (!Array.isArray(raw)) throw new Error("Liste bekleniyordu.");
      const definitions: HabitDefinition[] = [];
      const seen = new Set<string>();
      for (const item of raw) {
        const definition = parseDefinition(item);
        if (!definition || seen.has(definition.id)) continue;
        seen.add(definition.id);
        definitions.push(definition);
      }
      this.habits = definitions.map((definition) => ({ ...definition, log: {} }));
      if (definitions.length !== raw.length) {
        this.warning = `${HABITS_FILE} içindeki bazı kayıtlar okunamadı veya yinelendi.`;
      }
    } catch (error) {
      this.habits = starterHabits(this.today);
      this.warning =
        `${HABITS_FILE} okunamadı. Dosya korunuyor; başlangıç listesi geçici olarak açıldı. ` +
        (error instanceof Error ? error.message : "");
    }
  }

  private async writeDefinitions(): Promise<void> {
    const definitions: HabitDefinition[] = this.habits.map(
      ({ log: _log, skips: _skips, ...definition }) => definition,
    );
    await this.writeTextFile(HABITS_FILE, JSON.stringify(definitions, null, 2) + "\n");
  }

  private async loadLogs(): Promise<void> {
    const folder = this.app.vault.getAbstractFileByPath(normalizePath(LOG_FOLDER));
    if (!(folder instanceof TFolder)) return;

    const byHabit = new Map(this.habits.map((habit) => [habit.id, habit]));
    const newest = new Map<string, LogLine>();

    for (const child of folder.children) {
      if (!(child instanceof TFile) || !child.name.endsWith(".ndjson")) continue;

      let text: string;
      try {
        text = await this.app.vault.read(child);
      } catch {
        this.warning = `${child.path} okunamadı.`;
        continue;
      }

      for (const line of text.split("\n")) {
        if (!line.trim()) continue;
        const parsed = parseLogLine(line);
        if (!parsed) continue;

        const key = `${parsed.h}|${parsed.d}`;
        const previous = newest.get(key);
        if (!previous || (parsed.ts ?? 0) >= (previous.ts ?? 0)) newest.set(key, parsed);
      }
    }

    for (const entry of newest.values()) {
      const habit = byHabit.get(entry.h);
      if (!habit) continue;
      if (entry.s !== undefined) {
        delete habit.log[entry.d];
        habit.skips ??= {};
        habit.skips[entry.d] = entry.s;
      } else if (entry.v > 0) {
        habit.log[entry.d] = entry.v;
        if (habit.skips) delete habit.skips[entry.d];
      } else {
        delete habit.log[entry.d];
        if (habit.skips) delete habit.skips[entry.d];
      }
    }
  }

  private async appendLog(
    habitId: string,
    date: string,
    value: number,
    skip?: string,
  ): Promise<void> {
    const path = normalizePath(`${LOG_FOLDER}/${date.slice(0, 7)}.ndjson`);
    const line: LogLine = { h: habitId, d: date, v: value, ts: Date.now() };
    if (skip !== undefined) line.s = skip;
    const contents = JSON.stringify(line) + "\n";

    const existing = this.app.vault.getAbstractFileByPath(path);
    if (existing instanceof TFile) {
      await this.app.vault.append(existing, contents);
    } else if (existing) {
      throw new Error(`${path} bir dosya değil.`);
    } else {
      await this.app.vault.create(path, contents);
    }
  }

  private async writeTextFile(path: string, contents: string): Promise<void> {
    const normalized = normalizePath(path);
    const existing = this.app.vault.getAbstractFileByPath(normalized);

    if (existing instanceof TFile) {
      await this.app.vault.process(existing, () => contents);
    } else if (existing) {
      throw new Error(`${path} bir dosya değil.`);
    } else {
      await this.app.vault.create(normalized, contents);
    }
  }
}

function parseDefinition(raw: unknown): HabitDefinition | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;

  if (typeof value.id !== "string" || !value.id.trim()) return null;
  if (typeof value.name !== "string" || !value.name.trim()) return null;

  const kind: HabitKind =
    value.kind === "numeric" || value.kind === "quit" ? value.kind : "check";
  const cadence: HabitCadence =
    value.cadence === "weekly" || value.cadence === "monthly"
      ? value.cadence
      : "daily";

  const target =
    typeof value.target === "number" && Number.isFinite(value.target) && value.target > 0
      ? value.target
      : undefined;
  const weeklyGoal =
    typeof value.weeklyGoal === "number" &&
    Number.isFinite(value.weeklyGoal) &&
    value.weeklyGoal > 0
      ? value.weeklyGoal
      : undefined;
  const createdAt =
    typeof value.createdAt === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value.createdAt)
      ? value.createdAt
      : undefined;
  const docPath =
    typeof value.docPath === "string" && value.docPath.trim()
      ? value.docPath.trim()
      : undefined;
  const minimum =
    typeof value.minimum === "number" && Number.isFinite(value.minimum) && value.minimum > 0
      ? value.minimum
      : undefined;
  const quickValue =
    typeof value.quickValue === "number" &&
    Number.isFinite(value.quickValue) &&
    value.quickValue > 0
      ? value.quickValue
      : undefined;
  const pausedFrom =
    typeof value.pausedFrom === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.pausedFrom)
      ? value.pausedFrom
      : undefined;
  const pausedUntil =
    typeof value.pausedUntil === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.pausedUntil)
      ? value.pausedUntil
      : undefined;
  const pause =
    pausedFrom && pausedUntil && pausedFrom <= pausedUntil
      ? { pausedFrom, pausedUntil }
      : {};
  const stackAfter =
    typeof value.stackAfter === "string" && value.stackAfter.trim()
      ? value.stackAfter.trim()
      : undefined;

  return {
    id: value.id,
    name: value.name,
    emoji: typeof value.emoji === "string" ? value.emoji : "•",
    kind,
    cadence,
    unit: typeof value.unit === "string" ? value.unit : undefined,
    target,
    weeklyGoal,
    scheduleDays: parseScheduleDays(value.scheduleDays),
    intervalDays: normalizeIntervalDays(
      typeof value.intervalDays === "number" ? value.intervalDays : undefined,
    ),
    minimum,
    quickValue,
    ...pause,
    stackAfter,
    dayPart: normalizeDayPart(value.dayPart),
    color: typeof value.color === "string" ? value.color : "#c06a7a",
    createdAt,
    docPath,
    archived: value.archived === true ? true : undefined,
  };
}

function parseScheduleDays(raw: unknown): number[] | undefined {
  if (!Array.isArray(raw)) return undefined;

  const days = new Set<number>();
  for (const item of raw) {
    if (typeof item === "number" && Number.isInteger(item) && item >= 0 && item <= 6) {
      days.add(item);
    }
  }

  if (days.size === 0 || days.size === 7) return undefined;
  return [...days].sort((a, b) => a - b);
}

function parseLogLine(line: string): LogLine | null {
  try {
    const raw: unknown = JSON.parse(line);
    if (!raw || typeof raw !== "object") return null;

    const value = raw as Record<string, unknown>;
    if (typeof value.h !== "string" || typeof value.d !== "string") return null;
    if (typeof value.v !== "number" || !Number.isFinite(value.v)) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value.d)) return null;

    return {
      h: value.h,
      d: value.d,
      v: Math.max(0, value.v),
      s: typeof value.s === "string" ? value.s : undefined,
      ts: typeof value.ts === "number" && Number.isFinite(value.ts) ? value.ts : 0,
    };
  } catch {
    return null;
  }
}
