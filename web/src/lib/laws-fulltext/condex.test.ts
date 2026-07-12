import { describe, expect, it } from "vitest";
import {
  looksLikeArticleQuery,
  resolveCondexLanding,
  type CondexPayload,
} from "./condex";

/**
 * FT-D4 検索統合（設計書 docs/corpus-fulltext-architecture-2026-07-12.md §2-4・§5-2）の機械固定。
 *
 * condex の純関数解決器（resolveCondexLanding）が、curated に無い条番号クエリを全文条ページへ
 * 着地させることを固定する。漢数字・全角・枝番・かな読み・正式名称のゆらぎ込み。全文ローダー
 * 非依存の純関数なので、合成 payload で決定的にテストできる（実 API 取得はビルド/curl で実測）。
 */
const EGOV = "347M50002000032";

// 実データ（安衛則全文）から採取した代表条。第577条の2 は curated 収録済み＝condex には入らない。
const CONDEX: CondexPayload = {
  laws: [
    {
      egovLawId: EGOV,
      lawShort: "安衛則",
      fullName: "労働安全衛生規則",
      revisionId: "20260701_506M60000100079",
      articles: [
        { articleNum: "第630条", artSlug: "630", caption: "（食堂及び炊事場）", isDeleted: false },
        { articleNum: "第632条", artSlug: "632", caption: "（栄養士又は管理栄養士）", isDeleted: false },
        { articleNum: "第34条の2の3", artSlug: "34-2-3", caption: "（名称等の通知）", isDeleted: false },
      ],
    },
  ],
};

describe("looksLikeArticleQuery — 条番号形の門番", () => {
  it("条番号を含むクエリを真、含まないを偽に判定する", () => {
    expect(looksLikeArticleQuery("安衛則630条")).toBe(true);
    expect(looksLikeArticleQuery("安衛則 第630条")).toBe(true);
    expect(looksLikeArticleQuery("第六百三十条")).toBe(true);
    expect(looksLikeArticleQuery("足場の点検は誰")).toBe(false);
    expect(looksLikeArticleQuery("2024-2026")).toBe(false); // 「条」が無いので条番号ではない
    expect(looksLikeArticleQuery("")).toBe(false);
  });
});

describe("resolveCondexLanding — curated に無い条番号の全文条ページ着地", () => {
  it("略称＋算用数字: 安衛則630条 → /law-navi/{id}/630", () => {
    const r = resolveCondexLanding("安衛則630条", CONDEX);
    expect(r?.path).toBe(`/law-navi/${EGOV}/630`);
    expect(r?.lawShort).toBe("安衛則");
    expect(r?.articleLabel).toBe("第630条");
    expect(r?.caption).toBe("（食堂及び炊事場）");
  });

  it("「第」付き・空白ありも同じ着地: 安衛則 第630条", () => {
    expect(resolveCondexLanding("安衛則 第630条", CONDEX)?.path).toBe(`/law-navi/${EGOV}/630`);
  });

  it("漢数字ゆらぎ: 安衛則第六百三十条 → 630", () => {
    expect(resolveCondexLanding("安衛則第六百三十条", CONDEX)?.path).toBe(`/law-navi/${EGOV}/630`);
  });

  it("全角数字ゆらぎ: 安衛則６３０条 → 630", () => {
    expect(resolveCondexLanding("安衛則６３０条", CONDEX)?.path).toBe(`/law-navi/${EGOV}/630`);
  });

  it("正式名称: 労働安全衛生規則第630条 → 630", () => {
    expect(resolveCondexLanding("労働安全衛生規則第630条", CONDEX)?.path).toBe(`/law-navi/${EGOV}/630`);
  });

  it("かな読み: あんえいそく 630条 → 630（expandLawAliases 経由）", () => {
    expect(resolveCondexLanding("あんえいそく 630条", CONDEX)?.path).toBe(`/law-navi/${EGOV}/630`);
  });

  it("多段枝番: 安衛則34条の2の3 → 34-2-3", () => {
    const r = resolveCondexLanding("安衛則34条の2の3", CONDEX);
    expect(r?.path).toBe(`/law-navi/${EGOV}/34-2-3`);
    expect(r?.articleLabel).toBe("第34条の2の3");
  });

  it("裸の条番号（法令名なし）は着地しない（誤誘導回避）", () => {
    expect(resolveCondexLanding("630条", CONDEX)).toBeNull();
  });

  it("全文層に無い条番号は着地しない（幽霊 URL 0）", () => {
    expect(resolveCondexLanding("安衛則99999条", CONDEX)).toBeNull();
  });

  it("condex 非対象法令（安衛法）は着地しない（母集団外）", () => {
    expect(resolveCondexLanding("安衛法61条", CONDEX)).toBeNull();
  });

  it("curated 収録済みの条（第577条の2）は condex に無く着地しない（通常検索が正着地）", () => {
    // CONDEX に第577条の2 は入っていない（curated が正本）＝ここで解決されないのが正しい。
    expect(resolveCondexLanding("安衛則577条の2", CONDEX)).toBeNull();
  });

  it("空クエリ・payload 無しは null", () => {
    expect(resolveCondexLanding("", CONDEX)).toBeNull();
    expect(resolveCondexLanding("安衛則630条", null)).toBeNull();
    expect(resolveCondexLanding("安衛則630条", { laws: [] })).toBeNull();
  });
});
