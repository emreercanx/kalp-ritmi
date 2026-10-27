import { describe, expect, it } from "vitest";
import { buildWeeklyReview } from "./review";
import type { Habit } from "./types";

function habit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: "h",
    name: "Test",
    emoji: "•",
    kind: "check",
    color: "#000",
    createdAt: "2026-10-26",
    log: {},
    ...overrides,
  };
}

describe("buildWeeklyReview", () => {
  it("summarizes perfect days, skips, goals and reflections", () => {
    const review = buildWeeklyReview(
      [
        habit({
          id: "a",
          name: "Yürüyüş",
          log: { "2026-10-26": 1, "2026-10-27": 1 },
          skips: { "2026-10-28": "yolculuk" },
        }),
        habit({
          id: "b",
          name: "Su",
          kind: "numeric",
          target: 10,
          minimum: 5,
          unit: "bardak",
          weeklyGoal: 20,
          log: { "2026-10-26": 5, "2026-10-27": 10 },
        }),
        habit({
          id: "w",
          name: "Haftalık",
          cadence: "weekly",
          log: { "2026-10-26": 1 },
        }),
      ],
      {
        today: "2026-10-28",
        weekStart: 1,
        hijri: "16 Cemaziyelevvel 1448",
        note: "Bu hafta daha sakin ilerledim.",
      },
    );

    expect(review).toContain("# Kalp Ritmi haftalık değerlendirmesi — 26–28 Ekim 2026");
    expect(review).toContain("_16 Cemaziyelevvel 1448_");
    expect(review).toContain("- Genel tamamlama: %80 (4/5 beklenen gün)");
    expect(review).toContain("- Perfect day: 2 gün");
    expect(review).toContain("- Atlanan gün: 1 · Molada: 0");
    expect(review).toContain("| • Yürüyüş | 2 | 2 | %100 | 2 gün | — |");
    expect(review).toContain("| • Su | 2 | 3 | %67 | 2 gün | 15/20 bardak |");
    expect(review).toContain("## Dönemlik alışkanlıklar");
    expect(review).toContain("## Haftanın notu");
    expect(review).toContain("Bu hafta daha sakin ilerledim.");
    expect(review).toContain("- En istikrarlı: • Yürüyüş (%100)");
    expect(review).toContain("- Destek gerekebilir: • Su (%67)");
  });

  it("handles an empty week without pretending there is data", () => {
    const review = buildWeeklyReview([], { today: "2026-10-26", weekStart: 1 });
    expect(review).toContain("- Genel tamamlama: — (0/0 beklenen gün)");
    expect(review).toContain("_Etkin günlük alışkanlık yok._");
    expect(review).toContain("Bu hafta değerlendirilecek tamamlanmış gün yok.");
  });
});
