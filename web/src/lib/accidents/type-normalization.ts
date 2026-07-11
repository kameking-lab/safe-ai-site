import type { AccidentType } from "@/lib/types/domain";
import type { AccidentGlyphId } from "@/lib/accidents/accident-pictogram-map";

/**
 * 災害の型（事故の型）正規化層。
 *
 * サイト内には3系統の型表記が併存している:
 *  1. 集計JSON（aggregates-mhlw/accidents-by-year.json ほか）: 厚労省読点表記＋
 *     ETL由来の表記ゆれ（半角中黒「墜落･転落」・読点無し「はさまれ巻き込まれ」・
 *     誤字「崩壊、到壊」・半角括弧「交通事故(道路)」・「#REF!」等、実測41キー）
 *  2. 死亡個票（deaths-mhlw/compact.json・records-2024.jsonl）: 厚労省正式表記
 *     （「墜落、転落」等19キー）でクリーン
 *  3. 事例DB（data/mock/real-accident-cases*.ts）: サイト独自union AccidentType
 *     （「墜落」「はさまれ・巻き込まれ」等22値。熱中症・酸素欠乏などの細分値を含む）
 *
 * 本モジュールは厚労省「事故の型」21分類を正本（canonical）とし、観測される
 * 全表記をエイリアス辞書で正本に解決する。未知キーは null を返し、データ更新で
 * 新たな表記ゆれが混入した場合は type-normalization.test.ts が検知して落ちる。
 */

export type HazardTypeSlug =
  | "fall" // 墜落・転落
  | "trip" // 転倒
  | "bump" // 激突（人が物に）
  | "flying-falling-object" // 飛来・落下
  | "collapse" // 崩壊・倒壊
  | "struck-by" // 激突され（物が人に）
  | "caught-in" // はさまれ・巻き込まれ
  | "cut-abrasion" // 切れ・こすれ
  | "stepping-through" // 踏み抜き
  | "drowning" // おぼれ
  | "hot-cold-contact" // 高温・低温の物との接触（熱中症・低体温症を含む）
  | "harmful-substance" // 有害物等との接触（酸欠・有害光線・中毒を含む）
  | "electric-shock" // 感電
  | "explosion" // 爆発
  | "rupture" // 破裂
  | "fire" // 火災
  | "traffic-road" // 交通事故（道路）
  | "traffic-other" // 交通事故（その他＝構内・場内など）
  | "overexertion" // 動作の反動・無理な動作
  | "other" // その他
  | "unclassifiable"; // 分類不能

export type CanonicalHazardType = {
  slug: HazardTypeSlug;
  /** サイト表示用（中黒表記。事例DBの慣行に合わせる） */
  label: string;
  /** 厚労省の正式表記（読点表記。死亡個票・公表資料と一致） */
  mhlwLabel: string;
  /** タイル・チップ用の短縮ラベル */
  short: string;
  /** ピクトグラムのグリフID（accident-pictogram-map.ts と共用） */
  glyph: AccidentGlyphId;
};

/**
 * 厚労省21分類の正本。並びは死亡個票（2019-2024）の件数降順を基本に、
 * 交通事故・その他系を末尾に置いた教育上の定番順。
 */
export const CANONICAL_HAZARD_TYPES: readonly CanonicalHazardType[] = [
  { slug: "fall", label: "墜落・転落", mhlwLabel: "墜落、転落", short: "墜落・転落", glyph: "fall-person" },
  { slug: "caught-in", label: "はさまれ・巻き込まれ", mhlwLabel: "はさまれ、巻き込まれ", short: "はさまれ", glyph: "caught" },
  { slug: "struck-by", label: "激突され", mhlwLabel: "激突され", short: "激突され", glyph: "struck" },
  { slug: "collapse", label: "崩壊・倒壊", mhlwLabel: "崩壊、倒壊", short: "崩壊・倒壊", glyph: "collapse" },
  { slug: "flying-falling-object", label: "飛来・落下", mhlwLabel: "飛来、落下", short: "飛来・落下", glyph: "falling-object" },
  { slug: "trip", label: "転倒", mhlwLabel: "転倒", short: "転倒", glyph: "slip" },
  { slug: "hot-cold-contact", label: "高温・低温の物との接触", mhlwLabel: "高温・低温の物との接触", short: "高温・低温", glyph: "hot-cold" },
  { slug: "drowning", label: "おぼれ", mhlwLabel: "おぼれ", short: "おぼれ", glyph: "drowning" },
  { slug: "harmful-substance", label: "有害物等との接触", mhlwLabel: "有害物等との接触", short: "有害物接触", glyph: "chemical-contact" },
  { slug: "fire", label: "火災", mhlwLabel: "火災", short: "火災", glyph: "fire" },
  { slug: "electric-shock", label: "感電", mhlwLabel: "感電", short: "感電", glyph: "electric" },
  { slug: "bump", label: "激突", mhlwLabel: "激突", short: "激突", glyph: "bump" },
  { slug: "explosion", label: "爆発", mhlwLabel: "爆発", short: "爆発", glyph: "explosion" },
  { slug: "cut-abrasion", label: "切れ・こすれ", mhlwLabel: "切れ、こすれ", short: "切れ・こすれ", glyph: "cut" },
  { slug: "rupture", label: "破裂", mhlwLabel: "破裂", short: "破裂", glyph: "rupture" },
  { slug: "stepping-through", label: "踏み抜き", mhlwLabel: "踏み抜き", short: "踏み抜き", glyph: "stepping-through" },
  { slug: "overexertion", label: "動作の反動・無理な動作", mhlwLabel: "動作の反動、無理な動作", short: "無理な動作", glyph: "overexertion" },
  { slug: "traffic-road", label: "交通事故（道路）", mhlwLabel: "交通事故（道路）", short: "交通事故", glyph: "traffic" },
  { slug: "traffic-other", label: "交通事故（その他）", mhlwLabel: "交通事故（その他）", short: "構内車両", glyph: "vehicle" },
  { slug: "other", label: "その他", mhlwLabel: "その他", short: "その他", glyph: "other" },
  { slug: "unclassifiable", label: "分類不能", mhlwLabel: "分類不能", short: "分類不能", glyph: "unclassifiable" },
] as const;

export const HAZARD_TYPE_BY_SLUG: ReadonlyMap<HazardTypeSlug, CanonicalHazardType> = new Map(
  CANONICAL_HAZARD_TYPES.map((t) => [t.slug, t]),
);

export function getHazardType(slug: HazardTypeSlug): CanonicalHazardType {
  const found = HAZARD_TYPE_BY_SLUG.get(slug);
  if (!found) throw new Error(`unknown hazard type slug: ${slug}`);
  return found;
}

/**
 * エイリアス辞書。観測済みの全表記（集計JSON 41キー・死亡個票19キー・
 * 事例DB union 22値）を正本 slug に解決する。
 *
 * 事例DB独自の細分値の対応は厚労省「事故の型」分類基準に従う:
 *  - 熱中症・低体温症 → 高温・低温の物との接触（環境温度への曝露を含む分類）
 *  - 酸素欠乏・有害光線・有害物質 → 有害物等との接触（酸欠症・放射線等を含む分類）
 *  - 車両（構内のフォークリフト轢過等） → 交通事故（その他）（道路交通法適用外の車両事故）
 *  - 振動障害 → その他（「事故の型」に対応区分が無い職業性疾病）
 *  - 「#REF!」（ETL元Excelの参照エラー行） → 分類不能
 */
export const HAZARD_TYPE_ALIASES: Readonly<Record<string, HazardTypeSlug>> = {
  // --- 墜落・転落 ---
  "墜落、転落": "fall",
  "墜落・転落": "fall",
  "墜落･転落": "fall",
  墜落: "fall",
  // --- はさまれ・巻き込まれ ---
  "はさまれ、巻き込まれ": "caught-in",
  "はさまれ・巻き込まれ": "caught-in",
  はさまれ巻き込まれ: "caught-in",
  // --- 激突され / 激突 ---
  激突され: "struck-by",
  激突: "bump",
  // --- 崩壊・倒壊（「到壊」はETL由来の誤字） ---
  "崩壊、倒壊": "collapse",
  "崩壊・倒壊": "collapse",
  "崩壊･倒壊": "collapse",
  "崩壊、到壊": "collapse",
  // --- 飛来・落下 ---
  "飛来、落下": "flying-falling-object",
  "飛来・落下": "flying-falling-object",
  "飛来･落下": "flying-falling-object",
  // --- 転倒 ---
  転倒: "trip",
  // --- 高温・低温の物との接触 ---
  "高温・低温の物との接触": "hot-cold-contact",
  "高温・低温物との接触": "hot-cold-contact",
  "高温･低温物との接触": "hot-cold-contact",
  熱中症: "hot-cold-contact",
  低体温症: "hot-cold-contact",
  // --- おぼれ ---
  おぼれ: "drowning",
  溺水: "drowning",
  // --- 有害物等との接触 ---
  "有害物等との接触": "harmful-substance",
  "有害物との接触": "harmful-substance",
  酸素欠乏: "harmful-substance",
  有害光線: "harmful-substance",
  有害物質: "harmful-substance",
  // --- 火災・感電・爆発・破裂 ---
  火災: "fire",
  感電: "electric-shock",
  爆発: "explosion",
  破裂: "rupture",
  // --- 切れ・こすれ ---
  "切れ、こすれ": "cut-abrasion",
  "切れ・こすれ": "cut-abrasion",
  "切れ･こすれ": "cut-abrasion",
  // --- 踏み抜き ---
  踏み抜き: "stepping-through",
  踏抜き: "stepping-through",
  // --- 交通事故 ---
  "交通事故（道路）": "traffic-road",
  "交通事故(道路)": "traffic-road",
  交通事故: "traffic-road",
  "交通事故（その他）": "traffic-other",
  "交通事故(その他)": "traffic-other",
  車両: "traffic-other",
  // --- 動作の反動・無理な動作 ---
  "動作の反動、無理な動作": "overexertion",
  "動作の反動・無理な動作": "overexertion",
  動作の反動無理な動作: "overexertion",
  // --- その他・分類不能 ---
  その他: "other",
  振動障害: "other",
  分類不能: "unclassifiable",
  "#REF!": "unclassifiable",
};

/**
 * 任意の型表記を正本 slug に解決する。未知の表記は null（呼び出し側で
 * 「その他」に落とすか除外するかを選ぶ。テストは null を検知して落とす）。
 */
export function normalizeHazardType(raw: string | null | undefined): HazardTypeSlug | null {
  if (!raw) return null;
  const key = raw.trim();
  if (!key) return null;
  return HAZARD_TYPE_ALIASES[key] ?? null;
}

/** 表記を正本の表示ラベル（中黒表記）に解決する。未知はそのまま返す。 */
export function normalizeHazardLabel(raw: string): string {
  const slug = normalizeHazardType(raw);
  return slug ? getHazardType(slug).label : raw;
}

/**
 * 事例DB union（AccidentType）→ 正本 slug。エイリアス辞書のうち union 由来の
 * 対応だけを型安全に引けるようにした版（网羅性は型で保証）。
 */
export const ACCIDENT_TYPE_TO_HAZARD_SLUG: Readonly<Record<AccidentType, HazardTypeSlug>> = {
  墜落: "fall",
  転倒: "trip",
  "はさまれ・巻き込まれ": "caught-in",
  "切れ・こすれ": "cut-abrasion",
  "飛来・落下": "flying-falling-object",
  感電: "electric-shock",
  車両: "traffic-other",
  交通事故: "traffic-road",
  "崩壊・倒壊": "collapse",
  火災: "fire",
  爆発: "explosion",
  "高温・低温の物との接触": "hot-cold-contact",
  "有害物等との接触": "harmful-substance",
  酸素欠乏: "harmful-substance",
  溺水: "drowning",
  熱中症: "hot-cold-contact",
  低体温症: "hot-cold-contact",
  有害光線: "harmful-substance",
  有害物質: "harmful-substance",
  激突され: "struck-by",
  振動障害: "other",
  "動作の反動・無理な動作": "overexertion",
};
