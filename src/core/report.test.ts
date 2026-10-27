import { describe, expect, it } from "vitest";
import { buildMarkdownReport } from "./report";
import type { Habit } from "./types";

function habit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: "h",
    name: "Test",
    emoji: "•",
    kind: "check",
    color: "#000",
    createdAt: "2026-10-01",
    log: {},
    ...overrides,
  };
}

describe("buildMarkdownReport", () => {
  it("includes overall score, ranges and weekly goals", () => {
    const report = buildMarkdownReport(
      [
        habit({
          name: "Su | bardak",
          kind: "numeric",
          target: 8,
          unit: "bardak",
          weeklyGoal: 30,
          createdAt: "2026-10-26",
          log: { "2026-10-26": 8, "2026-10-25": 6 },
        }),
        habit({
          id: "check",
          name: "Yürüyüş",
          emoji: "🚶",
          createdAt: "2026-10-26",
          log: { "2026-10-26": 1 },
        }),
      ],
      {
        today: "2026-10-26",
        weekStart: 1,
        hijri: "14 Cemaziyelevvel 1448",
        note: "Bugün su hedefini tamamladım.",
      },
    );

    expect(report).toContain("# Kalp Ritmi raporu — Pazartesi, 26 Ekim 2026");
    expect(report).toContain("_14 Cemaziyelevvel 1448_");
    expect(report).toContain("- Genel skor: %75");
    expect(report).toContain("| • Su \\| bardak | 8 bardak | 8 | 14 | 1 gün | %50 | 8/30 bardak |");
    expect(report).toContain("## Günün notu");
    expect(report).toContain("Bugün su hedefini tamamladım.");
    expect(report).toContain("| 🚶 Yürüyüş | ✓ | 1/1 | 1/1 | 1 gün | %100 | — |");
  });

  it("separates weekly and monthly habits from the daily table", () => {
    const report = buildMarkdownReport(
      [
        habit({ name: "Günlük", log: { "2026-10-26": 1 } }),
        habit({
          id: "week",
          name: "Haftalık",
          cadence: "weekly",
          log: { "2026-10-26": 1 },
        }),
        habit({
          id: "month",
          name: "Aylık",
          cadence: "monthly",
          kind: "numeric",
          target: 4,
          unit: "kitap",
          log: { "2026-10-01": 3 },
        }),
      ],
      { today: "2026-10-26", weekStart: 1 },
    );

    expect(report).toContain("## Günlük alışkanlıklar");
    expect(report).toContain("| • Haftalık | Haftalık | ✓ | 1 hafta |");
    expect(report).toContain("| • Aylık | Aylık | 3 / 4 kitap | 0 ay |");
  });

  it("lists archived habits separately", () => {
    const report = buildMarkdownReport(
      [
        habit({ name: "Etkin" }),
        habit({ id: "old", name: "Eski", archived: true }),
      ],
      { today: "2026-10-26", weekStart: 1 },
    );

    expect(report).toContain("- Etkin alışkanlık: 1");
    expect(report).toContain("- Arşivde: 1");
    expect(report).toContain("## Arşiv");
    expect(report).toContain("- • Eski");
  });
});
