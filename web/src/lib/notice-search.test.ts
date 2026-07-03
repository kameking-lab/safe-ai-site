import { describe, it, expect } from "vitest";
import {
  searchRelevantNotices,
  NOTICE_BINDING_LABELS,
  type NoticeHit,
} from "./notice-search";
import { mhlwNotices } from "@/data/mhlw-notices";

/**
 * notice-search.ts の回帰テスト（柱C-2）。
 *
 * 本モジュールはチャットボットが回答に添付する「関連通達・告示・指針」を
 * 実データ（@/data/mhlw-notices）から選ぶ横断検索で、法令隣接の出典提示に
 * 直結する。挙動が無言で壊れると誤った通達を引用しかねないため、実データを
 * そのまま流して以下の不変条件を固定する（モック不使用＝search-index.test と同方針）。
 */
describe("searchRelevantNotices — 入力ガード", () => {
  it("空クエリ・空白のみは 0 件（幽霊ヒット無し）", () => {
    expect(searchRelevantNotices("")).toEqual([]);
    expect(searchRelevantNotices("   ")).toEqual([]);
    expect(searchRelevantNotices("　")).toEqual([]); // 全角空白
  });

  it("正規化後 2 文字未満のトークンしか無いクエリは 0 件", () => {
    // normalize で記号・空白を除去した結果 1 文字以下になる語は
    // expandQuery が length>=2 で捨てるため、ヒットを返さない。
    expect(searchRelevantNotices("の")).toEqual([]);
    expect(searchRelevantNotices("？")).toEqual([]);
  });
});

describe("searchRelevantNotices — 実データ照合", () => {
  const noticeIds = new Set(mhlwNotices.map((n) => n.id));

  it("トピック語「熱中症」で関連通達を返し、全件が実在通達に解決する（捏造0）", () => {
    const hits = searchRelevantNotices("熱中症");
    expect(hits.length).toBeGreaterThan(0);
    for (const h of hits) {
      // 返す id は必ず正本 mhlwNotices に存在（幽霊通達を作らない）
      expect(noticeIds.has(h.id)).toBe(true);
      // detailUrl は必ず遷移可能（空リンクを出さない）
      expect(h.detailUrl.length).toBeGreaterThan(0);
    }
  });

  it("シノニム展開: 「アスベスト」で石綿タイトルの通達を surface する", () => {
    // データ上のタイトルは「石綿…」表記で "アスベスト" を含まない件があるが、
    // TOPIC_SYNONYMS(石綿↔アスベスト) 展開により拾えることを固定する。
    const hits = searchRelevantNotices("アスベスト");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.title.includes("石綿"))).toBe(true);
  });

  it("助詞・空白混じりの自然文クエリでも正規化して拾う", () => {
    const hits = searchRelevantNotices("熱中症 対策について");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((h) => noticeIds.has(h.id))).toBe(true);
  });

  it("k で返却上限を絞れる（既定 3・k 指定で ≤k）", () => {
    expect(searchRelevantNotices("化学物質").length).toBeLessThanOrEqual(3);
    expect(searchRelevantNotices("化学物質", 5).length).toBeLessThanOrEqual(5);
    expect(searchRelevantNotices("化学物質", 1).length).toBeLessThanOrEqual(1);
  });

  it("ランキングは決定的で、小さい k は大きい k の先頭部分と一致する", () => {
    const top3 = searchRelevantNotices("石綿", 3);
    const top1 = searchRelevantNotices("石綿", 1);
    // 同一入力に対し Array.sort は決定的＝top1 は top3 の先頭 1 件と一致
    expect(top1).toEqual(top3.slice(0, 1));
    // 呼び出しの冪等性
    expect(searchRelevantNotices("石綿", 3)).toEqual(top3);
  });

  it("NoticeHit は正本 mhlwNotices の対応レコードと一致する（写経ではなく射影）", () => {
    const hits = searchRelevantNotices("化学物質");
    expect(hits.length).toBeGreaterThan(0);
    for (const h of hits) {
      const src = mhlwNotices.find((n) => n.id === h.id);
      expect(src).toBeDefined();
      if (!src) continue;
      const projected: NoticeHit = {
        id: src.id,
        docType: src.docType,
        title: src.title,
        noticeNumber: src.noticeNumber,
        issuedDateRaw: src.issuedDateRaw,
        issuer: src.issuer,
        bindingLevel: src.bindingLevel,
        detailUrl: src.detailUrl,
        category: src.category,
      };
      expect(h).toEqual(projected);
    }
  });
});

describe("NOTICE_BINDING_LABELS", () => {
  it("拘束力レベル 3 種すべてに日本語ラベルがある", () => {
    expect(NOTICE_BINDING_LABELS.binding).toContain("告示");
    expect(NOTICE_BINDING_LABELS.indirect).toContain("通達");
    expect(NOTICE_BINDING_LABELS.reference).toContain("指針");
    expect(Object.keys(NOTICE_BINDING_LABELS)).toHaveLength(3);
  });
});
