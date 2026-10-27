import { beforeEach, describe, expect, it } from "vitest";

import { TFile, TFolder } from "obsidian";
import type { App } from "obsidian";
import { RitimStore } from "./store";

class FakeVault {
  files = new Map<string, string>();
  folders = new Set<string>();

  getAbstractFileByPath(path: string): TFile | TFolder | null {
    if (this.files.has(path)) {
      return new TFile(path, path.split("/").pop() ?? path);
    }
    if (this.folders.has(path)) {
      const folder = new TFolder(path);
      const prefix = path + "/";
      folder.children = [...this.files.keys()]
        .filter((file) => file.startsWith(prefix) && !file.slice(prefix.length).includes("/"))
        .map((file) => new TFile(file, file.split("/").pop() ?? file));
      return folder;
    }
    return null;
  }

  async createFolder(path: string): Promise<TFolder> {
    if (this.folders.has(path)) throw new Error("already exists");
    this.folders.add(path);
    return new TFolder(path);
  }

  async create(path: string, data: string): Promise<TFile> {
    if (this.files.has(path)) throw new Error("already exists");
    this.files.set(path, data);
    return new TFile(path, path.split("/").pop() ?? path);
  }

  async read(file: TFile): Promise<string> {
    return this.files.get(file.path) ?? "";
  }

  async process(file: TFile, fn: (data: string) => string): Promise<string> {
    const next = fn(this.files.get(file.path) ?? "");
    this.files.set(file.path, next);
    return next;
  }

  async append(file: TFile, data: string): Promise<void> {
    this.files.set(file.path, (this.files.get(file.path) ?? "") + data);
  }

  async delete(file: TFile): Promise<void> {
    this.files.delete(file.path);
  }
}

function appWith(vault: FakeVault): App {
  return { vault } as unknown as App;
}

describe("RitimStore", () => {
  let vault: FakeVault;

  beforeEach(() => {
    vault = new FakeVault();
  });

  it("seeds starter habits on first open", async () => {
    const store = await RitimStore.open(appWith(vault));

    expect(store.habits).toHaveLength(4);
    expect(store.habits.every((habit) => Object.keys(habit.log).length === 0)).toBe(true);
    expect(vault.files.has("Ritim/habits.json")).toBe(true);
    expect(vault.folders.has("Ritim/log")).toBe(true);

    const definitions = JSON.parse(vault.files.get("Ritim/habits.json") ?? "[]") as unknown[];
    expect(definitions).toHaveLength(4);
    expect(definitions[0]).not.toHaveProperty("log");
  });

  it("uses the supplied logical today when seeding", async () => {
    const store = await RitimStore.open(appWith(vault), "2026-10-25");

    expect(store.habits.every((habit) => habit.createdAt === "2026-10-25")).toBe(true);
  });

  it("persists and reloads logs", async () => {
    const app = appWith(vault);
    const store = await RitimStore.open(app);
    const dhikr = store.habits[0];

    await store.setValue(dhikr, "2026-10-24", 111);
    await store.setValue(dhikr, "2026-10-25", 111);
    await store.setValue(dhikr, "2026-10-26", 5);

    const log = vault.files.get("Ritim/log/2026-10.ndjson") ?? "";
    expect(log.trim().split("\n")).toHaveLength(3);

    const reopened = await RitimStore.open(app);
    expect(reopened.habits[0].log).toEqual({
      "2026-10-24": 111,
      "2026-10-25": 111,
      "2026-10-26": 5,
    });
  });

  it("treats a zero value as a deletion", async () => {
    const app = appWith(vault);
    const store = await RitimStore.open(app);
    const dhikr = store.habits[0];

    await store.setValue(dhikr, "2026-10-26", 111);
    await store.setValue(dhikr, "2026-10-26", 0);

    const reopened = await RitimStore.open(app);
    expect(reopened.habits[0].log["2026-10-26"]).toBeUndefined();
  });

  it("lets the newest timestamp win for the same habit/day", async () => {
    const app = appWith(vault);
    const store = await RitimStore.open(app);
    const dhikr = store.habits[0];

    await store.setValue(dhikr, "2026-10-26", 111);

    const path = "Ritim/log/2026-10.ndjson";
    const newer = JSON.stringify({
      h: dhikr.id,
      d: "2026-10-26",
      v: 222,
      ts: Date.now() + 10_000,
    });
    vault.files.set(path, (vault.files.get(path) ?? "") + newer + "\n");

    const reopened = await RitimStore.open(app);
    expect(reopened.habits[0].log["2026-10-26"]).toBe(222);
  });

  it("adds, updates and deletes habit definitions", async () => {
    const app = appWith(vault);
    const store = await RitimStore.open(app);

    await store.addHabit({
      id: "test-habit",
      name: "Test",
      emoji: "•",
      kind: "check",
      color: "#000000",
      createdAt: "2026-10-26",
    });
    expect(store.habits).toHaveLength(5);

    const added = store.habits[4];
    await store.updateHabit(added, {
      name: "Test 2",
      kind: "numeric",
      target: 5,
      weeklyGoal: 30,
      scheduleDays: [1, 3, 5],
      docPath: "Notlar/Test 2.md",
    });
    expect(added.name).toBe("Test 2");
    expect(added.target).toBe(5);
    expect(added.weeklyGoal).toBe(30);
    expect(added.scheduleDays).toEqual([1, 3, 5]);
    expect(added.docPath).toBe("Notlar/Test 2.md");

    const reopened = await RitimStore.open(app);
    expect(reopened.habits).toHaveLength(5);
    expect(reopened.habits[4].name).toBe("Test 2");
    expect(reopened.habits[4].target).toBe(5);
    expect(reopened.habits[4].weeklyGoal).toBe(30);
    expect(reopened.habits[4].scheduleDays).toEqual([1, 3, 5]);
    expect(reopened.habits[4].docPath).toBe("Notlar/Test 2.md");
    expect(reopened.habits[4].log).toEqual({});

    await reopened.deleteHabit(reopened.habits[4]);
    expect(reopened.habits).toHaveLength(4);

    const reopenedAgain = await RitimStore.open(app);
    expect(reopenedAgain.habits.map((habit) => habit.id)).not.toContain("test-habit");
  });

  it("persists weekly and monthly cadence", async () => {
    const app = appWith(vault);
    const store = await RitimStore.open(app);

    await store.addHabit({
      id: "weekly",
      name: "Haftalık",
      emoji: "•",
      kind: "check",
      cadence: "weekly",
      color: "#000000",
      createdAt: "2026-10-26",
    });
    await store.addHabit({
      id: "monthly",
      name: "Aylık",
      emoji: "•",
      kind: "numeric",
      cadence: "monthly",
      target: 4,
      color: "#000000",
      createdAt: "2026-10-26",
    });

    const reopened = await RitimStore.open(app);
    expect(reopened.habits.find((habit) => habit.id === "weekly")?.cadence).toBe("weekly");
    expect(reopened.habits.find((habit) => habit.id === "monthly")?.cadence).toBe("monthly");
    expect(reopened.habits[0].cadence).toBe("daily");
  });

  it("moves habits and persists the new order", async () => {
    const app = appWith(vault);
    const store = await RitimStore.open(app);
    const first = store.habits[0];
    const second = store.habits[1];

    await expect(store.moveHabit(first, 1)).resolves.toBe(true);
    expect(store.habits[0]).toBe(second);
    expect(store.habits[1]).toBe(first);
    await expect(store.moveHabit(store.habits[0], -1)).resolves.toBe(false);
    await expect(store.moveHabit(store.habits[store.habits.length - 1], 1)).resolves.toBe(false);

    const reopened = await RitimStore.open(app);
    expect(reopened.habits[0].id).toBe(second.id);
    expect(reopened.habits[1].id).toBe(first.id);
  });

  it("skips archived habits while reordering", async () => {
    const app = appWith(vault);
    const store = await RitimStore.open(app);
    const first = store.habits[0];
    const middle = store.habits[1];
    const last = store.habits[2];

    await store.setArchived(middle, true);
    await expect(store.moveHabit(first, 1)).resolves.toBe(true);
    expect(store.habits.filter((habit) => !habit.archived).map((habit) => habit.id)).toEqual([
      last.id,
      first.id,
      store.habits[3].id,
    ]);
    expect(store.habits[1]).toBe(middle);
  });

  it("rolls back a failed reorder", async () => {
    const app = appWith(vault);
    const store = await RitimStore.open(app);
    const first = store.habits[0];
    const second = store.habits[1];
    vault.process = async () => {
      throw new Error("readonly");
    };

    await expect(store.moveHabit(first, 1)).rejects.toThrow("readonly");
    expect(store.habits[0]).toBe(first);
    expect(store.habits[1]).toBe(second);
  });

  it("archives and restores habits without touching their logs", async () => {
    const app = appWith(vault);
    const store = await RitimStore.open(app);
    const habit = store.habits[0];
    await store.setValue(habit, "2026-10-26", 42);

    await store.setArchived(habit, true);
    expect(habit.archived).toBe(true);

    const archived = await RitimStore.open(app);
    expect(archived.habits[0].archived).toBe(true);
    expect(archived.habits[0].log["2026-10-26"]).toBe(42);

    await archived.setArchived(archived.habits[0], false);
    expect(archived.habits[0].archived).toBeUndefined();

    const restored = await RitimStore.open(app);
    expect(restored.habits[0].archived).toBeUndefined();
    expect(restored.habits[0].log["2026-10-26"]).toBe(42);
  });

  it("rolls back a failed archive", async () => {
    const app = appWith(vault);
    const store = await RitimStore.open(app);
    const habit = store.habits[0];
    vault.process = async () => {
      throw new Error("readonly");
    };

    await expect(store.setArchived(habit, true)).rejects.toThrow("readonly");
    expect(habit.archived).toBeUndefined();
  });

  it("refuses duplicate habit ids", async () => {
    const app = appWith(vault);
    const store = await RitimStore.open(app);

    await expect(
      store.addHabit({
        id: "dhikr-111",
        name: "Kopya",
        emoji: "•",
        kind: "check",
        color: "#000000",
        createdAt: "2026-10-26",
      }),
    ).rejects.toThrow("kimliği");
    expect(store.habits).toHaveLength(4);
  });

  it("rolls back a new habit when the definition cannot be written", async () => {
    const app = appWith(vault);
    const store = await RitimStore.open(app);
    vault.process = async () => {
      throw new Error("readonly");
    };

    await expect(
      store.addHabit({
        id: "test-habit",
        name: "Test",
        emoji: "•",
        kind: "check",
        color: "#000000",
        createdAt: "2026-10-26",
      }),
    ).rejects.toThrow("readonly");
    expect(store.habits).toHaveLength(4);
  });

  it("rolls back the in-memory value when the write fails", async () => {
    const app = appWith(vault);
    const store = await RitimStore.open(app);
    const dhikr = store.habits[0];
    await store.setValue(dhikr, "2026-10-26", 5);

    vault.append = async () => {
      throw new Error("disk full");
    };

    await expect(store.setValue(dhikr, "2026-10-26", 9)).rejects.toThrow("disk full");
    expect(dhikr.log["2026-10-26"]).toBe(5);
  });

  it("deduplicates habit ids and ignores invalid numeric fields", async () => {
    vault.files.set(
      "Ritim/habits.json",
      JSON.stringify([
        {
          id: "a",
          name: "İlk",
          emoji: "•",
          kind: "numeric",
          target: "5",
          weeklyGoal: null,
          createdAt: "bozuk",
          color: "#000000",
        },
        {
          id: "a",
          name: "Kopya",
          emoji: "•",
          kind: "check",
          color: "#000000",
        },
        {
          id: "b",
          name: "İkinci",
          emoji: "•",
          kind: "numeric",
          target: -3,
          color: "#000000",
        },
      ]),
    );

    const store = await RitimStore.open(appWith(vault));
    expect(store.habits.map((habit) => habit.id)).toEqual(["a", "b"]);
    expect(store.habits[0].name).toBe("İlk");
    expect(store.habits[0].target).toBeUndefined();
    expect(store.habits[0].createdAt).toBeUndefined();
    expect(store.habits[1].target).toBeUndefined();
    expect(store.warning).toContain("yinelendi");
  });

  it("persists skips without mixing them into numeric logs", async () => {
    const app = appWith(vault);
    const store = await RitimStore.open(app);
    const habit = store.habits[0];

    await store.setSkip(habit, "2026-10-26", "yolculuk");
    expect(habit.log["2026-10-26"]).toBeUndefined();
    expect(habit.skips?.["2026-10-26"]).toBe("yolculuk");
    expect(vault.files.get("Ritim/habits.json") ?? "").not.toContain("skips");

    const reopened = await RitimStore.open(app);
    expect(reopened.habits[0].log["2026-10-26"]).toBeUndefined();
    expect(reopened.habits[0].skips?.["2026-10-26"]).toBe("yolculuk");

    await reopened.setValue(reopened.habits[0], "2026-10-26", 111);
    expect(reopened.habits[0].skips?.["2026-10-26"]).toBeUndefined();
    const valued = await RitimStore.open(app);
    expect(valued.habits[0].log["2026-10-26"]).toBe(111);
    expect(valued.habits[0].skips?.["2026-10-26"]).toBeUndefined();
  });

  it("clears skips and rolls back failed skip writes", async () => {
    const app = appWith(vault);
    const store = await RitimStore.open(app);
    const habit = store.habits[0];

    await store.setSkip(habit, "2026-10-26", "");
    await store.clearSkip(habit, "2026-10-26");
    expect(habit.skips?.["2026-10-26"]).toBeUndefined();

    vault.append = async () => {
      throw new Error("disk full");
    };
    await expect(store.setSkip(habit, "2026-10-27", "hasta")).rejects.toThrow("disk full");
    expect(habit.skips?.["2026-10-27"]).toBeUndefined();
  });

  it("persists flexible repeat, minimum, pause, stack and day-part fields", async () => {
    const app = appWith(vault);
    const store = await RitimStore.open(app);
    const habit = store.habits[0];

    await store.updateHabit(habit, {
      intervalDays: 3,
      minimum: 5,
      quickValue: 111,
      pausedFrom: "2026-11-01",
      pausedUntil: "2026-11-05",
      stackAfter: "su",
      dayPart: "morning",
    });

    const reopened = await RitimStore.open(app);
    const saved = reopened.habits[0];
    expect(saved.intervalDays).toBe(3);
    expect(saved.minimum).toBe(5);
    expect(saved.quickValue).toBe(111);
    expect(saved.pausedFrom).toBe("2026-11-01");
    expect(saved.pausedUntil).toBe("2026-11-05");
    expect(saved.stackAfter).toBe("su");
    expect(saved.dayPart).toBe("morning");
    expect(saved.log).toEqual({});
  });

  it("ignores malformed log lines instead of losing the month", async () => {
    const app = appWith(vault);
    const store = await RitimStore.open(app);
    const dhikr = store.habits[0];

    await store.setValue(dhikr, "2026-10-26", 111);

    const path = "Ritim/log/2026-10.ndjson";
    vault.files.set(path, "not json\n" + (vault.files.get(path) ?? ""));

    const reopened = await RitimStore.open(app);
    expect(reopened.habits[0].log["2026-10-26"]).toBe(111);
  });
});
