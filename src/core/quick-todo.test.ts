import { describe, expect, it } from "vitest";

import { TFile, TFolder } from "obsidian";
import type { App } from "obsidian";
import { appendQuickTodo, ensureQuickTodoFile } from "./quick-todo";

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

  async read(file: TFile): Promise<string> {
    return this.files.get(file.path) ?? "";
  }

  async append(file: TFile, data: string): Promise<void> {
    this.files.set(file.path, (this.files.get(file.path) ?? "") + data);
  }
}

function appWith(vault: FakeVault): App {
  return { vault } as unknown as App;
}

describe("quick to-do file", () => {
  it("creates nested folders and the default Markdown file", async () => {
    const vault = new FakeVault();
    const app = appWith(vault);

    const file = await ensureQuickTodoFile(app, "Ritim/Hızlı yapılacaklar.md");

    expect(file.path).toBe("Ritim/Hızlı yapılacaklar.md");
    expect(vault.folders.has("Ritim")).toBe(true);
    expect(vault.files.get(file.path)).toBe("# Hızlı yapılacaklar\n\n");
  });

  it("appends a task and keeps an existing selected file", async () => {
    const vault = new FakeVault();
    const app = appWith(vault);
    vault.folders.add("Notlar");
    vault.files.set("Notlar/Görevler.md", "# Görevler\n\nMevcut içerik");

    const file = await appendQuickTodo(app, "Notlar/Görevler.md", "  Süt al  ");

    expect(file.path).toBe("Notlar/Görevler.md");
    expect(vault.files.get(file.path)).toBe(
      "# Görevler\n\nMevcut içerik\n- [ ] Süt al\n",
    );
  });

  it("rejects empty tasks without creating a file", async () => {
    const vault = new FakeVault();
    const app = appWith(vault);

    await expect(appendQuickTodo(app, "Ritim/Hızlı.md", "   ")).rejects.toThrow(
      "Görev metni boş olamaz.",
    );
    expect(vault.files.size).toBe(0);
  });
});
