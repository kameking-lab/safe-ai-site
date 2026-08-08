/**
 * 2026-07-24 に検索実装とは別に人手で作成した関連性判定。
 *
 * relevantIds は表示タイトル・着地先・情報種別を個別に読んで採否を決めた固定値であり、
 * 検索スコアや検索結果からテスト期待値を生成しない。データ変更時も自動追従させず、
 * 人が着地先を再確認して改訂履歴を残す。
 */
export type SearchGoldDomain = "law" | "qualification" | "accident" | "chemical" | "ky" | "guide";

export type SearchGoldCase = {
  id: string;
  domain: SearchGoldDomain;
  query: string;
  intent: string;
  relevantIds: string[];
  /** 安全上、上位10件に必ず含まれるべき人手指定の正規着地点。 */
  primaryRequiredIds?: string[];
  zeroExpected?: boolean;
  dangerousIfMissing?: boolean;
  reviewedAt: "2026-07-24";
};

export const SEARCH_QUALITY_GOLD_2026_07_24: readonly SearchGoldCase[] = [
  {
    id: "law-01",
    domain: "law",
    query: "安衛法 第61条",
    intent: "就業制限の原文条文へ到達する",
    relevantIds: ["law-労働安全衛生法|第61条", "law-navi-beppyo-anei-soku-beppyo-3"],
    primaryRequiredIds: ["law-労働安全衛生法|第61条"],
    dangerousIfMissing: true,
    reviewedAt: "2026-07-24",
  },
  {
    id: "law-02",
    domain: "law",
    query: "安衛則 第36条 アーク溶接",
    intent: "アーク溶接特別教育の列挙条文と確認資料へ到達する",
    relevantIds: [
      "law-労働安全衛生規則|第36条",
      "plain-347M50002000032-第36条",
      "faq-hlth-015",
    ],
    primaryRequiredIds: ["law-労働安全衛生規則|第36条"],
    dangerousIfMissing: true,
    reviewedAt: "2026-07-24",
  },
  {
    id: "qualification-01",
    domain: "qualification",
    query: "フルハーネス 特別教育",
    intent: "対象教育と根拠確認導線へ到達する",
    relevantIds: [
      "law-navi-topic-fall-arrest",
      "law-労働安全衛生規則|第36条",
      "plain-347M50002000032-第36条",
    ],
    primaryRequiredIds: ["law-navi-topic-fall-arrest"],
    dangerousIfMissing: true,
    reviewedAt: "2026-07-24",
  },
  {
    id: "qualification-02",
    domain: "qualification",
    query: "職長 教育",
    intent: "職長教育の対象・根拠・実施資料へ到達する",
    relevantIds: [
      "notice-mhlw-notice-0201",
      "notice-mhlw-notice-0198",
      "notice-mhlw-notice-0357",
      "law-労働安全衛生法|第60条",
      "law-労働安全衛生法施行令|第19条",
      "plain-347AC0000000057-第60条",
      "plain-347CO0000000318-第19条",
    ],
    primaryRequiredIds: [
      "law-労働安全衛生法|第60条",
      "law-労働安全衛生法施行令|第19条",
    ],
    dangerousIfMissing: true,
    reviewedAt: "2026-07-24",
  },
  {
    id: "accident-01",
    domain: "accident",
    query: "重大災害",
    intent:
      "個票本文の一次資料照合が完了するまでは、定義・報告条文・出典区分を示す公開中の安全な着地点へ到達する",
    relevantIds: [
      "glossary-重大災害",
      "page-/accident-news",
      "law-労働安全衛生規則|第97条",
      "plain-347M50002000032-第97条",
    ],
    primaryRequiredIds: [
      "page-/accident-news",
      "law-労働安全衛生規則|第97条",
    ],
    dangerousIfMissing: true,
    reviewedAt: "2026-07-24",
  },
  {
    id: "accident-02",
    domain: "accident",
    query: "速報 出典",
    intent:
      "速報の出典区分と限界を確認できる重大災害情報・新着情報ハブへ到達する",
    relevantIds: ["page-/accident-news", "page-/whats-new"],
    primaryRequiredIds: ["page-/accident-news"],
    dangerousIfMissing: true,
    reviewedAt: "2026-07-24",
  },
  {
    id: "chemical-01",
    domain: "chemical",
    query: "トルエン 108-88-3",
    intent: "名称とCASが一致する物質へ到達する",
    relevantIds: ["chem-mock-cs-002"],
    primaryRequiredIds: ["chem-mock-cs-002"],
    dangerousIfMissing: true,
    reviewedAt: "2026-07-24",
  },
  {
    id: "chemical-02",
    domain: "chemical",
    query: "アセトン 67-64-1",
    intent: "名称とCASが一致する物質へ到達する",
    relevantIds: ["chem-mock-cs-024"],
    primaryRequiredIds: ["chem-mock-cs-024"],
    dangerousIfMissing: true,
    reviewedAt: "2026-07-24",
  },
  {
    id: "ky-01",
    domain: "ky",
    query: "KY用紙",
    intent: "KY作成ツールと確認済み運用ガイドへ到達する",
    relevantIds: ["page-/ky/paper", "page-/ky-examples", "article-ky-paperless-implementation"],
    primaryRequiredIds: ["page-/ky/paper"],
    dangerousIfMissing: true,
    reviewedAt: "2026-07-24",
  },
  {
    id: "ky-02",
    domain: "ky",
    query: "一人KY",
    intent: "一人親方向け入口とKY運用ガイドへ到達する",
    relevantIds: ["page-/for/solo", "article-ky-paperless-implementation"],
    primaryRequiredIds: ["page-/for/solo"],
    dangerousIfMissing: true,
    reviewedAt: "2026-07-24",
  },
  {
    id: "guide-01",
    domain: "guide",
    query: "熱中症 予防教育",
    intent: "未監修教材ではなく、熱中症予防の公式一次情報案内へ到達する",
    relevantIds: ["page-/heat-illness-prevention"],
    primaryRequiredIds: ["page-/heat-illness-prevention"],
    dangerousIfMissing: true,
    reviewedAt: "2026-07-24",
  },
  {
    id: "guide-02",
    domain: "guide",
    query: "SDS 読み方",
    intent: "SDS確認項目と公式CREATE-SIMPLE準備ガイドへ到達する",
    relevantIds: ["page-/guides/chemical-ra-create-simple"],
    primaryRequiredIds: ["page-/guides/chemical-ra-create-simple"],
    dangerousIfMissing: true,
    reviewedAt: "2026-07-24",
  },
  {
    id: "zero-law",
    domain: "law",
    query: "架空安全衛生法 第9999条",
    intent: "未収載を規定不存在と断定せず0件導線へ移す",
    relevantIds: [],
    zeroExpected: true,
    reviewedAt: "2026-07-24",
  },
  {
    id: "zero-chemical",
    domain: "chemical",
    query: "0000-00-0",
    intent: "不正なCASを既存物質へ誤対応しない",
    relevantIds: [],
    zeroExpected: true,
    reviewedAt: "2026-07-24",
  },
  {
    id: "zero-general",
    domain: "guide",
    query: "ZXQY9876",
    intent: "根拠のないガイドを推測表示しない",
    relevantIds: [],
    zeroExpected: true,
    reviewedAt: "2026-07-24",
  },
] as const;
