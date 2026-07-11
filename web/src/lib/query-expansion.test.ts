import { describe, it, expect } from "vitest";
import { expandQuery } from "./query-expansion";
import { searchRelevantArticles } from "./rag-search";

describe("expandQuery", () => {
  it("ヘルメットを保護帽に展開する", () => {
    const expanded = expandQuery("ヘルメットの着用義務はありますか？");
    expect(expanded).toContain("保護帽");
  });

  it("足場を特別教育・技能講習に展開する", () => {
    const expanded = expandQuery("足場の組立てに必要な資格は？");
    expect(expanded).toContain("特別教育");
    expect(expanded).toContain("技能講習");
  });

  it("元請けを元方事業者に展開する", () => {
    const expanded = expandQuery("元請けの安全管理責任は？");
    expect(expanded).toContain("元方事業者");
  });

  it("該当ルールがない場合は元のクエリをそのまま返す", () => {
    const original = "全く関係のないテキストABC";
    expect(expandQuery(original)).toBe(original);
  });

  it("複数のルールが同時に適用される", () => {
    const expanded = expandQuery("ヘルメットと足場の関係");
    expect(expanded).toContain("保護帽");
    expect(expanded).toContain("特別教育");
  });
});

describe("searchRelevantArticles + 4パターン質問", () => {
  it("ヘルメット質問で安衛則の保護帽関連条文がヒットする", () => {
    const articles = searchRelevantArticles("ヘルメットは必ず着用しないといけませんか", 5);
    expect(articles.length).toBeGreaterThan(0);
    const text = articles.map((a) => a.text).join("\n");
    expect(text).toMatch(/保護帽|墜落|飛来落下/);
  });

  it("足場質問で技能講習・特別教育の条文がヒットする", () => {
    const articles = searchRelevantArticles("足場の組立てには何が必要ですか", 5);
    expect(articles.length).toBeGreaterThan(0);
    const allText = articles.map((a) => `${a.articleTitle} ${a.text}`).join("\n");
    expect(allText).toMatch(/足場|特別教育|技能講習|作業主任者/);
  });

  it("元請け質問で元方事業者の条文がヒットする", () => {
    const articles = searchRelevantArticles("元請けの責任は何ですか", 5);
    expect(articles.length).toBeGreaterThan(0);
    const allText = articles.map((a) => `${a.articleTitle} ${a.text}`).join("\n");
    expect(allText).toMatch(/元方事業者|統括/);
  });

  it("カテゴリ絞り込み: 安衛則指定で安衛則の条文のみ返る", () => {
    const articles = searchRelevantArticles("作業主任者の選任", 10, "安衛則");
    expect(articles.length).toBeGreaterThan(0);
    for (const a of articles) {
      expect(a.lawShort).toBe("安衛則");
    }
  });
});

// 法令ナビ 俗称ゆらぎ解決層（docs/horei-navi-foundation-2026-07-11 §2-3）。
// 固定フレーズではなく正規表現の語中一致＝言い回しに依存しないことを固定する。
describe("expandQuery — 荷役運搬機械の現場俗称", () => {
  it("「爪のやつ」（言い回し付き）をフォークリフトに展開する", () => {
    const expanded = expandQuery("爪のやつ");
    expect(expanded).toContain("フォークリフト");
    expect(expanded).toContain("車両系荷役運搬機械");
  });

  it("「ツメの機械」「フォークの部分」等、別の言い回しでも発火する（固定フレーズ過学習でない）", () => {
    expect(expandQuery("ツメの機械の点検")).toContain("フォークリフト");
    expect(expandQuery("フォークの部分に人を乗せていい？")).toContain("フォークリフト");
    expect(expandQuery("パレットに乗って作業")).toContain("フォークリフト");
  });

  it("RAG着地: 「爪のやつ」でフォークリフト関連条文（車両系荷役運搬機械）がヒットする", () => {
    const articles = searchRelevantArticles("爪のやつの資格", 5);
    expect(articles.length).toBeGreaterThan(0);
    const allText = articles
      .map((a) => `${a.articleTitle} ${a.text} ${a.keywords.join(" ")}`)
      .join("\n");
    expect(allText).toMatch(/フォークリフト|車両系荷役運搬機械/);
  });
});
