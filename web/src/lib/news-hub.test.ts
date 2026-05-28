import { describe, it, expect } from "vitest";
import { buildNewsHubItems, isRecent, NEWS_HUB_CATEGORY_LABEL } from "@/lib/news-hub";

describe("P1-2/P1-3 新着ハブ アグリゲータ", () => {
  const items = buildNewsHubItems();

  it("複数カテゴリの項目を集約する", () => {
    expect(items.length).toBeGreaterThan(5);
    const cats = new Set(items.map((i) => i.category));
    expect(cats.has("law-revision")).toBe(true);
    expect(cats.has("notice")).toBe(true);
  });

  it("全項目が日付・出典URL・タイトルを持つ（事実の集約）", () => {
    for (const i of items) {
      expect(i.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(i.title.length).toBeGreaterThan(0);
      expect(i.url.length).toBeGreaterThan(0);
      expect(NEWS_HUB_CATEGORY_LABEL[i.category]).toBeTruthy();
    }
  });

  it("日付降順でソートされている", () => {
    for (let k = 1; k < items.length; k++) {
      expect(items[k - 1].date >= items[k].date).toBe(true);
    }
  });

  it("法改正項目は施行ステータスバッジを持つ", () => {
    const law = items.find((i) => i.category === "law-revision");
    expect(law?.badge).toBeTruthy();
  });

  it("isRecent: 過去30日以内を新着と判定", () => {
    const now = new Date(2026, 4, 29);
    expect(isRecent("2026-05-20", 30, now)).toBe(true);
    expect(isRecent("2026-01-01", 30, now)).toBe(false);
    expect(isRecent("2099-01-01", 30, now)).toBe(false); // 未来は新着扱いしない
  });
});
