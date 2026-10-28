import { App, Component, MarkdownRenderer, Modal, Notice, TFile, setIcon } from "obsidian";
import type { Habit } from "../core/types";

interface HabitDocModalOptions {
  habit: Habit;
  path: string;
  onOpenFile: () => void;
}

export class HabitDocModal extends Modal {
  private readonly renderComponent = new Component();
  private closed = false;

  constructor(
    app: App,
    private readonly options: HabitDocModalOptions,
  ) {
    super(app);
  }

  onOpen(): void {
    this.closed = false;
    this.modalEl.addClass("ritim-doc-modal");
    this.modalEl.setCssProps({ "--ritim-habit-color": this.options.habit.color });
    this.renderComponent.load();
    void this.render();
  }

  onClose(): void {
    this.closed = true;
    this.renderComponent.unload();
    this.contentEl.empty();
    this.modalEl.removeClass("ritim-doc-modal");
    this.modalEl.setCssProps({ "--ritim-habit-color": "" });
  }

  private async render(): Promise<void> {
    const { contentEl } = this;
    const { habit, path } = this.options;
    contentEl.empty();

    const head = contentEl.createDiv({ cls: "ritim-doc-head" });
    head.createSpan({ text: habit.emoji, cls: "ritim-doc-emoji" });
    const titles = head.createDiv({ cls: "ritim-doc-titles" });
    titles.createEl("h2", { text: habit.name, cls: "ritim-doc-title" });
    titles.createDiv({ text: path, cls: "ritim-muted ritim-doc-path" });

    const close = head.createEl("button", { cls: "ritim-doc-close" });
    close.type = "button";
    close.setAttr("aria-label", "Kapat");
    close.setAttr("title", "Kapat");
    setIcon(close, "x");
    close.onclick = () => this.close();

    const body = contentEl.createDiv({ cls: "ritim-doc-body" });
    const loading = body.createDiv({
      text: "Yükleniyor…",
      cls: "ritim-muted",
    });

    try {
      const file = this.app.vault.getAbstractFileByPath(path);
      if (!(file instanceof TFile)) throw new Error(`${path} bir dosya değil.`);

      const markdown = await this.app.vault.cachedRead(file);
      if (this.closed) return;
      loading.remove();
      if (!markdown.trim()) {
        body.createDiv({ text: "Bu dosya henüz boş.", cls: "ritim-muted" });
      } else {
        const preview = body.createDiv({ cls: "markdown-rendered" });
        await MarkdownRenderer.render(
          this.app,
          markdown,
          preview,
          file.path,
          this.renderComponent,
        );
      }
    } catch (error) {
      if (this.closed) return;
      loading.remove();
      const message = error instanceof Error ? error.message : String(error);
      body.createDiv({ text: `Dosya okunamadı: ${message}`, cls: "ritim-doc-error" });
      new Notice(`Kalp Ritmi: Markdown dosyası okunamadı. ${message}`, 10000);
    }

    if (this.closed) return;
    const footer = contentEl.createDiv({ cls: "ritim-modal-footer" });
    const open = footer.createEl("button", { text: "Dosyayı aç", cls: "mod-cta" });
    open.type = "button";
    open.onclick = () => {
      this.close();
      this.options.onOpenFile();
    };

    const dismiss = footer.createEl("button", { text: "Kapat" });
    dismiss.type = "button";
    dismiss.onclick = () => this.close();
  }
}
