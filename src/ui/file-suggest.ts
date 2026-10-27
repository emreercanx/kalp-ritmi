import { App, FuzzySuggestModal, TFile, TFolder } from "obsidian";

export class MarkdownFileSuggestModal extends FuzzySuggestModal<TFile> {
  constructor(
    app: App,
    private readonly onPick: (file: TFile) => void,
  ) {
    super(app);
    this.setPlaceholder("Markdown dosyası seç");
  }

  getItems(): TFile[] {
    return this.app.vault
      .getMarkdownFiles()
      .sort((a, b) => a.path.localeCompare(b.path, "tr"));
  }

  getItemText(file: TFile): string {
    return file.path;
  }

  onChooseItem(file: TFile): void {
    this.onPick(file);
  }
}

export class FolderSuggestModal extends FuzzySuggestModal<TFolder> {
  constructor(
    app: App,
    private readonly onPick: (folder: TFolder) => void,
  ) {
    super(app);
    this.setPlaceholder("Klasör seç");
  }

  getItems(): TFolder[] {
    return this.app.vault
      .getAllLoadedFiles()
      .filter((file): file is TFolder => file instanceof TFolder)
      .filter((folder) => folder.path !== "/")
      .sort((a, b) => a.path.localeCompare(b.path, "tr"));
  }

  getItemText(folder: TFolder): string {
    return folder.path;
  }

  onChooseItem(folder: TFolder): void {
    this.onPick(folder);
  }
}
