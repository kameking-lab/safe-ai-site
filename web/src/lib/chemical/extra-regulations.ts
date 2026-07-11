/**
 * 化学物質RA 追加規制オーバーレイ（Phase B 全面実装）。
 *
 * 既存の事前ビルド済み物質DB（CONCENTRATION_LIMITS / regulation-tag-labels）を再生成せず、
 * ランタイムで CAS 主キーに以下を重畳する純粋モジュール:
 *  - P1-6 土壌汚染対策法 特定有害物質（単一CAS対応分のみ。群指定は別途注記）
 *  - P2-3 物性/カテゴリ定義型の法律（消防法・廃掃法・高圧ガス保安法）の「該当可能性—要確認」二層情報
 *
 * 【創作禁止の遵守】
 *  - 土壌の CAS は環境省/厚労省で確認できた単一CAS物質のみを収録（出典: docs/chemical-ra-deep-audit-2026-05-26 調査）。
 *    群指定（「○○及びその化合物」等）は CAS で一意紐付けできないため収録せず、件数のみ注記。
 *  - 物性型法律は個別物質の該当を断定せず、「物性により該当しうる—法令本文で要確認」とし e-Gov へ誘導する。
 */

import { normalizeCas } from "@/lib/chemical/cas-text-helpers";

// ── P1-6 土壌汚染対策法 特定有害物質（単一CAS対応 14物質） ──────────────
export type SoilKind = "第一種(揮発性有機化合物)" | "第三種(農薬等)";

export interface SoilSubstance {
  cas: string;
  name: string;
  kind: SoilKind;
  note?: string;
}

/**
 * 土壌汚染対策法 特定有害物質のうち、公式で単一CASを特定できる物質（第一種11 + 第三種3 = 14）。
 * 第二種(重金属等9) と 第三種の有機りん化合物・PCB は群指定のため CAS 一意紐付け不可（収録せず）。
 * 出典: 環境省 土壌汚染対策法 特定有害物質一覧 / 厚労省 職場のあんぜんサイト(CAS確認)。調査 2026-05-26。
 */
export const SOIL_CONTAMINATION_SUBSTANCES: readonly SoilSubstance[] = [
  // 第一種（揮発性有機化合物）— 単一CAS対応
  { cas: "75-01-4", name: "クロロエチレン（塩化ビニル）", kind: "第一種(揮発性有機化合物)" },
  { cas: "56-23-5", name: "四塩化炭素", kind: "第一種(揮発性有機化合物)" },
  { cas: "107-06-2", name: "1,2-ジクロロエタン", kind: "第一種(揮発性有機化合物)" },
  { cas: "75-35-4", name: "1,1-ジクロロエチレン（塩化ビニリデン）", kind: "第一種(揮発性有機化合物)" },
  { cas: "542-75-6", name: "1,3-ジクロロプロペン", kind: "第一種(揮発性有機化合物)", note: "厳密にはcis/trans混合物" },
  { cas: "75-09-2", name: "ジクロロメタン（塩化メチレン）", kind: "第一種(揮発性有機化合物)" },
  { cas: "127-18-4", name: "テトラクロロエチレン", kind: "第一種(揮発性有機化合物)" },
  { cas: "71-55-6", name: "1,1,1-トリクロロエタン", kind: "第一種(揮発性有機化合物)" },
  { cas: "79-00-5", name: "1,1,2-トリクロロエタン", kind: "第一種(揮発性有機化合物)" },
  { cas: "79-01-6", name: "トリクロロエチレン", kind: "第一種(揮発性有機化合物)" },
  { cas: "71-43-2", name: "ベンゼン", kind: "第一種(揮発性有機化合物)" },
  // 第三種（農薬等）— 単一CAS対応
  { cas: "122-34-9", name: "シマジン（CAT）", kind: "第三種(農薬等)" },
  { cas: "28249-77-6", name: "チオベンカルブ", kind: "第三種(農薬等)" },
  { cas: "137-26-8", name: "チウラム（チラム）", kind: "第三種(農薬等)" },
];

/** 群指定（CAS一意紐付け不可）で本オーバーレイ未収録の特定有害物質の件数（参考表示用）。 */
export const SOIL_GROUP_DESIGNATED_COUNT = 12; // 第一種1(1,2-DCE異性体) + 第二種9(重金属等) + 第三種2(有機りん/PCB)

export const SOIL_LAW_OFFICIAL_URL = "https://laws.e-gov.go.jp/law/414AC0000000053/"; // 土壌汚染対策法（e-Gov）

const SOIL_MAP: Map<string, SoilSubstance> = new Map(
  SOIL_CONTAMINATION_SUBSTANCES.map((s) => [normalizeCas(s.cas), s])
);

/** CAS が土壌汚染対策法 特定有害物質（単一CAS対応分）に該当すれば返す。 */
export function soilContaminationForCas(cas: string): SoilSubstance | null {
  return SOIL_MAP.get(normalizeCas(cas)) ?? null;
}

// ── P2-3 物性/カテゴリ定義型の法律（該当可能性—要確認の二層情報） ──────────
export interface PhysicalPropertyLaw {
  /** 法律キー（テスト・描画用の安定ID） */
  key: "fire" | "waste" | "highpressure";
  /** 法律正式名 */
  name: string;
  /** なぜCASで一意判定できないか／判定の考え方（要確認の根拠） */
  criterion: string;
  /** 現場が確認すべき着眼点 */
  checkpoints: readonly string[];
  /** 法令本文（e-Gov 等）公式URL */
  officialUrl: string;
}

/**
 * 物性・カテゴリで規制される法律。個別CASで該当を断定せず「該当しうる—要確認」として
 * 判定材料と法令リンクを提供する（消防法/廃掃法/高圧ガス保安法）。
 */
export const PHYSICAL_PROPERTY_LAWS: readonly PhysicalPropertyLaw[] = [
  {
    key: "fire",
    name: "消防法（危険物 第1類〜第6類）",
    criterion:
      "消防法の危険物は個別CASではなく『品名』＋物性（引火点・酸化性等）で定義されるため、物質名だけでは一意に該当判定できません。同じ物質でも状態・濃度・数量で扱いが変わります。",
    checkpoints: [
      "引火性液体か（引火点で第4類の石油類区分が変わる）",
      "酸化性・自己反応性・禁水性などの性状があるか",
      "貯蔵・取扱数量が指定数量以上か（指定数量の倍数で規制区分）",
    ],
    officialUrl: "https://laws.e-gov.go.jp/law/323AC1000000186/", // 消防法（e-Gov）
  },
  {
    key: "waste",
    name: "廃棄物処理法（特別管理産業廃棄物）",
    criterion:
      "特別管理産業廃棄物は物質名ではなく由来・物性（廃油の引火点70℃未満、廃酸pH2.0以下、廃アルカリpH12.5以上、感染性、廃PCB・廃石綿等）で定義されます。廃棄段階の状態で該当が決まります。",
    checkpoints: [
      "廃油・廃酸・廃アルカリの物性が基準に該当するか",
      "廃PCB等・廃石綿等・水銀等の特定品目を含むか",
      "排出事業者としての保管・運搬・処分・委託基準（マニフェスト）",
    ],
    officialUrl: "https://laws.e-gov.go.jp/law/345AC0000000137/", // 廃棄物処理法（e-Gov）
  },
  {
    key: "highpressure",
    name: "高圧ガス保安法",
    criterion:
      "規制は『高圧の状態』（圧縮ガス1MPaG以上等）に依存し、同じ物質でも常圧では非対象です。可燃性ガス・毒性ガスの指定にも該当性が左右されます。",
    checkpoints: [
      "常温・使用圧力で高圧ガスの定義に該当するか",
      "可燃性ガス・毒性ガスに指定されているか",
      "貯蔵・製造・移動の数量・形態（容器・設備）",
    ],
    officialUrl: "https://laws.e-gov.go.jp/law/326AC0000000204/", // 高圧ガス保安法（e-Gov）
  },
];

// ── P2-2 大気汚染防止法 / 水質汚濁防止法（単一CAS対応・公式確認済みのみ） ──────────
// 出典: 環境省 有害大気汚染物質対策(優先取組23物質)・大気汚染防止法施行令(特定物質)・
//       水質汚濁防止法 有害物質28項目。CAS は厚労省「職場のあんぜんサイト」(URLスラッグ=CAS)で確認。
// 群指定(「○○及びその化合物」等)・標準CASだが個別未確認の物質は収録せず(創作回避)。調査 2026-05-26。

export type AirCategory = "優先取組物質" | "特定物質(事故時)";

export interface AirPollutionSubstance {
  cas: string;
  name: string;
  category: AirCategory;
}

/** 大気汚染防止法 単一CAS対応（公式anzeninfo確認済み）。優先取組13 + 特定物質の追加分。 */
export const AIR_POLLUTION_SUBSTANCES: readonly AirPollutionSubstance[] = [
  // 優先取組物質（単一CAS確認済み）
  { cas: "107-13-1", name: "アクリロニトリル", category: "優先取組物質" },
  { cas: "75-07-0", name: "アセトアルデヒド", category: "優先取組物質" },
  { cas: "75-01-4", name: "塩化ビニルモノマー（クロロエチレン）", category: "優先取組物質" },
  { cas: "74-87-3", name: "塩化メチル（クロロメタン）", category: "優先取組物質" },
  { cas: "67-66-3", name: "クロロホルム", category: "優先取組物質" },
  { cas: "75-21-8", name: "酸化エチレン（エチレンオキシド）", category: "優先取組物質" },
  { cas: "107-06-2", name: "1,2-ジクロロエタン", category: "優先取組物質" },
  { cas: "75-09-2", name: "ジクロロメタン", category: "優先取組物質" },
  { cas: "127-18-4", name: "テトラクロロエチレン", category: "優先取組物質" },
  { cas: "79-01-6", name: "トリクロロエチレン", category: "優先取組物質" },
  { cas: "106-99-0", name: "1,3-ブタジエン", category: "優先取組物質" },
  { cas: "71-43-2", name: "ベンゼン", category: "優先取組物質" },
  { cas: "50-00-0", name: "ホルムアルデヒド", category: "優先取組物質" },
  // 特定物質（事故時規制・単一CAS確認済みの追加分）
  { cas: "7664-41-7", name: "アンモニア", category: "特定物質(事故時)" },
  { cas: "7664-39-3", name: "ふっ化水素", category: "特定物質(事故時)" },
  { cas: "7647-01-0", name: "塩化水素", category: "特定物質(事故時)" },
  { cas: "7782-50-5", name: "塩素", category: "特定物質(事故時)" },
  { cas: "75-44-5", name: "ホスゲン", category: "特定物質(事故時)" },
];

export interface WaterPollutionSubstance {
  cas: string;
  name: string;
}

/** 水質汚濁防止法 有害物質 単一CAS対応（公式anzeninfo確認済み 14物質）。群指定12〜13項目は別途。 */
export const WATER_POLLUTION_SUBSTANCES: readonly WaterPollutionSubstance[] = [
  { cas: "79-01-6", name: "トリクロロエチレン" },
  { cas: "127-18-4", name: "テトラクロロエチレン" },
  { cas: "75-09-2", name: "ジクロロメタン" },
  { cas: "56-23-5", name: "四塩化炭素" },
  { cas: "107-06-2", name: "1,2-ジクロロエタン" },
  { cas: "156-59-2", name: "シス-1,2-ジクロロエチレン" },
  { cas: "71-55-6", name: "1,1,1-トリクロロエタン" },
  { cas: "79-00-5", name: "1,1,2-トリクロロエタン" },
  { cas: "542-75-6", name: "1,3-ジクロロプロペン" },
  { cas: "137-26-8", name: "チウラム" },
  { cas: "122-34-9", name: "シマジン" },
  { cas: "28249-77-6", name: "チオベンカルブ" },
  { cas: "71-43-2", name: "ベンゼン" },
  { cas: "123-91-1", name: "1,4-ジオキサン" },
];

/** 群指定（CAS一意紐付け不可）で未収録の項目件数（参考表示用）。 */
export const AIR_GROUP_DESIGNATED_COUNT = 8; // 優先取組のうち クロム/六価クロム/水銀/ダイオキシン/ニッケル/ヒ素/ベリリウム/マンガン
export const WATER_GROUP_DESIGNATED_COUNT = 12; // カドミウム及びその化合物 等

export const AIR_LAW_OFFICIAL_URL = "https://www.env.go.jp/air/osen/law/yugai.html";
export const WATER_LAW_OFFICIAL_URL = "https://laws.e-gov.go.jp/law/345AC0000000138/";

const AIR_MAP: Map<string, AirPollutionSubstance> = new Map(
  AIR_POLLUTION_SUBSTANCES.map((s) => [normalizeCas(s.cas), s])
);
const WATER_MAP: Map<string, WaterPollutionSubstance> = new Map(
  WATER_POLLUTION_SUBSTANCES.map((s) => [normalizeCas(s.cas), s])
);

/** CAS が大気汚染防止法の単一CAS対応物質なら返す。 */
export function airPollutionForCas(cas: string): AirPollutionSubstance | null {
  return AIR_MAP.get(normalizeCas(cas)) ?? null;
}

/** CAS が水質汚濁防止法の単一CAS対応有害物質なら返す。 */
export function waterPollutionForCas(cas: string): WaterPollutionSubstance | null {
  return WATER_MAP.get(normalizeCas(cas)) ?? null;
}
