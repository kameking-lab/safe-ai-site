/**
 * GHSハザードクラス名 → GHS絵表示（ピクトグラム）の対応表（柱0・ビジュアルファースト）
 *
 * 現場の人はドラム缶・一斗缶のラベルで「赤ひし形の絵」を見て危険を読む。
 * RA結果のハザード文字列を同じ視覚言語（GHS絵表示）に変換するための純関数。
 *
 * 対応は GHS（JIS Z 7253 / 国連GHS文書）の絵表示割当の標準的な要約:
 *   GHS01 爆発物 / GHS02 炎(引火性等) / GHS03 円上の炎(酸化性) / GHS04 高圧ガス
 *   GHS05 腐食性 / GHS06 どくろ(急性毒性 区分1〜3) / GHS07 感嘆符(刺激性等)
 *   GHS08 健康有害性(発がん性等) / GHS09 環境(水生環境有害性)
 *
 * 注意: ここは「ハザードクラス名の文字列 → 絵」の表示変換であり、分類判定そのもの
 * （区分の決定）は SDS / AI / MHLWデータ側が単一ソース。判定はしない。
 */

export type GhsSymbolId =
  | "explosive" // GHS01 爆発物
  | "flame" // GHS02 炎
  | "oxidizer" // GHS03 円上の炎
  | "gas-cylinder" // GHS04 高圧ガス
  | "corrosion" // GHS05 腐食性
  | "skull" // GHS06 どくろ
  | "exclamation" // GHS07 感嘆符
  | "health-hazard" // GHS08 健康有害性
  | "environment"; // GHS09 環境

export const GHS_SYMBOL_LABEL: Record<GhsSymbolId, string> = {
  explosive: "爆発物",
  flame: "引火性・可燃性",
  oxidizer: "酸化性",
  "gas-cylinder": "高圧ガス",
  corrosion: "腐食性",
  skull: "急性毒性（重篤）",
  exclamation: "注意（刺激性等）",
  "health-hazard": "健康有害性",
  environment: "水生環境有害性",
};

/** 重大なものが先に並ぶ表示順（どくろ・健康有害性を先頭に）。 */
export const GHS_SYMBOL_ORDER: readonly GhsSymbolId[] = [
  "skull",
  "health-hazard",
  "corrosion",
  "explosive",
  "flame",
  "oxidizer",
  "gas-cylinder",
  "environment",
  "exclamation",
] as const;

type Rule = { symbol: GhsSymbolId; pattern: RegExp };

// 上から順に評価し、最初に一致した絵を割り当てる（1ハザード=1絵）。
// 急性毒性だけは区分で GHS06/GHS07 が分かれるため classification も見る。
const RULES: Rule[] = [
  { symbol: "explosive", pattern: /爆発物|自己反応性|有機過酸化物/ },
  { symbol: "oxidizer", pattern: /酸化性/ },
  { symbol: "gas-cylinder", pattern: /高圧ガス/ },
  { symbol: "flame", pattern: /引火性|可燃性|自然発火|自己発熱|水反応可燃性|発火性/ },
  {
    symbol: "health-hazard",
    pattern: /発がん|生殖細胞変異原|生殖毒性|特定標的臓器|誤えん有害|吸引性呼吸器|呼吸器感作/,
  },
  { symbol: "corrosion", pattern: /腐食|眼に対する重篤な損傷/ },
  {
    symbol: "exclamation",
    pattern: /皮膚刺激|眼刺激|皮膚感作|気道刺激|眠気|めまい|オゾン層/,
  },
  { symbol: "environment", pattern: /水生環境/ },
];

function toHalfWidthDigits(s: string): string {
  return s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
}

/** 急性毒性は区分1〜3=どくろ、区分4以上・区分不明=感嘆符（GHSの標準割当）。 */
function acuteToxicitySymbol(classification?: string): GhsSymbolId {
  if (classification && /区分\s*[1-3]\b/.test(toHalfWidthDigits(classification))) {
    return "skull";
  }
  return "exclamation";
}

/** 特定標的臓器毒性（単回）の区分3（気道刺激性・麻酔作用）はGHS07、それ以外はGHS08。 */
function stotSymbol(category: string, classification?: string): GhsSymbolId {
  const joined = toHalfWidthDigits(`${category} ${classification ?? ""}`);
  if (/区分\s*3\b/.test(joined) || /気道刺激|眠気|めまい|麻酔/.test(joined)) {
    return "exclamation";
  }
  return "health-hazard";
}

/**
 * 「皮膚腐食性・刺激性」「眼損傷性・眼刺激性」の結合カテゴリ（NITE形式）は
 * 区分1=腐食（GHS05）、区分2以下=感嘆符（GHS07）に分かれる。
 */
function corrosionOrIrritationSymbol(classification?: string): GhsSymbolId {
  const half = toHalfWidthDigits(classification ?? "");
  const m = half.match(/区分\s*(\d+)/);
  if (m && parseInt(m[1], 10) <= 1) return "corrosion";
  return "exclamation";
}

/**
 * ハザードクラス名（と区分）から絵表示を1つ解決する。
 * 物理化学的性質などの絵を持たない項目は undefined。
 */
export function resolveGhsSymbol(
  category: string,
  classification?: string,
): GhsSymbolId | undefined {
  if (!category) return undefined;
  if (/急性毒性/.test(category)) return acuteToxicitySymbol(classification);
  if (/特定標的臓器/.test(category)) return stotSymbol(category, classification);
  if (/(腐食|重篤な損傷).*刺激|刺激.*(腐食|重篤な損傷)/.test(category)) {
    return corrosionOrIrritationSymbol(classification);
  }
  for (const { symbol, pattern } of RULES) {
    if (pattern.test(category)) return symbol;
  }
  return undefined;
}

/**
 * ハザード一覧から重複なしの絵表示リストを重大順で返す（結論カードの絵の列）。
 */
export function collectGhsSymbols(
  hazards: { category: string; classification?: string }[],
): GhsSymbolId[] {
  const found = new Set<GhsSymbolId>();
  for (const h of hazards) {
    const s = resolveGhsSymbol(h.category, h.classification);
    if (s) found.add(s);
  }
  return GHS_SYMBOL_ORDER.filter((s) => found.has(s));
}
