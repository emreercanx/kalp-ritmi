import { App, Modal, Notice } from "obsidian";
import { formatLongDate } from "../core/date";

interface NoteModalOptions {
  date: string;
  value: string;
  onSave: (text: string) => Promise<void>;
}

export class NoteModal extends Modal {
  private value: string;

  constructor(
    app: App,
    private readonly options: NoteModalOptions,
  ) {
    super(app);
    this.value = options.value;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    this.modalEl.addClass("ritim-note-modal");

    contentEl.createEl("h2", { text: "Günün notu" });
    contentEl.createDiv({
      text: formatLongDate(this.options.date),
      cls: "ritim-muted",
    });

    const input = contentEl.createEl("textarea", {
      cls: "ritim-note-input",
      attr: {
        placeholder: "Bugün nasıl geçti? Neyi fark ettin?",
        rows: "10",
      },
    });
    input.value = this.value;
    input.oninput = () => (this.value = input.value);
    window.setTimeout(() => input.focus(), 0);

    contentEl.createDiv({
      text: "Boş bırakıp kaydetmek notu siler.",
      cls: "ritim-muted ritim-note-hint",
    });

    const footer = contentEl.createDiv({ cls: "ritim-modal-footer" });
    const cancel = footer.createEl("button", { text: "Vazgeç" });
    cancel.type = "button";
    cancel.onclick = () => this.close();

    const save = footer.createEl("button", { text: "Kaydet", cls: "mod-cta" });
    save.type = "button";
    save.onclick = () => void this.save(save);
  }

  onClose(): void {
    this.contentEl.empty();
    this.modalEl.removeClass("ritim-note-modal");
  }

  private async save(button: HTMLButtonElement): Promise<void> {
    button.disabled = true;
    try {
      await this.options.onSave(this.value);
      this.close();
      new Notice(this.value.trim() ? "Not kaydedildi." : "Not silindi.");
    } catch (error) {
      button.disabled = false;
      const message = error instanceof Error ? error.message : String(error);
      new Notice(`Kalp Ritmi: not kaydedilemedi. ${message}`, 10000);
    }
  }
}
