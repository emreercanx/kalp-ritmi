import { App, TFile, normalizePath } from "obsidian";
import { ensureVaultFolder } from "./habit-doc";
import { normalizeQuickTodoPath } from "./settings";

export const QUICK_TODO_TEMPLATE = "# Hızlı yapılacaklar\n\n";

export function formatQuickTodo(text: string): string {
  const value = text.replace(/\s+/g, " ").trim();
  if (!value) throw new Error("Görev metni boş olamaz.");
  return `- [ ] ${value}\n`;
}

/** Opens or creates the quick to-do Markdown file. */
export async function ensureQuickTodoFile(app: App, path: string): Promise<TFile> {
  const normalized = normalizePath(normalizeQuickTodoPath(path));
  const parent = normalized.split("/").slice(0, -1).join("/");
  if (parent) await ensureVaultFolder(app, parent);

  const existing = app.vault.getAbstractFileByPath(normalized);
  if (existing instanceof TFile) return existing;
  if (existing) throw new Error(`${normalized} bir dosya değil.`);

  return app.vault.create(normalized, QUICK_TODO_TEMPLATE);
}

/** Appends an unchecked task to the quick to-do file. */
export async function appendQuickTodo(app: App, path: string, text: string): Promise<TFile> {
  const line = formatQuickTodo(text);
  const file = await ensureQuickTodoFile(app, path);
  const content = await app.vault.read(file);
  const separator = content.length > 0 && !content.endsWith("\n") ? "\n" : "";
  await app.vault.append(file, separator + line);
  return file;
}
