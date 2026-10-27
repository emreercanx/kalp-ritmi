import { describe, expect, it } from "vitest";

import { TFile, TFolder } from "obsidian";
import type { App } from "obsidian";
import { ensureHabitDoc, habitDocFileName } from "./habit-doc";

class FakeVault {
  files = new Map<string, string>();
  folders = new Set<string>();

  getAbstractFileByPath(path: string): TFile | TFolder | null {
    if (this.files.has(path)) {
      return new TFile(path, path.split("/").pop() ?? path);
    }
    if (this.folders.has(path)) return new TFolder(path);
    return null;
  }

  async createFolder(path: string): Promise<TFolder> {
    if (this.folders.has(path) || this.files.has(path)) {
      throw new Error("already exists");
    }
    this.folders.add(path);
    return new TFolder(path);
  }

  async create(path: string, data: string): Promise<TFile> {
    if (this.files.has(path) || this.folders.has(path)) {
      throw new Error("already exists");
    }
    this.files.set(path, data);
    return new TFile(path, path.split("/").pop() ?? path);
  }
}

function appWith(vault: FakeVault): App {
  return { vault } as unknown as App;
}

describe("ensureHabitDoc", () => {
  it("creates nested folders and unique Markdown files", async () => {
    const vault = new FakeVault();
    const app = appWith(vault);

    await expect(
      ensureHabitDoc(app, "Ritim/alışkanlıklar", "Su"),
    ).resolves.toBe("Ritim/alışkanlıklar/Su.md");
    expect(vault.folders.has("Ritim")).toBe(true);
    expect(vault.folders.has("Ritim/alışkanlıklar")).toBe(true);
    expect(vault.files.get("Ritim/alışkanlıklar/Su.md")).toContain("# Su");

    await expect(
      ensureHabitDoc(app, "Ritim/alışkanlıklar", "Su"),
    ).resolves.toBe("Ritim/alışkanlıklar/Su-2.md");
    await expect(
      ensureHabitDoc(app, "Ritim/alışkanlıklar", "Su"),
    ).resolves.toBe("Ritim/alışkanlıklar/Su-3.md");
  });

  it("uses an existing selected file without touching its content", async () => {
    const vault = new FakeVault();
    const app = appWith(vault);
    vault.folders.add("Notlar");
    vault.files.set("Notlar/Özel.md", "Benim içeriğim");

    await expect(
      ensureHabitDoc(app, "Ritim/alışkanlıklar", "Su", "Notlar/Özel.md"),
    ).resolves.toBe("Notlar/Özel.md");
    expect(vault.files.get("Notlar/Özel.md")).toBe("Benim içeriğim");
  });

  it("creates a missing preferred file and its parent folder", async () => {
    const vault = new FakeVault();
    const app = appWith(vault);

    await expect(
      ensureHabitDoc(app, "Ritim/alışkanlıklar", "Su", "Notlar/Yeni.md"),
    ).resolves.toBe("Notlar/Yeni.md");
    expect(vault.folders.has("Notlar")).toBe(true);
    expect(vault.files.get("Notlar/Yeni.md")).toContain("# Su");
  });

  it("sanitizes file names", () => {
    expect(habitDocFileName("Su/Çay:*?")).toBe("Su Çay");
    expect(habitDocFileName("...")).toBe("aliskanlik");
  });
});
