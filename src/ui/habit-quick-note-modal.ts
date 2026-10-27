import { App, Modal, Notice, setIcon } from "obsidian";
import { formatTimestamp } from "../core/date";
import { createHabitNoteId, type HabitNote } from "../core/notes";

interface HabitQuickNoteModalOptions {
  habitName: string;
  notes: HabitNote[];
  onSave: (notes: HabitNote[]) => Promise<void>;
}

export class HabitQuickNoteModal extends Modal {
  private notes: HabitNote[];
  private draft = "";
  private editingId: string | null = null;
  private editingText = "";
  private busy = false;
  private addInput: HTMLTextAreaElement | null = null;

  constructor(
    app: App,
    private readonly options: HabitQuickNoteModalOptions,
  ) {
    super(app);
    this.notes = [...options.notes];
  }

  onOpen(): void {
    this.modalEl.addClass("ritim-habit-note-modal");
    this.render();
  }

  onClose(): void {
    this.contentEl.empty();
    this.modalEl.removeClass("ritim-habit-note-modal");
    this.addInput = null;
  }

  private render(): void {
    const { contentEl } = this;
    contentEl.empty();
    this.addInput = null;

    contentEl.createEl("h2", { text: "Hızlı notlar" });
    contentEl.createDiv({
      text: `${this.options.habitName} · ${this.notes.length} not`,
      cls: "ritim-muted",
    });
    contentEl.createDiv({
      text: "Notlar eklentinin yerel verisinde saklanır; Markdown dosyası oluşturmaz.",
      cls: "ritim-muted ritim-habit-note-hint",
    });

    const add = contentEl.createDiv({ cls: "ritim-habit-note-add" });
    const input = add.createEl("textarea", {
      cls: "ritim-note-input ritim-habit-note-input",
      attr: {
        placeholder: "Bu alışkanlık için yeni not…",
        rows: "3",
        "aria-label": "Yeni hızlı not",
      },
    });
    input.value = this.draft;
    input.oninput = () => (this.draft = input.value);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        void this.addNote();
      }
    });
    this.addInput = input;

    const addRow = add.createDiv({ cls: "ritim-habit-note-add-row" });
    const addButton = addRow.createEl("button", {
      text: "Not ekle",
      cls: "mod-cta",
    });
    addButton.type = "button";
    addButton.onclick = () => void this.addNote();

    const list = contentEl.createDiv({ cls: "ritim-habit-notes" });
    if (this.notes.length === 0) {
      list.createDiv({
        text: "Henüz not yok. Yukarıdaki kutuya yazıp Not ekle'ye dokun.",
        cls: "ritim-empty",
      });
    } else {
      for (const note of this.notes) this.renderNote(list, note);
    }

    const footer = contentEl.createDiv({ cls: "ritim-modal-footer" });
    const close = footer.createEl("button", { text: "Kapat" });
    close.type = "button";
    close.onclick = () => this.close();

    if (!this.editingId) {
      window.setTimeout(() => this.addInput?.focus(), 0);
    }
  }

  private renderNote(list: HTMLElement, note: HabitNote): void {
    const card = list.createDiv({ cls: "ritim-habit-note" });
    const head = card.createDiv({ cls: "ritim-habit-note-head" });
    const stamp =
      note.updatedAt !== note.createdAt
        ? `Düzenlendi: ${formatTimestamp(note.updatedAt)}`
        : formatTimestamp(note.createdAt);
    head.createSpan({ text: stamp, cls: "ritim-habit-note-time" });

    const actions = head.createDiv({ cls: "ritim-habit-note-actions" });
    this.noteAction(actions, "pencil", "Notu düzenle", () => {
      if (this.busy) return;
      this.editingId = note.id;
      this.editingText = note.text;
      this.render();
      window.setTimeout(() => {
        const area = this.contentEl.querySelector<HTMLTextAreaElement>(
          ".ritim-habit-note-edit",
        );
        area?.focus();
        area?.select();
      }, 0);
    });
    this.noteAction(actions, "trash-2", "Notu sil", () => {
      if (this.busy) return;
      new ConfirmHabitNoteDeleteModal(this.app, note.text, async () => {
        const next = this.notes.filter((item) => item.id !== note.id);
        if (await this.commit(next)) {
          if (this.editingId === note.id) {
            this.editingId = null;
            this.editingText = "";
          }
          this.render();
        }
      }).open();
    });

    if (this.editingId === note.id) {
      const input = card.createEl("textarea", {
        cls: "ritim-note-input ritim-habit-note-edit",
        attr: { rows: "4", "aria-label": "Notu düzenle" },
      });
      input.value = this.editingText;
      input.oninput = () => (this.editingText = input.value);
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          void this.saveEdit(note.id);
        } else if (event.key === "Escape") {
          event.preventDefault();
          this.cancelEdit();
        }
      });

      const footer = card.createDiv({ cls: "ritim-habit-note-footer" });
      const cancel = footer.createEl("button", { text: "Vazgeç" });
      cancel.type = "button";
      cancel.onclick = () => this.cancelEdit();
      const save = footer.createEl("button", { text: "Kaydet", cls: "mod-cta" });
      save.type = "button";
      save.onclick = () => void this.saveEdit(note.id);
    } else {
      card.createDiv({ text: note.text, cls: "ritim-habit-note-text" });
    }
  }

  private noteAction(
    parent: HTMLElement,
    icon: string,
    label: string,
    run: () => void,
  ): void {
    const button = parent.createEl("button", { cls: "ritim-row-action" });
    button.type = "button";
    button.setAttr("aria-label", label);
    button.setAttr("title", label);
    setIcon(button, icon);
    button.onclick = () => run();
  }

  private async addNote(): Promise<void> {
    if (this.busy) return;
    const text = this.draft.trim();
    if (!text) {
      new Notice("Kalp Ritmi: not metni boş olamaz.");
      this.addInput?.focus();
      return;
    }

    const now = Date.now();
    const note: HabitNote = {
      id: createHabitNoteId(),
      text,
      createdAt: now,
      updatedAt: now,
    };
    if (await this.commit([note, ...this.notes])) {
      this.draft = "";
      this.editingId = null;
      this.editingText = "";
      this.render();
    }
  }

  private async saveEdit(noteId: string): Promise<void> {
    if (this.busy) return;
    const text = this.editingText.trim();
    if (!text) {
      new Notice("Kalp Ritmi: not metni boş olamaz.");
      return;
    }

    const now = Date.now();
    const next = this.notes.map((note) =>
      note.id === noteId ? { ...note, text, updatedAt: now } : note,
    );
    if (await this.commit(next)) {
      this.editingId = null;
      this.editingText = "";
      this.render();
    }
  }

  private cancelEdit(): void {
    this.editingId = null;
    this.editingText = "";
    this.render();
  }

  private async commit(next: HabitNote[]): Promise<boolean> {
    if (this.busy) return false;
    this.busy = true;
    try {
      await this.options.onSave(next);
      this.notes = next;
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      new Notice(`Kalp Ritmi: not kaydedilemedi. ${message}`, 10000);
      return false;
    } finally {
      this.busy = false;
    }
  }
}

class ConfirmHabitNoteDeleteModal extends Modal {
  constructor(
    app: App,
    private readonly text: string,
    private readonly onConfirm: () => Promise<void>,
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Not silinsin mi?" });
    contentEl.createEl("p", {
      text: this.text.length > 180 ? `${this.text.slice(0, 180)}…` : this.text,
      cls: "ritim-habit-note-preview",
    });
    contentEl.createDiv({
      text: "Bu işlem geri alınamaz.",
      cls: "ritim-muted",
    });

    const footer = contentEl.createDiv({ cls: "ritim-modal-footer" });
    const cancel = footer.createEl("button", { text: "Vazgeç" });
    cancel.type = "button";
    cancel.onclick = () => this.close();

    const remove = footer.createEl("button", { text: "Sil", cls: "mod-warning" });
    remove.type = "button";
    remove.onclick = async () => {
      remove.disabled = true;
      try {
        await this.onConfirm();
        this.close();
      } catch (error) {
        remove.disabled = false;
        const message = error instanceof Error ? error.message : String(error);
        new Notice(`Kalp Ritmi: not silinemedi. ${message}`, 10000);
      }
    };
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
