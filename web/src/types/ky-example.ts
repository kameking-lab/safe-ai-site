/**
 * KY (Kiken Yochi / Hazard Identification) example record schema.
 *
 * Sourced from publicly released safety education materials such as MHLW
 * (厚生労働省), JISHA (中央労働災害防止協会), and 建設業労働災害防止協会.
 * All `risks[]` / `countermeasures[]` text in the dataset is independently
 * summarized, not transcribed verbatim from the source material.
 */
export type KyIndustryId =
  | "construction"
  | "manufacturing"
  | "transport"
  | "medical-welfare"
  | "service";

export type KyWorkTypeId =
  | "fall-work" // 高所作業
  | "heavy-load" // 重量物運搬
  | "machine" // 機械操作
  | "electrical" // 電気作業
  | "chemical" // 化学物質取扱
  | "forklift" // フォークリフト
  | "excavation" // 掘削
  | "welding" // 溶接
  | "rigging" // 玉掛け
  | "other"; // その他

export type KySourceCategory =
  | "mhlw" // 厚生労働省
  | "jisha" // 中央労働災害防止協会
  | "kensaibou" // 建設業労働災害防止協会
  | "general"; // 一般公開教材

export type KyExampleSource = {
  category: KySourceCategory;
  /** Short label shown in UI (e.g. "厚生労働省「労働災害事例」"). */
  label: string;
};

export type KyExample = {
  id: string;
  industry: KyIndustryId;
  workType: KyWorkTypeId;
  /** Short title of the work scenario, shown as the card heading. */
  title: string;
  /** 2-4 hazard factors (危険要因) — what could go wrong. */
  hazards: string[];
  /** 2-3 anticipated harms (リスク) — who/how is harmed. */
  risks: string[];
  /** 3-5 countermeasures (対策). */
  countermeasures: string[];
  /** Up to ~6 keyword tags for search/filter. */
  keywords: string[];
  source: KyExampleSource;
};

export const KY_INDUSTRY_LABELS: Record<KyIndustryId, string> = {
  construction: "建設業",
  manufacturing: "製造業",
  transport: "運輸業",
  "medical-welfare": "医療・福祉",
  service: "サービス業",
};

export const KY_WORK_TYPE_LABELS: Record<KyWorkTypeId, string> = {
  "fall-work": "高所作業",
  "heavy-load": "重量物運搬",
  machine: "機械操作",
  electrical: "電気作業",
  chemical: "化学物質取扱",
  forklift: "フォークリフト",
  excavation: "掘削",
  welding: "溶接",
  rigging: "玉掛け",
  other: "その他",
};

export const KY_INDUSTRY_IDS: readonly KyIndustryId[] = [
  "construction",
  "manufacturing",
  "transport",
  "medical-welfare",
  "service",
] as const;

export const KY_WORK_TYPE_IDS: readonly KyWorkTypeId[] = [
  "fall-work",
  "heavy-load",
  "machine",
  "electrical",
  "chemical",
  "forklift",
  "excavation",
  "welding",
  "rigging",
  "other",
] as const;
