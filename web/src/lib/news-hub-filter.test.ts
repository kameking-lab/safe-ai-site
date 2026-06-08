import { describe, it, expect } from "vitest";
import {
  type NewsHubItem,
  filterNewsHubItems,
  isNewSince,
  newsItemMatchesIndustry,
} from "@/lib/news-hub-types";

// テスト用の最小データ（業種タグ・カテゴリ・日付の組合せを網羅）
const items: NewsHubItem[] = [
  // 建設専用の法改正（古い）
  { id: "law-c", category: "law-revision", title: "建設法改正", summary: "", date: "2026-05-01", url: "u", industries: ["construction"] },
  // 医療専用の法改正（新しい）
  { id: "law-h", category: "law-revision", title: "医療法改正", summary: "", date: "2026-06-07", url: "u", industries: ["healthcare"] },
  // 全業種向けの法改正（deriveIndustryTags が全タグを付与した想定・新しい）
  { id: "law-all", category: "law-revision", title: "全業種法改正", summary: "", date: "2026-06-06", url: "u", industries: ["construction", "manufacturing", "healthcare"] },
  // 業種非依存の事故速報（industries 無し・新しい）
  { id: "acc", category: "accident", title: "事故速報", summary: "", date: "2026-06-08", url: "u" },
  // 業種非依存の通達（industries 空配列・古い）
  { id: "notice", category: "notice", title: "通達", summary: "", date: "2026-04-01", url: "u", industries: [] },
];

const NONE = { category: "all", industry: "all", newOnly: false, lastVisit: null } as const;

describe("filterNewsHubItems — 新着ハブ絞り込み", () => {
  it("無条件なら全件返す", () => {
    expect(filterNewsHubItems(items, NONE).length).toBe(items.length);
  });

  it("カテゴリで絞る", () => {
    const r = filterNewsHubItems(items, { ...NONE, category: "law-revision" });
    expect(r.map((i) => i.id).sort()).toEqual(["law-all", "law-c", "law-h"]);
  });

  it("業種で絞ると、その業種向け法改正＋業種非依存項目だけ残す（他業種専用は除外）", () => {
    const r = filterNewsHubItems(items, { ...NONE, industry: "construction" });
    const ids = r.map((i) => i.id).sort();
    // 建設専用・全業種・事故・通達は残る。医療専用は除外。
    expect(ids).toEqual(["acc", "law-all", "law-c", "notice"]);
    expect(ids).not.toContain("law-h");
  });

  it("新着のみ（lastVisit 以降）で絞る", () => {
    const r = filterNewsHubItems(items, { ...NONE, newOnly: true, lastVisit: "2026-06-05" });
    // 2026-06-05 より後の日付のみ
    expect(r.map((i) => i.id).sort()).toEqual(["acc", "law-all", "law-h"]);
  });

  it("業種＋新着の複合条件（建設・前回6/05以降）", () => {
    const r = filterNewsHubItems(items, { category: "all", industry: "construction", newOnly: true, lastVisit: "2026-06-05" });
    // 6/05以降かつ建設関連: law-all(全業種), acc(非依存)。law-h(医療専用)は業種で除外。
    expect(r.map((i) => i.id).sort()).toEqual(["acc", "law-all"]);
  });

  it("件数表示(newCount)と新着のみフィルタは同一基準で一致する", () => {
    const lastVisit = "2026-06-05";
    const newCount = items.filter((i) => isNewSince(i, lastVisit)).length;
    const filtered = filterNewsHubItems(items, { category: "all", industry: "all", newOnly: true, lastVisit });
    expect(filtered.length).toBe(newCount);
  });
});

describe("newsItemMatchesIndustry", () => {
  it("業種タグ無しは常にマッチ（業種非依存）", () => {
    expect(newsItemMatchesIndustry(items[3], "construction")).toBe(true); // accident
    expect(newsItemMatchesIndustry(items[4], "healthcare")).toBe(true); // notice (空配列)
  });
  it("特定業種タグは含むときだけマッチ", () => {
    expect(newsItemMatchesIndustry(items[0], "construction")).toBe(true);
    expect(newsItemMatchesIndustry(items[0], "healthcare")).toBe(false);
  });
});
