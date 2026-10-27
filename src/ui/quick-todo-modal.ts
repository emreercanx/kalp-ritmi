import { App, Modal, Notice } from "obsidian";

interface QuickTodoModalOptions {
  path: string;
  onAdd: (text: string) => Promise<void>;
  onOpen: () => Promise<void>;
}

export class QuickTodoModal extends Modal {
  private input: HTMLInputElement | null = null;
  private busy = false;

  constructor(
    app: App,
    private readonly options: QuickTodoModalOptions,
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    this.modalEl.addClass("ritim-quick-modal");
    this.busy = false;

    contentEl.createEl("h2", { text: "Hızlı yapılacaklar" });
    contentEl.createDiv({
      text: `Görev şu dosyaya eklenir: ${this.options.path}`,
      cls: "ritim-muted",
    });

    const input = contentEl.createEl("input", { cls: "ritim-quick-input" });
    input.type = "text";
    input.placeholder = "Yeni görev…";
    input.setAttr("aria-label", "Yeni görev");
    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      void this.add();
    });
    this.input = input;

    const footer = contentEl.createDiv({ cls: "ritim-modal-footer" });

    const cancel = footer.createEl("button", { text: "Vazgeç" });
    cancel.type = "button";
    cancel.onclick = () => this.close();

    const open = footer.createEl("button", { text: "Dosyayı aç" });
    open.type = "button";
    open.onclick = () => void this.openFile();

    const add = footer.createEl("button", { text: "Ekle", cls: "mod-cta" });
    add.type = "button";
    add.onclick = () => void this.add();

    input.focus();
  }

  onClose(): void {
    this.contentEl.empty();
    this.modalEl.removeClass("ritim-quick-modal");
    this.input = null;
  }

  private async add(): Promise<void> {
    if (this.busy) return;
    const text = this.input?.value ?? "";
    if (!text.trim()) {
      new Notice("Kalp Ritmi: görev metni boş olamaz.");
      this.input?.focus();
      return;
    }

    this.busy = true;
    try {
      await this.options.onAdd(text);
      new Notice("Görev hızlı yapılacaklara eklendi.");
      this.close();
    } catch (error) {
      this.busy = false;
      const message = error instanceof Error ? error.message : String(error);
      new Notice(`Kalp Ritmi: görev eklenemedi. ${message}`, 10000);
      this.input?.focus();
    }
  }

  private async openFile(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      await this.options.onOpen();
      this.close();
    } catch (error) {
      this.busy = false;
      const message = error instanceof Error ? error.message : String(error);
      new Notice(`Kalp Ritmi: dosya açılamadı. ${message}`, 10000);
    }
  }
}
