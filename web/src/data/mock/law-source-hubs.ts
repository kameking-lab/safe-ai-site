/**
 * 出典リンクの正規URL（ページ移転に強い入口に統一）
 * - e-Gov法令: laws.e-gov.go.jp（elaws からの移行先）
 * - 厚労省: 政策トップ・労働政策・労災の index
 */
export const LAW_SOURCE_HUB = {
  egovRousho: "https://laws.e-gov.go.jp/law/322AC0000000057",
  egovRodoKijun: "https://laws.e-gov.go.jp/law/360AC0000000049",
  mhlwKenkouRoudou: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/index.html",
  mhlwRoudou: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/roudou/index.html",
  mhlwRousai: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/rousaihoken/index.html",
} as const;
