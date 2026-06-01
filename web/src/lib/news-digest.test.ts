import { describe, it, expect } from "vitest";
import {
  buildMonthlyDigest,
  filterItemsForIndustry,
  buildIndustryDigest,
  NEWSLETTER_INDUSTRY_TO_TAG,
} from "@/lib/news-digest";
import type { NewsHubItem } from "@/lib/news-hub-types";

const items: NewsHubItem[] = [
  { id: "l1", category: "law-revision", title: "安衛則改正A", summary: "x", date: "2026-06-01", url: "https://laws.e-gov.go.jp/law/X", badge: "施行前（あと3日）" },
  { id: "l2", category: "law-revision", title: "安衛法改正B", summary: "y", date: "2026-04-01", url: "https://laws.e-gov.go.jp/law/Y", badge: "施行済" },
  { id: "a1", category: "accident", title: "月次速報", summary: "z", date: "2026-05-27", url: "https://anzeninfo.mhlw.go.jp/" },
  { id: "n1", category: "notice", title: "通達C <test>", summary: "w", date: "2026-05-20", url: "https://www.mhlw.go.jp/" },
];

describe("P3-1 月次ダイジェスト本文", () => {
  const d = buildMonthlyDigest({ items, monthLabel: "2026年5月" });

  it("件名に月ラベルと施行前件数を含む", () => {
    expect(d.subject).toContain("2026年5月");
    expect(d.subject).toContain("施行前1件");
  });

  it("本文に法改正・事故・通達と公式リンクを含む", () => {
    expect(d.text).toContain("安衛則改正A");
    expect(d.text).toContain("月次速報");
    expect(d.text).toContain("https://laws.e-gov.go.jp/law/X");
  });

  it("解除導線（ワンクリック）を必ず含む", () => {
    expect(d.text).toContain("配信停止");
    expect(d.html).toContain("配信停止");
  });

  it("HTMLはエスケープされる", () => {
    expect(d.html).toContain("通達C &lt;test&gt;");
    expect(d.html).not.toContain("通達C <test>");
  });

  it("カスタム解除URLを使える", () => {
    const d2 = buildMonthlyDigest({ items, monthLabel: "2026年5月", unsubscribeUrl: "https://x/unsub?t=abc" });
    expect(d2.text).toContain("https://x/unsub?t=abc");
  });
});

describe("業種別セグメント配信（filterItemsForIndustry / buildIndustryDigest）", () => {
  // 業種タグ付きの法改正項目
  const segItems: NewsHubItem[] = [
    { id: "lc", category: "law-revision", title: "足場規制改正（建設）", summary: "", date: "2026-06-01", url: "https://e/c", industries: ["construction"] },
    { id: "lm", category: "law-revision", title: "局排規制改正（製造）", summary: "", date: "2026-06-01", url: "https://e/m", industries: ["manufacturing"] },
    { id: "lall", category: "law-revision", title: "全業種共通の改正", summary: "", date: "2026-06-01", url: "https://e/all", industries: [] },
    { id: "acc", category: "accident", title: "労災速報（全業種）", summary: "", date: "2026-05-27", url: "https://a" },
    { id: "not", category: "notice", title: "通達（全業種）", summary: "", date: "2026-05-20", url: "https://n" },
  ];

  it("建設業はconstruction改正＋全業種改正＋一般情報のみ（製造専用は除外）", () => {
    const out = filterItemsForIndustry(segItems, "construction").map((i) => i.id);
    expect(out).toContain("lc");
    expect(out).toContain("lall");
    expect(out).toContain("acc");
    expect(out).toContain("not");
    expect(out).not.toContain("lm"); // 製造専用は出さない
  });

  it("製造業はmanufacturing改正＋全業種改正＋一般情報のみ", () => {
    const out = filterItemsForIndustry(segItems, "manufacturing").map((i) => i.id);
    expect(out).toContain("lm");
    expect(out).toContain("lall");
    expect(out).not.toContain("lc");
  });

  it("tag=null（IT/その他/未指定）は一切絞らず全件", () => {
    expect(filterItemsForIndustry(segItems, null)).toHaveLength(segItems.length);
  });

  it("一般情報（事故・通達）は業種に依らず常に含む", () => {
    for (const tag of ["construction", "manufacturing", "healthcare", "transport"]) {
      const out = filterItemsForIndustry(segItems, tag).map((i) => i.id);
      expect(out).toContain("acc");
      expect(out).toContain("not");
    }
  });

  it("購読者業種ラベル→タグ対応（IT/その他は全業種=null）", () => {
    expect(NEWSLETTER_INDUSTRY_TO_TAG["建設"]).toBe("construction");
    expect(NEWSLETTER_INDUSTRY_TO_TAG["製造"]).toBe("manufacturing");
    expect(NEWSLETTER_INDUSTRY_TO_TAG["IT"]).toBeNull();
    expect(NEWSLETTER_INDUSTRY_TO_TAG["その他"]).toBeNull();
  });

  it("buildIndustryDigest: 建設購読者の件名に（建設向け）、製造専用改正は本文に出ない", () => {
    const d = buildIndustryDigest(segItems, "2026年6月", "建設");
    expect(d.subject).toContain("（建設向け）");
    expect(d.text).toContain("足場規制改正（建設）");
    expect(d.text).toContain("全業種共通の改正");
    expect(d.text).not.toContain("局排規制改正（製造）");
  });

  it("buildIndustryDigest: その他/未指定は全業種向け（件名に業種ラベル無し・全改正掲載）", () => {
    const d = buildIndustryDigest(segItems, "2026年6月", "その他");
    expect(d.subject).not.toContain("向け）");
    expect(d.text).toContain("足場規制改正（建設）");
    expect(d.text).toContain("局排規制改正（製造）");
  });
});
