import { App, TFile, TFolder, normalizePath } from "obsidian";
import { normalizeHabitDocFolder } from "./settings";

export function habitDocFileName(name: string): string {
  return (
    name
      .trim()
      .replace(/[\\/:*?"<>|]/g, " ")
      .replace(/\s+/g, " ")
      .replace(/^[.\s]+|[.\s]+$/g, "")
      .slice(0, 80)
      .trim() || "aliskanlik"
  );
}

export function habitDocTemplate(name: string): string {
  return (
    `# ${name}\n\n` +
    `> Bu dosya "${name}" alışkanlığına bağlıdır. İçeriğini istediğin gibi düzenleyebilirsin.\n`
  );
}

export async function ensureVaultFolder(app: App, path: string): Promise<void> {
  const normalized = normalizePath(path);
  if (!normalized) return;

  let current = "";
  for (const part of normalized.split("/")) {
    current = current ? `${current}/${part}` : part;
    const existing = app.vault.getAbstractFileByPath(current);
    if (existing instanceof TFolder) continue;
    if (existing) throw new Error(`${current} bir klasör değil.`);
    await app.vault.createFolder(current);
  }
}

/** Opens or creates a per-habit Markdown note and returns its vault path. */
export async function ensureHabitDoc(
  app: App,
  folder: string,
  habitName: string,
  preferredPath?: string,
): Promise<string> {
  if (preferredPath?.trim()) {
    const path = normalizePath(preferredPath.trim());
    const parent = path.split("/").slice(0, -1).join("/");
    if (parent) await ensureVaultFolder(app, parent);

    const existing = app.vault.getAbstractFileByPath(path);
    if (existing instanceof TFile) return path;
    if (existing) throw new Error(`${path} bir dosya değil.`);

    await app.vault.create(path, habitDocTemplate(habitName));
    return path;
  }

  const targetFolder = normalizeHabitDocFolder(folder);
  await ensureVaultFolder(app, targetFolder);

  const base = habitDocFileName(habitName);
  for (let index = 1; index < 1000; index++) {
    const suffix = index === 1 ? "" : `-${index}`;
    const path = normalizePath(`${targetFolder}/${base}${suffix}.md`);
    const existing = app.vault.getAbstractFileByPath(path);
    if (existing instanceof TFolder) continue;
    if (existing) continue;

    await app.vault.create(path, habitDocTemplate(habitName));
    return path;
  }

  throw new Error("Boş bir Markdown dosya adı bulunamadı.");
}
