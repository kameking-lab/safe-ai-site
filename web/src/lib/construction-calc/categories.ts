/**
 * 建設計算コーナーの「発見層」— カテゴリ束（ハブの分類）とその解決。
 *
 * 目的（docs 酷評CR2-H1 の再発防止・28機規模への耐性）:
 * - /construction-calc ハブを計算機が増えても迷子にしない現場分類（玉掛け・吊り／足場・防護／
 *   土工・支保工／コンクリート／電気／換算）で束ねる。
 * - **registry 駆動**: 計算機は任意で `category` を宣言できる。宣言が無い部隊の新機も、
 *   keywords/slug から推定して正しい束へ自動で入る（＝新機追加でハブを手直し不要）。
 *
 * このモジュールは pure TS（React/IO なし）。ハブ・検索・テストで共用する。
 * 計算機定義ファイル（部隊所有）には触れず、既存機の分類は下の CATEGORY_BY_SLUG で中央管理する。
 */

import type { CalcCategoryId, ConstructionCalculator } from "./schema";

/** カテゴリのメタ（表示順・ラベル・説明・アイコンキー）。表示順はこの配列順。 */
export type CalcCategoryMeta = {
  id: CalcCategoryId;
  label: string;
  /** ハブの束見出し下の1行説明 */
  description: string;
  /** UI 側で lucide アイコンに写像するためのキー（categories.ts は React 非依存に保つ） */
  iconKey: string;
  /** 現場での言い換え・別名（束の絞り込みヒットにも使う） */
  aliases: string[];
};

export const CALC_CATEGORIES: readonly CalcCategoryMeta[] = [
  {
    id: "tamakake",
    label: "玉掛け・吊り",
    description: "ワイヤ・スリング・クレーンの吊り荷重と安全係数",
    iconKey: "cable",
    aliases: ["玉掛け", "玉掛", "吊り", "つり", "揚重", "クレーン", "ワイヤ", "スリング"],
  },
  {
    id: "ashiba",
    label: "足場・防護",
    description: "足場の基準・風荷重・墜落防護（ネット・防護棚）",
    iconKey: "construction",
    aliases: ["足場", "単管", "壁つなぎ", "風荷重", "防護", "朝顔", "安全ネット", "防網", "墜落"],
  },
  {
    id: "doko",
    label: "土工・支保工",
    description: "掘削勾配・土止め支保工・土圧",
    iconKey: "mountain",
    aliases: ["掘削", "法面", "勾配", "土止め", "土留め", "山留め", "土圧", "支保工"],
  },
  {
    id: "concrete",
    label: "コンクリート・型枠",
    description: "型枠支保工・側圧・あと施工アンカー",
    iconKey: "layers",
    aliases: ["型枠", "支保工", "側圧", "コンクリート", "アンカー", "生コン", "打設"],
  },
  {
    id: "denki",
    label: "電気",
    description: "電線の許容電流・電圧降下（内線規程）",
    iconKey: "zap",
    aliases: ["電線", "ケーブル", "許容電流", "電圧降下", "内線規程", "電気"],
  },
  {
    id: "kansan",
    label: "換算・幾何",
    description: "土量換算・勾配換算・部材寸法などの補助計算",
    iconKey: "repeat",
    aliases: ["換算", "土量", "割", "百分率", "たわみ", "梁", "幾何"],
  },
  {
    id: "other",
    label: "その他",
    description: "上記に分類されない計算機",
    iconKey: "calculator",
    aliases: [],
  },
];

export const CALC_CATEGORY_META: Readonly<Record<CalcCategoryId, CalcCategoryMeta>> =
  Object.fromEntries(CALC_CATEGORIES.map((c) => [c.id, c])) as Record<CalcCategoryId, CalcCategoryMeta>;

/**
 * 既存機（部隊所有ファイル・不可侵）の分類を中央管理する明示マップ。
 * 計算機ファイルに `category` を書き足す代わりにここで束を確定する（ファイル非改変）。
 * 新機が `category` を宣言した場合はそちらが優先（resolveCalcCategory 参照）。
 */
export const CATEGORY_BY_SLUG: Readonly<Record<string, CalcCategoryId>> = {
  "sling-wire-load": "tamakake",
  "crane-rated-load": "tamakake",
  "scaffold-tankan-check": "ashiba",
  "wind-load-temporary": "ashiba",
  "safety-net-check": "ashiba",
  "excavation-slope": "doko",
  "earth-pressure-shoring": "doko",
  "formwork-shoring-check": "concrete",
  "anchor-pullout": "concrete",
  "cable-ampacity": "denki",
  "soil-volume-conversion": "kansan",
};

/**
 * slug/keywords からの推定規則（部隊の新機が宣言なしでも正しい束へ入るための最後の砦）。
 * 上から順に評価し、slug 部分一致・keywords 部分一致のいずれかで最初に当たった束を採る。
 * slug を keywords より優先（「型枠支保工」と「土止め支保工」の両方に出る "支保工" を
 * slug=formwork.../earth-pressure... で正しく振り分けるため）。
 */
const INFERENCE_RULES: { id: CalcCategoryId; slugParts: string[]; keywordParts: string[] }[] = [
  { id: "denki", slugParts: ["cable", "voltage", "ampacity", "electr"], keywordParts: ["電線", "電圧", "許容電流", "ケーブル", "内線規程"] },
  { id: "tamakake", slugParts: ["sling", "crane", "hoist", "lift"], keywordParts: ["玉掛", "ワイヤ", "スリング", "吊り", "つり", "揚重", "クレーン", "チェーン"] },
  { id: "concrete", slugParts: ["formwork", "anchor", "concrete", "rebar"], keywordParts: ["型枠", "側圧", "コンクリート", "アンカー", "打設"] },
  { id: "doko", slugParts: ["excavation", "earth-pressure", "shoring", "slope", "soil-retain"], keywordParts: ["掘削", "法面", "土止め", "土留め", "山留め", "土圧"] },
  { id: "ashiba", slugParts: ["scaffold", "wind", "canopy", "net", "guardrail", "ladder"], keywordParts: ["足場", "建地", "壁つなぎ", "風荷重", "防護", "朝顔", "安全ネット", "防網", "墜落"] },
  { id: "kansan", slugParts: ["convert", "ratio", "soil-volume", "beam", "deflection", "geometry", "unit"], keywordParts: ["換算", "土量", "百分率", "たわみ", "幾何"] },
];

function inferCategory(calc: Pick<ConstructionCalculator, "slug" | "keywords">): CalcCategoryId | undefined {
  const slug = calc.slug.toLowerCase();
  const kws = calc.keywords ?? [];
  for (const rule of INFERENCE_RULES) {
    if (rule.slugParts.some((p) => slug.includes(p))) return rule.id;
  }
  for (const rule of INFERENCE_RULES) {
    if (rule.keywordParts.some((p) => kws.some((k) => k.includes(p)))) return rule.id;
  }
  return undefined;
}

/**
 * 計算機のカテゴリを解決する。優先順:
 *   1. calc.category（新機が明示宣言） 2. CATEGORY_BY_SLUG（既存機の中央管理）
 *   3. keywords/slug からの推定 4. "other"（発見層から絶対に漏らさない受け皿）
 */
export function resolveCalcCategory(
  calc: Pick<ConstructionCalculator, "slug" | "keywords" | "category">,
): CalcCategoryId {
  return calc.category ?? CATEGORY_BY_SLUG[calc.slug] ?? inferCategory(calc) ?? "other";
}

/** カテゴリ束にグルーピング（表示順を保持し、空の束は返さない）。 */
export function groupCalculatorsByCategory<
  T extends Pick<ConstructionCalculator, "slug" | "keywords" | "category">,
>(calcs: readonly T[]): { category: CalcCategoryMeta; calcs: T[] }[] {
  const byCat = new Map<CalcCategoryId, T[]>();
  for (const c of calcs) {
    const id = resolveCalcCategory(c);
    (byCat.get(id) ?? byCat.set(id, []).get(id)!).push(c);
  }
  const out: { category: CalcCategoryMeta; calcs: T[] }[] = [];
  for (const meta of CALC_CATEGORIES) {
    const group = byCat.get(meta.id);
    if (group && group.length > 0) out.push({ category: meta, calcs: group });
  }
  return out;
}
