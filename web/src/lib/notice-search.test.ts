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

describe("searchRelevantNotices — 現場口語・旧称・障害名の橋渡し（recall）", () => {
  const noticeIds = new Set(mhlwNotices.map((n) => n.id));
  const titles = mhlwNotices.map((n) => n.title).join("\n");

  it("前提: 現場口語「酸欠」「振動障害」は通達タイトルに literal では現れない（橋渡しでのみ拾える）", () => {
    // この前提が崩れた場合、以下の「hits>0＝橋渡しが効いた」証明が直接一致に化けるため固定する。
    expect(titles.includes("酸欠")).toBe(false);
    expect(titles.includes("振動障害")).toBe(false);
    // 一方、橋渡し先の正式表記は実在する（捏造した橋渡しではない）。
    expect(titles.includes("酸素欠乏")).toBe(true);
    expect(titles.includes("チェーンソー")).toBe(true);
  });

  it("現場口語「酸欠」→ 酸素欠乏・硫化水素の通達を surface する", () => {
    // 「酸欠」はタイトルに 0 件＝TOPIC_SYNONYMS(酸素欠乏↔酸欠↔硫化水素)の展開でのみ拾える。
    const hits = searchRelevantNotices("酸欠");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((h) => noticeIds.has(h.id))).toBe(true);
    expect(hits.some((h) => /酸素欠乏|硫化水素/.test(h.title))).toBe(true);
  });

  it("障害名「振動障害」→ チェーンソー振動ばく露の通達を surface する", () => {
    // 「振動障害」もタイトルに 0 件＝チェーンソー群への展開でのみ拾える。
    const hits = searchRelevantNotices("振動障害");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((h) => noticeIds.has(h.id))).toBe(true);
    expect(hits.some((h) => h.title.includes("チェーンソー"))).toBe(true);
  });

  it("旧法令名「安全帯」→ 墜落制止用器具・墜落/転落の通達を surface する", () => {
    // 2019 改称前の旧称「安全帯」から現行の墜落防止通達群へ橋渡しする。
    const hits = searchRelevantNotices("安全帯");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((h) => noticeIds.has(h.id))).toBe(true);
    expect(hits.some((h) => /墜落|転落|安全帯/.test(h.title))).toBe(true);
  });

  it("「職長」→ 安全衛生教育の通達群へ展開する", () => {
    const hits = searchRelevantNotices("職長");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((h) => noticeIds.has(h.id))).toBe(true);
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
