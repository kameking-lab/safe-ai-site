import { describe, it, expect } from "vitest";
import { LAW_NAVI_TOPICS, topicsForArticle, findLawNaviTopic } from "./topics";
import { BEPPYO_ENTRIES, findBeppyo } from "./beppyo";
import { allLawArticles, mhlwLawArticles } from "@/data/laws";
import { mhlwNotices } from "@/data/mhlw-notices";
import { findEntryByShort } from "@/lib/law-navi/permalink";

// 分野インデックス・別表インデックスの正本突合（docs/horei-navi-foundation-2026-07-11 §2-2/2-5）。
// 参照が curated コーパス・通達DBに実在しなければ CI が落ちる＝幽霊参照 0
// （O18 リンカ・article-registry のピン整合と同じ思想）。
const mhlwSet = new Set<unknown>(mhlwLawArticles);
const curated = allLawArticles.filter((a) => !mhlwSet.has(a));
const curatedKeys = new Set(curated.map((a) => `${a.lawShort}|${a.articleNum}`));
const noticeIds = new Set(mhlwNotices.map((n) => n.id));
const topicIds = new Set(LAW_NAVI_TOPICS.map((t) => t.id));
const beppyoIds = new Set(BEPPYO_ENTRIES.map((b) => b.id));

describe("LAW_NAVI_TOPICS — 分野インデックスの整合", () => {
  it("トピックidは一意", () => {
    expect(topicIds.size).toBe(LAW_NAVI_TOPICS.length);
  });

  it("articles の全参照が curated コーパスに実在する（幽霊参照 0）", () => {
    for (const t of LAW_NAVI_TOPICS) {
      for (const ref of t.articles) {
        expect(
          curatedKeys.has(`${ref.lawShort}|${ref.articleNum}`),
          `${t.id}: ${ref.lawShort} ${ref.articleNum} がコーパスに無い`
        ).toBe(true);
      }
    }
  });

  it("articles の全参照が条文パーマリンク生成集合にも解決できる（分野→原文ページの導線保証）", () => {
    for (const t of LAW_NAVI_TOPICS) {
      for (const ref of t.articles) {
        expect(
          findEntryByShort(ref.lawShort, ref.articleNum),
          `${t.id}: ${ref.lawShort} ${ref.articleNum} のパーマリンクが無い`
        ).toBeDefined();
      }
    }
  });

  it("circularIds の全参照が mhlwNotices に実在する", () => {
    for (const t of LAW_NAVI_TOPICS) {
      for (const id of t.circularIds) {
        expect(noticeIds.has(id), `${t.id}: 通達 ${id} が mhlwNotices に無い`).toBe(true);
      }
    }
  });

  it("beppyoIds の全参照が別表インデックスに実在する", () => {
    for (const t of LAW_NAVI_TOPICS) {
      for (const id of t.beppyoIds) {
        expect(beppyoIds.has(id), `${t.id}: 別表 ${id} が beppyo.ts に無い`).toBe(true);
      }
    }
  });

  it("各トピックは説明・レビュー記録・現場語alias（代表名以外に1つ以上）を持つ（二層生成の担保）", () => {
    for (const t of LAW_NAVI_TOPICS) {
      expect(t.description.length, `${t.id}: description が短すぎる`).toBeGreaterThan(20);
      expect(t.reviewNote, `${t.id}: reviewNote（人手レビュー記録）が無い`).toMatch(/topic-scan/);
      expect(
        t.aliases.filter((a) => a !== t.name).length,
        `${t.id}: 俗称aliasが無い`
      ).toBeGreaterThan(0);
    }
  });

  it("フォークリフト分野: 4クエリ着地の中核データが揃っている", () => {
    const forklift = findLawNaviTopic("forklift")!;
    expect(forklift).toBeDefined();
    // 俗称「爪」系のaliasを持つ（「爪のやつ」の語幹。固定フレーズは持たない）
    expect(forklift.aliases).toContain("爪");
    expect(forklift.aliases).toContain("ツメ");
    expect(forklift.aliases.some((a) => a.includes("のやつ"))).toBe(false);
    // 法→令→則の3層が揃う
    const tiers = new Set(forklift.articles.map((a) => a.lawShort));
    expect(tiers).toContain("安衛法");
    expect(tiers).toContain("安衛令");
    expect(tiers).toContain("安衛則");
    // 定義条（151条の2）を含む
    expect(topicsForArticle("安衛則", "第151条の2").map((t) => t.id)).toContain("forklift");
  });
});

describe("BEPPYO_ENTRIES — 別表インデックスの整合", () => {
  it("別表idは一意・アンカー安全（英数ハイフンのみ）", () => {
    expect(beppyoIds.size).toBe(BEPPYO_ENTRIES.length);
    for (const b of BEPPYO_ENTRIES) {
      expect(b.id).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("relatedArticles の全参照が curated コーパスに実在し、パーマリンクにも解決できる", () => {
    for (const b of BEPPYO_ENTRIES) {
      for (const ra of b.relatedArticles) {
        expect(
          curatedKeys.has(`${ra.lawShort}|${ra.articleNum}`),
          `${b.id}: ${ra.lawShort} ${ra.articleNum} がコーパスに無い`
        ).toBe(true);
        expect(
          findEntryByShort(ra.lawShort, ra.articleNum),
          `${b.id}: ${ra.lawShort} ${ra.articleNum} のパーマリンクが無い`
        ).toBeDefined();
      }
    }
  });

  it("relatedTopicIds の全参照がトピックに実在する", () => {
    for (const b of BEPPYO_ENTRIES) {
      for (const id of b.relatedTopicIds) {
        expect(topicIds.has(id), `${b.id}: トピック ${id} が無い`).toBe(true);
      }
    }
  });

  it("主要別表の意味が引ける（別表第3=特定化学物質・別表第6の2=有機溶剤）", () => {
    expect(findBeppyo("anei-rei-beppyo-3")?.name).toBe("特定化学物質");
    expect(findBeppyo("anei-rei-beppyo-6-2")?.name).toBe("有機溶剤");
  });

  it("label は正規形（別表第N（のM））＝クエリ正規化（別表第三→別表第3）と合流できる", () => {
    for (const b of BEPPYO_ENTRIES) {
      expect(b.label).toMatch(/^別表第[0-9]+(の[0-9]+)?$/);
    }
  });
});
