import { App, Modal, Notice, Setting } from "obsidian";
import {
  CUSTOM_LOCATION,
  findLocation,
  TURKEY_LOCATIONS,
} from "../core/locations";
import {
  PRAYER_METHODS,
  type PrayerMadhab,
  type PrayerMethodId,
} from "../core/prayer";
import {
  normalizeHabitDocFolder,
  normalizeQuickTodoPath,
  type RitimSettings,
} from "../core/settings";
import type { Habit } from "../core/types";
import { FolderSuggestModal, MarkdownFileSuggestModal } from "./file-suggest";

interface SettingsModalOptions {
  onSave: (settings: RitimSettings) => Promise<void>;
  archivedHabits?: Habit[];
  onUnarchive?: (habit: Habit) => Promise<void>;
}

interface TextValueControl {
  setValue(value: string): unknown;
}

interface DropdownValueControl {
  setValue(value: string): unknown;
}

export class SettingsModal extends Modal {
  private visibleDays: number;
  private visibleWeeks: number;
  private visibleMonths: number;
  private weekStart: 0 | 1;
  private cutoffHour: number;
  private habitDocFolder: string;
  private quickTodoPath: string;
  private hijriEnabled: boolean;
  private hijriOffset: number;
  private hijriRows: Setting[] = [];
  private prayerEnabled: boolean;
  private prayerCity: string;
  private prayerLatitude: string;
  private prayerLongitude: string;
  private prayerMethod: PrayerMethodId;
  private prayerMadhab: PrayerMadhab;
  private prayerRows: Setting[] = [];
  private latitudeInput: TextValueControl | null = null;
  private longitudeInput: TextValueControl | null = null;
  private citySelect: DropdownValueControl | null = null;
  private docFolderInput: TextValueControl | null = null;
  private quickTodoInput: TextValueControl | null = null;
  private applyingPreset = false;

  constructor(
    app: App,
    settings: RitimSettings,
    private readonly options: SettingsModalOptions,
  ) {
    super(app);
    this.visibleDays = settings.visibleDays;
    this.visibleWeeks = settings.visibleWeeks;
    this.visibleMonths = settings.visibleMonths;
    this.weekStart = settings.weekStart;
    this.cutoffHour = settings.cutoffHour;
    this.habitDocFolder = settings.habitDocFolder;
    this.quickTodoPath = settings.quickTodoPath;
    this.hijriEnabled = settings.hijriEnabled;
    this.hijriOffset = settings.hijriOffset;
    this.prayerEnabled = settings.prayerEnabled;
    this.prayerCity = settings.prayerCity;
    this.prayerLatitude = String(settings.prayerLatitude);
    this.prayerLongitude = String(settings.prayerLongitude);
    this.prayerMethod = settings.prayerMethod;
    this.prayerMadhab = settings.prayerMadhab;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    this.modalEl.addClass("ritim-settings-modal");
    this.hijriRows = [];
    this.prayerRows = [];
    this.applyingPreset = false;

    contentEl.createEl("h2", { text: "Kalp Ritmi ayarları" });
    contentEl.createDiv({
      text: "Pano, toplamlar ve namaz vakitleri bu ayarlara göre hesaplanır.",
      cls: "ritim-muted",
    });

    contentEl.createEl("h3", { text: "Pano", cls: "ritim-settings-heading" });

    new Setting(contentEl)
      .setName("Görünen gün")
      .setDesc("Panodaki gün sütunu sayısı (3–14).")
      .addDropdown((dropdown) => {
        for (let days = 3; days <= 14; days++) {
          dropdown.addOption(String(days), `${days} gün`);
        }
        dropdown.setValue(String(this.visibleDays));
        dropdown.onChange((value) => {
          this.visibleDays = Number(value);
        });
      });

    new Setting(contentEl)
      .setName("Hafta başlangıcı")
      .setDesc(
        "Haftalık pano bu günden başlar. " +
          "Haftalık kayıt girdikten sonra değiştirmek eski haftaların hizasını kaydırabilir.",
      )
      .addDropdown((dropdown) => {
        dropdown.addOption("1", "Pazartesi");
        dropdown.addOption("0", "Pazar");
        dropdown.setValue(String(this.weekStart));
        dropdown.onChange((value) => {
          this.weekStart = value === "0" ? 0 : 1;
        });
      });

    new Setting(contentEl)
      .setName("Gün dönümü")
      .setDesc(
        "Bu saatten önce yapılan kayıtlar önceki güne sayılır. " +
          "Gece çalışanlar veya yatsıdan sonra girenler için kullanışlıdır.",
      )
      .addDropdown((dropdown) => {
        dropdown.addOption("0", "00:00");
        dropdown.addOption("3", "03:00");
        dropdown.addOption("4", "04:00");
        dropdown.addOption("5", "05:00");
        dropdown.setValue(String(this.cutoffHour));
        dropdown.onChange((value) => {
          this.cutoffHour = Number(value);
        });
      });

    contentEl.createEl("h3", {
      text: "Dönemlik panolar",
      cls: "ritim-settings-heading",
    });

    new Setting(contentEl)
      .setName("Görünen hafta")
      .setDesc("Haftalık alışkanlık panosundaki hafta sütunu sayısı (2–8).")
      .addDropdown((dropdown) => {
        for (let weeks = 2; weeks <= 8; weeks++) {
          dropdown.addOption(String(weeks), `${weeks} hafta`);
        }
        dropdown.setValue(String(this.visibleWeeks));
        dropdown.onChange((value) => {
          this.visibleWeeks = Number(value);
        });
      });

    new Setting(contentEl)
      .setName("Görünen ay")
      .setDesc("Aylık alışkanlık panosundaki ay sütunu sayısı (3–12).")
      .addDropdown((dropdown) => {
        for (let months = 3; months <= 12; months++) {
          dropdown.addOption(String(months), `${months} ay`);
        }
        dropdown.setValue(String(this.visibleMonths));
        dropdown.onChange((value) => {
          this.visibleMonths = Number(value);
        });
      });

    contentEl.createEl("h3", { text: "Alışkanlık notları", cls: "ritim-settings-heading" });

    new Setting(contentEl)
      .setName("MD klasörü")
      .setDesc("Otomatik oluşturulan alışkanlık dosyaları bu klasöre yazılır.")
      .addText((text) => {
        text.setValue(this.habitDocFolder);
        this.docFolderInput = text;
        text.onChange((value) => {
          this.habitDocFolder = value;
        });
      })
      .addButton((button) => {
        button.setButtonText("Klasör seç");
        button.onClick(() => {
          new FolderSuggestModal(this.app, (folder) => {
            this.habitDocFolder = folder.path;
            this.docFolderInput?.setValue(folder.path);
          }).open();
        });
      });

    contentEl.createEl("h3", {
      text: "Hızlı yapılacaklar",
      cls: "ritim-settings-heading",
    });

    new Setting(contentEl)
      .setName("Todo dosyası")
      .setDesc(
        "Şimşek düğmesi görevleri bu Markdown dosyasına ekler. " +
          "Widget için aynı dosyayı seç; dosya yoksa ilk görevde oluşturulur.",
      )
      .addText((text) => {
        text.setValue(this.quickTodoPath);
        this.quickTodoInput = text;
        text.onChange((value) => {
          this.quickTodoPath = value;
        });
      })
      .addButton((button) => {
        button.setButtonText("Dosya seç");
        button.onClick(() => {
          new MarkdownFileSuggestModal(this.app, (file) => {
            this.quickTodoPath = file.path;
            this.quickTodoInput?.setValue(file.path);
          }).open();
        });
      });

    contentEl.createEl("h3", { text: "Hicri takvim", cls: "ritim-settings-heading" });

    new Setting(contentEl)
      .setName("Hicri tarihi göster")
      .setDesc("Başlıkta Ümmü'l-Kura takvimine göre Hicri tarihi gösterir.")
      .addToggle((toggle) => {
        toggle.setValue(this.hijriEnabled);
        toggle.onChange((value) => {
          this.hijriEnabled = value;
          this.updateHijriVisibility();
        });
      });

    this.hijriRows.push(
      new Setting(contentEl)
        .setName("Hicri gün kaydırma")
        .setDesc("Diyanet takvimiyle bir günlük fark varsa buradan düzelt.")
        .addDropdown((dropdown) => {
          dropdown.addOption("-2", "−2 gün");
          dropdown.addOption("-1", "−1 gün");
          dropdown.addOption("0", "Kaydırma yok");
          dropdown.addOption("1", "+1 gün");
          dropdown.addOption("2", "+2 gün");
          dropdown.setValue(String(this.hijriOffset));
          dropdown.onChange((value) => {
            this.hijriOffset = Number(value);
          });
        }),
    );

    contentEl.createEl("h3", { text: "Namaz vakitleri", cls: "ritim-settings-heading" });

    new Setting(contentEl)
      .setName("Vakit şeridini göster")
      .setDesc("Panonun üstünde günün vakitlerini ve sıradaki vakti gösterir.")
      .addToggle((toggle) => {
        toggle.setValue(this.prayerEnabled);
        toggle.onChange((value) => {
          this.prayerEnabled = value;
          this.updatePrayerVisibility();
        });
      });

    this.prayerRows.push(
      new Setting(contentEl)
        .setName("Şehir")
        .setDesc("Listede yoksa 'Özel konum' seçip enlem ve boylam gir.")
        .addDropdown((dropdown) => {
          for (const location of TURKEY_LOCATIONS) {
            dropdown.addOption(location.name, location.name);
          }
          dropdown.addOption(CUSTOM_LOCATION, CUSTOM_LOCATION);
          const known = findLocation(this.prayerCity);
          dropdown.setValue(known ? known.name : CUSTOM_LOCATION);
          this.citySelect = dropdown;
          dropdown.onChange((value) => {
            if (value === CUSTOM_LOCATION) {
              this.prayerCity = CUSTOM_LOCATION;
              return;
            }
            const location = findLocation(value);
            if (location) this.applyPreset(location.name, location.latitude, location.longitude);
          });
        }),
    );

    this.prayerRows.push(
      new Setting(contentEl)
        .setName("Enlem")
        .setDesc("Kuzey pozitif, güney negatif. Örnek: 41,0082.")
        .addText((text) => {
          text.inputEl.type = "number";
          text.inputEl.step = "any";
          text.inputEl.addClass("ritim-coord-input");
          text.setValue(this.prayerLatitude);
          this.latitudeInput = text;
          text.onChange((value) => {
            this.prayerLatitude = value;
            this.markCustom();
          });
        }),
    );

    this.prayerRows.push(
      new Setting(contentEl)
        .setName("Boylam")
        .setDesc("Doğu pozitif, batı negatif. Örnek: 28,9784.")
        .addText((text) => {
          text.inputEl.type = "number";
          text.inputEl.step = "any";
          text.inputEl.addClass("ritim-coord-input");
          text.setValue(this.prayerLongitude);
          this.longitudeInput = text;
          text.onChange((value) => {
            this.prayerLongitude = value;
            this.markCustom();
          });
        }),
    );

    this.prayerRows.push(
      new Setting(contentEl)
        .setName("Hesaplama yöntemi")
        .setDesc("Varsayılan Diyanet yöntemidir.")
        .addDropdown((dropdown) => {
          for (const method of PRAYER_METHODS) {
            dropdown.addOption(method.id, method.label);
          }
          dropdown.setValue(this.prayerMethod);
          dropdown.onChange((value) => {
            this.prayerMethod = value as PrayerMethodId;
          });
        }),
    );

    this.prayerRows.push(
      new Setting(contentEl)
        .setName("İkindi mezhebi")
        .setDesc("Türkiye'de yaygın kabul Hanefi'dir.")
        .addDropdown((dropdown) => {
          dropdown.addOption("hanefi", "Hanefi");
          dropdown.addOption("safi", "Şafii");
          dropdown.setValue(this.prayerMadhab);
          dropdown.onChange((value) => {
            this.prayerMadhab = value === "safi" ? "safi" : "hanefi";
          });
        }),
    );

    contentEl.createDiv({
      cls: "ritim-settings-note",
      text:
        "Vakitlere dokununca ilgili namaz alışkanlığı yoksa oluşturulur ve o gün işaretlenir. " +
        "Vakitler cihazda hesaplanır; ağ isteği gönderilmez. " +
        "Resmî vakitler için bulunduğun yerin Diyanet takvimini esas al.",
    });

    this.updateHijriVisibility();
    this.updatePrayerVisibility();
    this.renderArchive(contentEl);

    const footer = contentEl.createDiv({ cls: "ritim-modal-footer" });

    const cancel = footer.createEl("button", { text: "Vazgeç" });
    cancel.type = "button";
    cancel.onclick = () => this.close();

    const save = footer.createEl("button", { text: "Kaydet", cls: "mod-cta" });
    save.type = "button";
    save.onclick = () => void this.save();
  }

  onClose(): void {
    this.contentEl.empty();
    this.modalEl.removeClass("ritim-settings-modal");
    this.hijriRows = [];
    this.prayerRows = [];
    this.latitudeInput = null;
    this.longitudeInput = null;
    this.citySelect = null;
    this.docFolderInput = null;
    this.quickTodoInput = null;
  }

  private renderArchive(root: HTMLElement): void {
    const habits = this.options.archivedHabits ?? [];
    if (habits.length === 0 || !this.options.onUnarchive) return;

    root.createEl("h3", { text: "Arşiv", cls: "ritim-settings-heading" });
    root.createDiv({
      text: "Arşivdeki alışkanlıklar panoda görünmez; geçmişleri korunur.",
      cls: "ritim-muted",
    });

    const list = root.createDiv({ cls: "ritim-archive-list" });
    for (const habit of habits) {
      const row = new Setting(list)
        .setName(`${habit.emoji} ${habit.name}`)
        .setDesc("Panoda gizli");
      row.addButton((button) => {
        button.setButtonText("Geri al");
        button.onClick(async () => {
          button.setDisabled(true);
          try {
            await this.options.onUnarchive?.(habit);
            row.settingEl.remove();
            new Notice("Alışkanlık arşivden geri alındı.");
          } catch (error) {
            button.setDisabled(false);
            const message = error instanceof Error ? error.message : String(error);
            new Notice(`Kalp Ritmi: geri alınamadı. ${message}`, 10000);
          }
        });
      });
    }
  }

  private applyPreset(name: string, latitude: number, longitude: number): void {
    this.applyingPreset = true;
    this.prayerCity = name;
    this.prayerLatitude = String(latitude);
    this.prayerLongitude = String(longitude);
    this.latitudeInput?.setValue(this.prayerLatitude);
    this.longitudeInput?.setValue(this.prayerLongitude);
    this.applyingPreset = false;
  }

  private markCustom(): void {
    if (this.applyingPreset) return;
    this.prayerCity = CUSTOM_LOCATION;
    this.citySelect?.setValue(CUSTOM_LOCATION);
  }

  private updateHijriVisibility(): void {
    for (const row of this.hijriRows) {
      row.settingEl.toggleClass("ritim-hidden", !this.hijriEnabled);
    }
  }

  private updatePrayerVisibility(): void {
    for (const row of this.prayerRows) {
      row.settingEl.toggleClass("ritim-hidden", !this.prayerEnabled);
    }
  }

  private async save(): Promise<void> {
    try {
      const latitude = Number.parseFloat(this.prayerLatitude.replace(",", "."));
      const longitude = Number.parseFloat(this.prayerLongitude.replace(",", "."));

      if (
        this.prayerEnabled &&
        (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)
      ) {
        throw new Error("Enlem -90 ile 90 arasında olmalı.");
      }
      if (
        this.prayerEnabled &&
        (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)
      ) {
        throw new Error("Boylam -180 ile 180 arasında olmalı.");
      }

      await this.options.onSave({
        visibleDays: this.visibleDays,
        visibleWeeks: this.visibleWeeks,
        visibleMonths: this.visibleMonths,
        weekStart: this.weekStart,
        cutoffHour: this.cutoffHour,
        habitDocFolder: normalizeHabitDocFolder(this.habitDocFolder),
        quickTodoPath: normalizeQuickTodoPath(this.quickTodoPath),
        hijriEnabled: this.hijriEnabled,
        hijriOffset: this.hijriOffset,
        prayerEnabled: this.prayerEnabled,
        prayerCity: this.prayerCity,
        prayerLatitude: latitude,
        prayerLongitude: longitude,
        prayerMethod: this.prayerMethod,
        prayerMadhab: this.prayerMadhab,
      });
      this.close();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      new Notice(`Kalp Ritmi: ayarlar kaydedilemedi. ${message}`, 10000);
    }
  }
}
