import { describe, it, expect } from "vitest";
import { capEntries, MAX_DIARY_ENTRIES } from "./store";
import type { SafetyDiaryEntry } from "./schema";

function makeEntry(updatedAt: string): SafetyDiaryEntry {
  return {
    id: `id-${updatedAt}`,
    industry: "construction",
    required: {
      date: updatedAt.slice(0, 10),
      weather: "晴れ",
      siteName: "test",
      workContent: "test",
      kyResult: "",
      nearMissOccurred: false,
    },
    optional: {
      contractorWorks: [],
      requiredQualifications: [],
      predictedDisasters: [],
    },
    weatherAlerts: [],
    similarAccidentIds: [],
    relatedLawRevisionIds: [],
    createdAt: updatedAt,
    updatedAt,
  };
}

describe("capEntries (localStorage 肥大化対策)", () => {
  it("MAX_DIARY_ENTRIES 以下なら全件保持する", () => {
    const entries = Array.from({ length: 10 }, (_, i) =>
      makeEntry(`2026-04-${String(i + 1).padStart(2, "0")}T00:00:00.000Z`),
    );
    expect(capEntries(entries)).toHaveLength(10);
  });

  it("MAX_DIARY_ENTRIES を超える場合は新しい順に切り詰める", () => {
    const total = MAX_DIARY_ENTRIES + 10;
    const entries: SafetyDiaryEntry[] = [];
    for (let i = 0; i < total; i++) {
      const d = new Date("2024-01-01T00:00:00.000Z");
      d.setUTCDate(d.getUTCDate() + i);
      entries.push(makeEntry(d.toISOString()));
    }

    const capped = capEntries(entries);
    expect(capped).toHaveLength(MAX_DIARY_ENTRIES);
    // 最新 10 件が必ず残る（古い 10 件が落ちる）
    const oldestRetained = capped[capped.length - 1].updatedAt;
    const oldestOriginal = entries[0].updatedAt;
    expect(oldestRetained > oldestOriginal).toBe(true);
  });

  it("入力配列を破壊しない（純粋関数）", () => {
    const entries = [
      makeEntry("2026-01-01T00:00:00.000Z"),
      makeEntry("2026-02-01T00:00:00.000Z"),
    ];
    const before = JSON.stringify(entries);
    capEntries(entries);
    expect(JSON.stringify(entries)).toBe(before);
  });

  it("365 件 (1 年分) のシミュレーション: 件数キャップとソート性能", () => {
    const entries = Array.from({ length: 365 }, (_, i) => {
      const d = new Date("2025-04-19T00:00:00.000Z");
      d.setUTCDate(d.getUTCDate() + i);
      return makeEntry(d.toISOString());
    });
    const start = performance.now();
    const capped = capEntries(entries);
    const elapsed = performance.now() - start;

    expect(capped).toHaveLength(365);
    // 365 件のソートは現代マシンで 50ms 未満を想定（CI 余裕含めて 200ms）
    expect(elapsed).toBeLessThan(200);
  });

  it("updatedAt 降順で並ぶ", () => {
    const entries = [
      makeEntry("2026-01-15T00:00:00.000Z"),
      makeEntry("2026-04-01T00:00:00.000Z"),
      makeEntry("2026-02-20T00:00:00.000Z"),
    ];
    const capped = capEntries(entries);
    expect(capped[0].updatedAt).toBe("2026-04-01T00:00:00.000Z");
    expect(capped[2].updatedAt).toBe("2026-01-15T00:00:00.000Z");
  });
});
