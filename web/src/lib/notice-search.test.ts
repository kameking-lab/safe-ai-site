import { describe, it, expect } from "vitest";
import {
  searchRelevantNotices,
  NOTICE_BINDING_LABELS,
  type NoticeHit,
} from "./notice-search";
import { mhlwNotices } from "@/data/mhlw-notices";
import { verifiedMhlwNotices } from "@/data/public-mhlw-notices";

/**
 * notice-search.ts の回帰テスト（柱C-2）。
 *
 * 本モジュールはチャットボットが回答に添付する「関連通達・告示・指針」を
 * 個別検証済み公開集合からだけ選ぶ。2026-08-02時点では基発0520第6号の1件だけを
 * 公式一次資料と独立照合済みとして検索可能にし、その他は引き続きfail-closedとする。
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
  const noticeIds = new Set(verifiedMhlwNotices.map((n) => n.id));

  it("トピック語「熱中症」は個別照合済みの基発0520第6号だけを返す", () => {
    const hits = searchRelevantNotices("熱中症");
    expect(mhlwNotices.length).toBeGreaterThan(0);
    expect(verifiedMhlwNotices.map((notice) => notice.id)).toEqual([
      "mhlw-notice-0014",
    ]);
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({
      id: "mhlw-notice-0014",
      noticeNumber: "基発0520第6号",
      issuedDateRaw: "令和7年5月20日",
      issuer: "厚生労働省労働基準局長",
      detailUrl:
        "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000116133.html",
      sourceUrl:
        "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000116133.html",
      pdfUrl: "https://www.mhlw.go.jp/content/11303000/001490911.pdf",
    });
    for (const h of hits) {
      expect(noticeIds.has(h.id)).toBe(true);
      expect(h.detailUrl.length).toBeGreaterThan(0);
    }
  });

  it("文書番号の完全一致でも基発0520第6号へ到達する", () => {
    expect(searchRelevantNotices("基発0520第6号", 5).map((hit) => hit.id)).toEqual([
      "mhlw-notice-0014",
    ]);
  });

  it("シノニム展開: 「アスベスト」でも未検証の石綿通達を surface しない", () => {
    const hits = searchRelevantNotices("アスベスト");
    expect(hits).toEqual([]);
  });

  it("助詞・空白混じりの自然文でも確認済み熱中症通達だけを返す", () => {
    const hits = searchRelevantNotices("熱中症 対策について");
    expect(hits.map((hit) => hit.id)).toEqual(["mhlw-notice-0014"]);
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
    const hits = searchRelevantNotices("熱中症");
    expect(verifiedMhlwNotices).toHaveLength(1);
    expect(hits).toHaveLength(1);
    for (const h of hits) {
      const src = verifiedMhlwNotices.find((n) => n.id === h.id);
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
        sourceUrl: src.sourceUrl,
        pdfUrl: src.pdfUrl,
        category: src.category,
      };
      expect(h).toEqual(projected);
    }
  });
});

describe("searchRelevantNotices — 現場口語でも未検証資料を出さない", () => {
  const titles = mhlwNotices.map((n) => n.title).join("\n");

  it("前提: 現場口語「酸欠」「振動障害」は通達タイトルに literal では現れない（橋渡しでのみ拾える）", () => {
    // 元索引には橋渡し先候補が存在するが、個別検証前は公開しないことを固定する。
    expect(titles.includes("酸欠")).toBe(false);
    expect(titles.includes("振動障害")).toBe(false);
    // 一方、橋渡し先の正式表記は実在する（捏造した橋渡しではない）。
    expect(titles.includes("酸素欠乏")).toBe(true);
    expect(titles.includes("チェーンソー")).toBe(true);
  });

  it("現場口語「酸欠」でも未検証の酸素欠乏通達を公開しない", () => {
    const hits = searchRelevantNotices("酸欠");
    expect(hits).toEqual([]);
  });

  it("障害名「振動障害」でも未検証のチェーンソー通達を公開しない", () => {
    const hits = searchRelevantNotices("振動障害");
    expect(hits).toEqual([]);
  });

  it("旧法令名「安全帯」でも未検証の墜落防止通達を公開しない", () => {
    const hits = searchRelevantNotices("安全帯");
    expect(hits).toEqual([]);
  });

  it("「職長」でも未検証の教育通達を公開しない", () => {
    const hits = searchRelevantNotices("職長");
    expect(hits).toEqual([]);
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
