import { App, Modal, Notice, Setting } from "obsidian";
import { DAY_PART_ORDER, dayPartLabel, normalizeDayPart } from "../core/day-part";
import {
  normalizeIntervalDays,
  normalizeScheduleDays,
  WEEKDAY_LABELS,
  WEEKDAY_ORDER,
} from "../core/schedule";
import { wouldCreateStackCycle } from "../core/stacking";
import {
  habitCadence,
  type Habit,
  type HabitCadence,
  type HabitDayPart,
  type HabitDraft,
} from "../core/types";
import { MarkdownFileSuggestModal } from "./file-suggest";

const COLORS = [
  "#c06a7a",
  "#4a7fc1",
  "#3d9c88",
  "#a8853e",
  "#8a6fbf",
  "#c47a3a",
  "#6b8e4e",
  "#b45b5b",
];

interface HabitModalOptions {
  onSave: (draft: HabitDraft) => Promise<void>;
  onDelete?: () => Promise<void>;
  onArchive?: () => Promise<void>;
  onMove?: (direction: -1 | 1) => Promise<void>;
  position?: { index: number; total: number };
  habits?: Habit[];
}

export class HabitModal extends Modal {
  private readonly habit: Habit | null;
  private readonly options: HabitModalOptions;

  private name: string;
  private emoji: string;
  private kind: "check" | "numeric";
  private cadence: HabitCadence;
  private unit: string;
  private target: string;
  private minimum: string;
  private quickValue: string;
  private intervalDays: string;
  private weeklyGoal: string;
  private scheduleDays: number[];
  private pausedFrom: string;
  private pausedUntil: string;
  private stackAfter: string;
  private dayPart: HabitDayPart;
  private color: string;
  private docPath: string;

  private targetSetting!: Setting;
  private minimumSetting!: Setting;
  private quickValueSetting!: Setting;
  private unitSetting!: Setting;
  private intervalSetting!: Setting;
  private weeklyGoalSetting!: Setting;
  private daySetting!: Setting;
  private pauseSetting!: Setting;
  private stackSetting!: Setting;
  private dayPartSetting!: Setting;
  private cadenceSetting!: Setting;
  private docSetting!: Setting;
  private dayButtons = new Map<number, HTMLButtonElement>();
  private orderButtons: HTMLButtonElement[] = [];
  private position: { index: number; total: number } | null;
  private swatches: HTMLElement[] = [];
  private saving = false;

  constructor(
    app: App,
    habit: Habit | null,
    options: HabitModalOptions,
    initialCadence: HabitCadence = "daily",
  ) {
    super(app);
    this.habit = habit;
    this.options = options;

    this.name = habit?.name ?? "";
    this.emoji = habit?.emoji ?? "";
    this.kind = habit?.kind === "numeric" ? "numeric" : "check";
    this.cadence = habit ? habitCadence(habit) : initialCadence;
    this.unit = habit?.unit ?? "";
    this.target = habit?.target !== undefined ? String(habit.target) : "";
    this.minimum = habit?.minimum !== undefined ? String(habit.minimum) : "";
    this.quickValue = habit?.quickValue !== undefined ? String(habit.quickValue) : "";
    this.intervalDays = habit?.intervalDays !== undefined ? String(habit.intervalDays) : "";
    this.weeklyGoal = habit?.weeklyGoal !== undefined ? String(habit.weeklyGoal) : "";
    this.scheduleDays = normalizeScheduleDays(habit?.scheduleDays);
    this.pausedFrom = habit?.pausedFrom ?? "";
    this.pausedUntil = habit?.pausedUntil ?? "";
    this.stackAfter = habit?.stackAfter ?? "";
    this.dayPart = habit?.dayPart ?? "anytime";
    this.position = options.position ?? null;
    this.color = habit?.color ?? COLORS[0];
    this.docPath = habit?.docPath ?? "";
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    this.modalEl.addClass("ritim-habit-modal");

    contentEl.createEl("h2", {
      text: this.habit ? "Alışkanlığı düzenle" : "Yeni alışkanlık",
      cls: "ritim-modal-title",
    });
    contentEl.createDiv({
      text: this.habit
        ? "Geçmiş kayıtlar korunur; yalnızca tanım değişir."
        : "Ad ve tür yeterli. Hedefi sonra da değiştirebilirsin.",
      cls: "ritim-muted",
    });

    new Setting(contentEl)
      .setName("Ad")
      .setDesc("Panoda görünecek kısa ad.")
      .addText((text) => {
        text
          .setPlaceholder("Örn. Sabah yürüyüşü")
          .setValue(this.name)
          .onChange((value) => (this.name = value));
        text.inputEl.maxLength = 60;
        text.inputEl.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            void this.save();
          }
        });
      });

    new Setting(contentEl)
      .setName("Simge")
      .setDesc("Tek bir emoji yeterli.")
      .addText((text) => {
        text
          .setPlaceholder("✅")
          .setValue(this.emoji)
          .onChange((value) => (this.emoji = value));
        text.inputEl.maxLength = 8;
      });

    new Setting(contentEl).setName("Tür").addDropdown((dropdown) => {
      dropdown.addOption("check", "Tik (yapıldı / yapılmadı)");
      dropdown.addOption("numeric", "Sayı (hedefe kadar)");
      dropdown.setValue(this.kind);
      dropdown.onChange((value) => {
        this.kind = value === "numeric" ? "numeric" : "check";
        this.updateVisibility();
      });
    });

    const cadenceLocked = Boolean(this.habit && Object.keys(this.habit.log).length > 0);
    new Setting(contentEl)
      .setName("Sıklık")
      .setDesc(
        cadenceLocked
          ? "Kayıtları olan alışkanlığın sıklığı değiştirilemez."
          : "Günlük her gün, haftalık haftada bir, aylık ayda bir işaretlenir.",
      )
      .addDropdown((dropdown) => {
        dropdown.addOption("daily", "Günlük");
        dropdown.addOption("weekly", "Haftalık (haftada 1 kutu)");
        dropdown.addOption("monthly", "Aylık (ayda 1 kutu)");
        dropdown.setValue(this.cadence);
        dropdown.setDisabled(cadenceLocked);
        dropdown.onChange((value) => {
          if (value !== "weekly" && value !== "monthly") {
            this.cadence = "daily";
          } else {
            this.cadence = value;
          }
          this.updateVisibility();
        });
      });

    this.intervalSetting = new Setting(contentEl)
      .setName("Esnek tekrar")
      .setDesc("Her N günde 1. Boş veya 1 ise normal günlük plan kullanılır.")
      .addText((text) => {
        text
          .setPlaceholder("Örn. 3")
          .setValue(this.intervalDays)
          .onChange((value) => {
            this.intervalDays = value;
            this.updateVisibility();
          });
        text.inputEl.type = "number";
        text.inputEl.min = "1";
        text.inputEl.max = "365";
        text.inputEl.step = "1";
        text.inputEl.inputMode = "numeric";
        text.inputEl.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            void this.save();
          }
        });
      });

    this.daySetting = new Setting(contentEl)
      .setName("Günler")
      .setDesc(
        "Kapalı günler skoru ve seriyi etkilemez. Yine de o güne kayıt girebilirsin.",
      );
    const dayPicker = this.daySetting.controlEl.createDiv({ cls: "ritim-day-picker" });
    this.dayButtons.clear();
    for (const day of WEEKDAY_ORDER) {
      const button = dayPicker.createEl("button", {
        cls: "ritim-day-toggle",
        text: WEEKDAY_LABELS[day],
      });
      button.type = "button";
      button.onclick = () => this.toggleDay(day);
      this.dayButtons.set(day, button);
    }
    this.paintDays();

    this.targetSetting = new Setting(contentEl)
      .setName("Günlük hedef")
      .setDesc("Örn. 111 zikir, 8 bardak su.")
      .addText((text) => {
        text
          .setPlaceholder("8")
          .setValue(this.target)
          .onChange((value) => (this.target = value));
        text.inputEl.type = "number";
        text.inputEl.min = "0";
        text.inputEl.step = "any";
        text.inputEl.inputMode = "decimal";
        text.inputEl.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            void this.save();
          }
        });
      });

    this.unitSetting = new Setting(contentEl)
      .setName("Birim")
      .setDesc("İsteğe bağlı: adet, bardak, sayfa…")
      .addText((text) => {
        text
          .setPlaceholder("adet")
          .setValue(this.unit)
          .onChange((value) => (this.unit = value));
        text.inputEl.maxLength = 20;
      });

    this.minimumSetting = new Setting(contentEl)
      .setName("Minimum sürüm")
      .setDesc("Sayısal hedefin altında, yine de tamam sayılan alt sınır. Örn. 5 sayfa.")
      .addText((text) => {
        text
          .setPlaceholder("5")
          .setValue(this.minimum)
          .onChange((value) => (this.minimum = value));
        text.inputEl.type = "number";
        text.inputEl.min = "0";
        text.inputEl.step = "any";
        text.inputEl.inputMode = "decimal";
      });

    this.quickValueSetting = new Setting(contentEl)
      .setName("Hızlı değer")
      .setDesc("Panoda gün hücrelerinin altında tek dokunuşla yazılacak sayı. Boşsa düğme görünmez.")
      .addText((text) => {
        text
          .setPlaceholder("111")
          .setValue(this.quickValue)
          .onChange((value) => (this.quickValue = value));
        text.inputEl.type = "number";
        text.inputEl.min = "0";
        text.inputEl.step = "any";
        text.inputEl.inputMode = "decimal";
      });

    this.weeklyGoalSetting = new Setting(contentEl)
      .setName("Haftalık hedef")
      .setDesc("İsteğe bağlı: tiklerde haftada gün, sayılarda haftada toplam.")
      .addText((text) => {
        text
          .setPlaceholder(this.kind === "numeric" ? "30" : "3")
          .setValue(this.weeklyGoal)
          .onChange((value) => (this.weeklyGoal = value));
        text.inputEl.type = "number";
        text.inputEl.min = "0";
        text.inputEl.step = "any";
        text.inputEl.inputMode = "decimal";
        text.inputEl.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            void this.save();
          }
        });
      });

    this.pauseSetting = new Setting(contentEl)
      .setName("Mola")
      .setDesc("Bu tarih aralığında alışkanlık beklenmez; seri bozulmaz.");
    const pauseRow = this.pauseSetting.controlEl.createDiv({ cls: "ritim-pause-range" });
    const pauseFrom = pauseRow.createEl("input");
    pauseFrom.type = "date";
    pauseFrom.value = this.pausedFrom;
    pauseFrom.setAttr("aria-label", "Mola başlangıcı");
    pauseFrom.onchange = () => (this.pausedFrom = pauseFrom.value);
    pauseFrom.oninput = () => (this.pausedFrom = pauseFrom.value);
    pauseRow.createSpan({ text: "→", cls: "ritim-muted" });
    const pauseUntil = pauseRow.createEl("input");
    pauseUntil.type = "date";
    pauseUntil.value = this.pausedUntil;
    pauseUntil.setAttr("aria-label", "Mola bitişi");
    pauseUntil.onchange = () => (this.pausedUntil = pauseUntil.value);
    pauseUntil.oninput = () => (this.pausedUntil = pauseUntil.value);
    const clearPause = pauseRow.createEl("button", { text: "Temizle", cls: "ritim-mini-btn" });
    clearPause.type = "button";
    clearPause.onclick = () => {
      this.pausedFrom = "";
      this.pausedUntil = "";
      pauseFrom.value = "";
      pauseUntil.value = "";
    };

    this.dayPartSetting = new Setting(contentEl)
      .setName("Günün bölümü")
      .setDesc("Günlük panoda sabah, öğleden sonra veya akşam grubunda gösterilir.")
      .addDropdown((dropdown) => {
        for (const part of DAY_PART_ORDER) {
          dropdown.addOption(part, dayPartLabel(part));
        }
        dropdown.setValue(this.dayPart);
        dropdown.onChange((value) => {
          this.dayPart = normalizeDayPart(value) ?? "anytime";
        });
      });

    this.stackSetting = new Setting(contentEl)
      .setName("Şundan sonra")
      .setDesc("Bu alışkanlığı bir başka alışkanlığın ardına bağla.")
      .addDropdown((dropdown) => {
        dropdown.addOption("", "Bağlantı yok");
        const current = this.habit?.id;
        for (const candidate of this.options.habits ?? []) {
          if (candidate.id === current || candidate.archived) continue;
          dropdown.addOption(candidate.id, `${candidate.emoji} ${candidate.name}`);
        }
        const exists = (this.options.habits ?? []).some(
          (candidate) => candidate.id === this.stackAfter && candidate.id !== current,
        );
        dropdown.setValue(exists ? this.stackAfter : "");
        if (!exists) this.stackAfter = "";
        dropdown.onChange((value) => (this.stackAfter = value));
      });

    const colorSetting = new Setting(contentEl)
      .setName("Renk")
      .setDesc("Bir daireye dokunarak rengi seç.");
    const row = colorSetting.controlEl.createDiv({ cls: "ritim-color-row" });
    this.swatches = COLORS.map((color) => {
      const swatch = row.createDiv({ cls: "ritim-color-swatch" });
      swatch.setAttr("role", "button");
      swatch.setAttr("tabindex", "0");
      swatch.setCssProps({ "--ritim-swatch": color });
      swatch.setAttr("aria-label", `Renk: ${color}`);
      swatch.setAttr("title", "Rengi seç");

      const choose = (): void => {
        this.color = color;
        this.paintColors();
      };
      swatch.onclick = choose;
      swatch.onkeydown = (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          choose();
        }
      };
      return swatch;
    });
    this.paintColors();

    this.docSetting = new Setting(contentEl)
      .setName("Markdown dosyası")
      .setDesc(this.docDesc())
      .addButton((button) => {
        button.setButtonText("Dosya seç");
        button.onClick(() => {
          new MarkdownFileSuggestModal(this.app, (file) => {
            this.docPath = file.path;
            this.docSetting.setDesc(this.docDesc());
          }).open();
        });
      })
      .addExtraButton((button) => {
        button.setIcon("x");
        button.setTooltip("Dosya bağlantısını temizle");
        button.onClick(() => {
          this.docPath = "";
          this.docSetting.setDesc(this.docDesc());
        });
      });

    if (this.habit && this.options.onMove && this.position) {
      const orderSetting = new Setting(contentEl)
        .setName("Sıra")
        .setDesc("Panodaki yerini değiştir. Sıra hemen kaydedilir.");
      const orderRow = orderSetting.controlEl.createDiv({ cls: "ritim-order-buttons" });
      const up = orderRow.createEl("button", { text: "Yukarı" });
      up.type = "button";
      up.onclick = () => void this.move(-1);
      const down = orderRow.createEl("button", { text: "Aşağı" });
      down.type = "button";
      down.onclick = () => void this.move(1);
      this.orderButtons = [up, down];
      this.paintOrder();
    }

    const footer = contentEl.createDiv({ cls: "ritim-modal-footer" });

    if (this.habit && this.options.onDelete) {
      const remove = footer.createEl("button", {
        text: "Sil",
        cls: "mod-warning ritim-modal-delete",
      });
      remove.type = "button";
      remove.onclick = () => this.confirmDelete();
    }

    if (this.habit && this.options.onArchive) {
      const archive = footer.createEl("button", { text: "Arşivle" });
      archive.type = "button";
      archive.onclick = () => void this.archive();
    }

    const cancel = footer.createEl("button", { text: "Vazgeç" });
    cancel.type = "button";
    cancel.onclick = () => this.close();

    const save = footer.createEl("button", { text: "Kaydet", cls: "mod-cta" });
    save.type = "button";
    save.onclick = () => void this.save();

    this.updateVisibility();
  }

  onClose(): void {
    this.contentEl.empty();
    this.modalEl.removeClass("ritim-habit-modal");
  }

  private docDesc(): string {
    return this.docPath || "Seçmezsen kaydederken otomatik oluşturulur.";
  }

  private updateVisibility(): void {
    const numeric = this.kind === "numeric";
    const daily = this.cadence === "daily";
    const flexible = daily && this.intervalValue() !== undefined;
    this.targetSetting
      .setName(
        this.cadence === "monthly"
          ? "Aylık hedef"
          : this.cadence === "weekly"
            ? "Haftalık hedef"
            : flexible
              ? "Tekrar hedefi"
              : "Günlük hedef",
      )
      .setDesc(
        numeric
          ? this.cadence === "monthly"
            ? "Örn. ayda 20 kitap."
            : this.cadence === "weekly"
              ? "Örn. haftada 30 sayfa."
              : "Örn. 111 zikir, 8 bardak su."
          : "Yalnızca sayı türünde kullanılır.",
      );
    this.targetSetting.settingEl.toggleClass("ritim-hidden", !numeric);
    this.minimumSetting.settingEl.toggleClass("ritim-hidden", !numeric);
    this.quickValueSetting.settingEl.toggleClass("ritim-hidden", !numeric);
    this.unitSetting.settingEl.toggleClass("ritim-hidden", !numeric);
    this.intervalSetting.settingEl.toggleClass("ritim-hidden", !daily);
    this.weeklyGoalSetting.settingEl.toggleClass("ritim-hidden", !daily || flexible);
    this.daySetting.settingEl.toggleClass("ritim-hidden", !daily || flexible);
    this.pauseSetting.settingEl.toggleClass("ritim-hidden", !daily);
    this.dayPartSetting.settingEl.toggleClass("ritim-hidden", !daily);
    this.stackSetting.settingEl.toggleClass("ritim-hidden", !daily);
    this.weeklyGoalSetting.setDesc(
      numeric
        ? "İsteğe bağlı: haftada toplam ne kadar? Örn. 30 sayfa."
        : "İsteğe bağlı: haftada en az kaç gün? (1–7)",
    );
    this.daySetting.setDesc(
      flexible
        ? "Esnek tekrar açıkken gün seçimi kullanılmaz."
        : "Kapalı günler skoru ve seriyi etkilemez. Yine de o güne kayıt girebilirsin.",
    );
  }

  private intervalValue(): number | undefined {
    const value = Number.parseFloat(this.intervalDays.trim().replace(",", "."));
    if (!Number.isFinite(value) || value <= 1) return undefined;
    return normalizeIntervalDays(value);
  }

  private toggleDay(day: number): void {
    const index = this.scheduleDays.indexOf(day);
    if (index >= 0) {
      if (this.scheduleDays.length === 1) {
        new Notice("En az bir gün seçili kalmalı.");
        return;
      }
      this.scheduleDays.splice(index, 1);
    } else {
      this.scheduleDays.push(day);
    }

    this.scheduleDays = normalizeScheduleDays(this.scheduleDays);
    this.paintDays();
  }

  private paintDays(): void {
    for (const [day, button] of this.dayButtons) {
      const selected = this.scheduleDays.includes(day);
      button.toggleClass("is-selected", selected);
      button.setAttr("aria-pressed", selected ? "true" : "false");
      button.setAttr("aria-label", `${WEEKDAY_LABELS[day]} günü`);
    }
  }

  private paintOrder(): void {
    if (!this.position || this.orderButtons.length !== 2) return;
    this.orderButtons[0].disabled = this.position.index <= 0;
    this.orderButtons[1].disabled = this.position.index >= this.position.total - 1;
  }

  private async move(direction: -1 | 1): Promise<void> {
    if (!this.position || !this.options.onMove) return;
    const target = this.position.index + direction;
    if (target < 0 || target >= this.position.total) return;

    try {
      await this.options.onMove(direction);
      this.position = { ...this.position, index: target };
      this.paintOrder();
      new Notice(direction === -1 ? "Alışkanlık yukarı taşındı." : "Alışkanlık aşağı taşındı.");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      new Notice(`Kalp Ritmi: sıra değiştirilemedi. ${message}`, 10000);
    }
  }

  private paintColors(): void {
    this.swatches.forEach((swatch, index) => {
      swatch.toggleClass("is-selected", COLORS[index] === this.color);
    });
  }

  private async save(): Promise<void> {
    if (this.saving) return;
    const name = this.name.trim();
    if (!name) {
      new Notice("Alışkanlık adı boş olamaz.");
      return;
    }

    let target: number | undefined;
    if (this.kind === "numeric") {
      const parsed = Number.parseFloat(this.target.trim().replace(",", "."));
      if (!Number.isFinite(parsed) || parsed <= 0) {
        new Notice("Hedef 0'dan büyük bir sayı olmalı.");
        return;
      }
      target = parsed;
    }

    let minimum: number | undefined;
    if (this.kind === "numeric" && this.minimum.trim()) {
      const parsed = Number.parseFloat(this.minimum.trim().replace(",", "."));
      if (!Number.isFinite(parsed) || parsed <= 0) {
        new Notice("Minimum sürüm 0'dan büyük olmalı.");
        return;
      }
      if (target !== undefined && parsed > target) {
        new Notice("Minimum sürüm, hedeften büyük olamaz.");
        return;
      }
      minimum = parsed;
    }

    let quickValue: number | undefined;
    if (this.kind === "numeric" && this.quickValue.trim()) {
      const parsed = Number.parseFloat(this.quickValue.trim().replace(",", "."));
      if (!Number.isFinite(parsed) || parsed <= 0) {
        new Notice("Hızlı değer 0'dan büyük olmalı.");
        return;
      }
      quickValue = parsed;
    }

    const intervalDays = this.cadence === "daily" ? this.intervalValue() : undefined;
    if (this.intervalDays.trim()) {
      const raw = Number.parseFloat(this.intervalDays.trim().replace(",", "."));
      if (!Number.isFinite(raw) || (raw !== 1 && (raw < 2 || raw > 365 || !Number.isInteger(raw)))) {
        new Notice("Esnek tekrar boş, 1 veya 2–365 arasında tam sayı olmalı.");
        return;
      }
    }

    let weeklyGoal: number | undefined;
    if (this.cadence === "daily" && !intervalDays && this.weeklyGoal.trim()) {
      const parsed = Number.parseFloat(this.weeklyGoal.trim().replace(",", "."));
      if (!Number.isFinite(parsed) || parsed <= 0) {
        new Notice("Haftalık hedef 0'dan büyük olmalı.");
        return;
      }
      if (this.kind === "check" && (!Number.isInteger(parsed) || parsed > 7)) {
        new Notice("Haftalık gün hedefi 1–7 arasında tam sayı olmalı.");
        return;
      }
      if (this.kind === "check" && parsed > this.scheduleDays.length) {
        new Notice("Haftalık hedef, seçili gün sayısından fazla olamaz.");
        return;
      }
      weeklyGoal = parsed;
    }

    let pausedFrom: string | undefined;
    let pausedUntil: string | undefined;
    if (this.cadence === "daily" && (this.pausedFrom || this.pausedUntil)) {
      if (!this.pausedFrom || !this.pausedUntil) {
        new Notice("Mola için başlangıç ve bitiş tarihi birlikte gerekli.");
        return;
      }
      if (this.pausedFrom > this.pausedUntil) {
        new Notice("Mola başlangıcı bitişten sonra olamaz.");
        return;
      }
      pausedFrom = this.pausedFrom;
      pausedUntil = this.pausedUntil;
    }

    let stackAfter = this.cadence === "daily" ? this.stackAfter || undefined : undefined;
    if (
      stackAfter &&
      this.habit &&
      wouldCreateStackCycle(this.options.habits ?? [], this.habit.id, stackAfter)
    ) {
      new Notice("Bu bağlantı bir döngü oluşturuyor.");
      return;
    }

    const emoji = Array.from(this.emoji.trim()).slice(0, 2).join("") || "•";
    const draft: HabitDraft = {
      name,
      emoji,
      kind: this.kind,
      cadence: this.cadence,
      unit: this.kind === "numeric" ? this.unit.trim() || undefined : undefined,
      target,
      minimum,
      quickValue,
      intervalDays,
      weeklyGoal: this.cadence === "daily" && !intervalDays ? weeklyGoal : undefined,
      scheduleDays:
        this.cadence === "daily" && !intervalDays && this.scheduleDays.length !== 7
          ? normalizeScheduleDays(this.scheduleDays)
          : undefined,
      pausedFrom,
      pausedUntil,
      stackAfter,
      dayPart: this.cadence === "daily" ? normalizeDayPart(this.dayPart) : undefined,
      color: this.color,
      docPath: this.docPath.trim() || undefined,
    };

    this.saving = true;
    try {
      await this.options.onSave(draft);
      this.close();
    } catch (error) {
      this.saving = false;
      const message = error instanceof Error ? error.message : String(error);
      new Notice(`Kalp Ritmi: kaydedilemedi. ${message}`, 10000);
    }
  }

  private async archive(): Promise<void> {
    if (!this.options.onArchive) return;

    try {
      await this.options.onArchive();
      this.close();
      new Notice("Alışkanlık arşivlendi. Ayarlar > Arşiv'den geri alabilirsin.");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      new Notice(`Kalp Ritmi: arşivlenemedi. ${message}`, 10000);
    }
  }

  private confirmDelete(): void {
    if (!this.habit || !this.options.onDelete) return;

    new ConfirmDeleteModal(this.app, this.habit.name, async () => {
      await this.options.onDelete?.();
      this.close();
    }).open();
  }
}

export class ConfirmDeleteModal extends Modal {
  constructor(
    app: App,
    private readonly habitName: string,
    private readonly onConfirm: () => Promise<void>,
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Alışkanlık silinsin mi?" });

    contentEl.createEl("p", {
      text:
        `"${this.habitName}" panodan ve tanım dosyasından kaldırılacak. ` +
        "Geçmiş log satırları dosyada kalır ama artık panoda görünmez.",
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
        new Notice(`Kalp Ritmi: silinemedi. ${message}`, 10000);
      }
    };
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
