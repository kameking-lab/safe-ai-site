/**
 * Health-checkup scheduler types.
 *
 * Models the five Japanese occupational health-checkup categories required
 * under the Industrial Safety and Health Act and its subordinate regulations
 * (安衛則・特化則・有機則・鉛則・四アルキル鉛則・高気圧則・電離則・じん肺法).
 *
 * The data shape is deliberately neutral: each {@link CheckupRule} declares
 * what conditions trigger it, what items are tested, and how often. The
 * engine in `@/lib/health-checkup-engine` then composes the required set
 * from a worker profile (industry / jobs / substances / work conditions).
 */

export type CheckupType =
  | "general"
  | "specific-job"
  | "special"
  | "silicosis"
  | "dental-special"
  | "electron-radiation"
  | "overtime"
  | "overseas";

export const CHECKUP_TYPE_LABELS: Record<CheckupType, string> = {
  general: "一般健康診断",
  "specific-job": "特定業務従事者の健康診断",
  special: "特殊健康診断",
  silicosis: "じん肺健康診断",
  "dental-special": "歯科特殊健康診断",
  "electron-radiation": "電離放射線健康診断",
  overtime: "長時間労働者の医師面接指導",
  overseas: "海外派遣労働者の健康診断",
};

export type IndustryId =
  | "construction"
  | "manufacturing"
  | "transportation"
  | "medical"
  | "service";

export const INDUSTRY_LABELS: Record<IndustryId, string> = {
  construction: "建設業",
  manufacturing: "製造業",
  transportation: "運輸交通業",
  medical: "医療・福祉",
  service: "サービス業",
};

/**
 * Hazardous substances / agents that trigger one or more special checkups.
 * IDs are chosen to be readable and stable; they are not chemical IDs.
 */
export type SubstanceId =
  | "organic-solvent" // 有機溶剤（有機則別表第1類〜第3類）
  | "lead" // 鉛・鉛化合物
  | "tetra-alkyl-lead" // 四アルキル鉛
  | "specified-chemical" // 特化則別表第1・第2の特定化学物質（汎用）
  | "asbestos" // 石綿
  | "silica-dust" // 粉じん（じん肺法対象作業）
  | "welding-fume" // 溶接ヒューム（特化則）
  | "chromium" // 6価クロム・クロム酸塩
  | "cadmium" // カドミウム
  | "manganese" // マンガン・マンガン化合物
  | "nickel" // ニッケル化合物
  | "benzene" // ベンゼン
  | "vinyl-chloride" // 塩化ビニル
  | "isocyanate" // イソシアネート類
  | "formaldehyde" // ホルムアルデヒド
  | "dichloromethane" // ジクロロメタン
  | "mercury" // 水銀・水銀化合物
  | "dental-acid" // 塩酸・硝酸・硫酸・亜硫酸・フッ化水素・黄リン等（歯科特殊）
  | "beryllium" // ベリリウム及びその化合物（特化則・特別管理物質）
  | "arsenic" // 砒素及びその化合物（特化則・特別管理物質）
  | "hydrofluoric-acid" // フッ化水素（特化則第2類・歯科特殊重複）
  | "phosphorus-yellow"; // 黄りん（特化則・顎骨壊死）

export const SUBSTANCE_LABELS: Record<SubstanceId, string> = {
  "organic-solvent": "有機溶剤（有機則対象）",
  lead: "鉛・鉛化合物",
  "tetra-alkyl-lead": "四アルキル鉛",
  "specified-chemical": "特定化学物質（特化則対象）",
  asbestos: "石綿",
  "silica-dust": "粉じん（じん肺法対象作業）",
  "welding-fume": "溶接ヒューム",
  chromium: "クロム酸・6価クロム化合物",
  cadmium: "カドミウム・カドミウム化合物",
  manganese: "マンガン・マンガン化合物",
  nickel: "ニッケル化合物",
  benzene: "ベンゼン",
  "vinyl-chloride": "塩化ビニル",
  isocyanate: "有機イソシアネート",
  formaldehyde: "ホルムアルデヒド",
  dichloromethane: "ジクロロメタン",
  mercury: "水銀・水銀化合物",
  "dental-acid": "塩酸・硝酸・硫酸等の酸蒸気（歯科特殊対象）",
  beryllium: "ベリリウム・ベリリウム化合物",
  arsenic: "砒素・砒素化合物",
  "hydrofluoric-acid": "フッ化水素・フッ化水素酸",
  "phosphorus-yellow": "黄りん（白リン）",
};

/**
 * Work conditions used by 安衛則第13条第1項第3号 (specific-job tasks) and the
 * special-checkup regulations to qualify workers for additional checkups.
 */
export type WorkConditionId =
  | "night-work" // 深夜業を含む業務
  | "hot-work" // 多量の高熱物体を取扱う・著しく暑熱な場所
  | "cold-work" // 多量の低温物体を取扱う・著しく寒冷な場所
  | "noise-work" // 強烈な騒音を発する場所における業務
  | "vibration-work" // 著しい振動を与える業務（チェーンソー等）
  | "radiation-work" // 電離放射線業務
  | "high-pressure-work" // 高圧室内業務・潜水業務
  | "dust-work" // 粉じん作業（じん肺法施行規則別表）
  | "manual-handling" // 重量物取扱い・腰部に著しい負担のかかる業務
  | "vdt-work" // 情報機器作業（旧VDT）
  | "deep-night-driver" // 深夜時間帯の自動車運転を反復する業務
  | "underground-work" // 坑内における業務
  | "asbestos-handling-past" // 過去に石綿業務に従事（離職後も対象）
  | "overtime-80h" // 時間外・休日労働80時間超かつ疲労蓄積あり（労安法第66条の8）
  | "overseas-dispatch-6m"; // 6か月以上の海外派遣予定/終了（安衛則第45条の2）

export const WORK_CONDITION_LABELS: Record<WorkConditionId, string> = {
  "night-work": "深夜業を含む業務",
  "hot-work": "多量の高熱物体・暑熱な場所での業務",
  "cold-work": "多量の低温物体・寒冷な場所での業務",
  "noise-work": "強烈な騒音を発する場所での業務",
  "vibration-work": "著しい振動を与える業務（チェーンソー・削岩機等）",
  "radiation-work": "電離放射線業務",
  "high-pressure-work": "高圧室内業務・潜水業務",
  "dust-work": "粉じん作業（じん肺法対象）",
  "manual-handling": "重量物取扱い・腰部負担業務",
  "vdt-work": "情報機器作業（長時間・拘束的なもの）",
  "deep-night-driver": "深夜時間帯に自動車運転を反復する業務",
  "underground-work": "坑内における業務",
  "asbestos-handling-past": "過去に石綿業務へ従事した労働者",
  "overtime-80h": "時間外労働80時間超／疲労蓄積（労安法66条の8）",
  "overseas-dispatch-6m": "6か月以上の海外派遣予定または帰国直後（安衛則45条の2）",
};

/**
 * Frequency descriptor. We model it as small structured data so the scheduler
 * can place events on calendar months, and so missing-checkup detection can
 * compare against a worker's actual log.
 */
export interface CheckupFrequency {
  /** Required at hire / job-change / period-change-of-task. */
  atHire: boolean;
  /**
   * Periodic interval expressed in months. 12 = annual, 6 = semiannual,
   * 1 = monthly. Use 0 for event-driven exams (e.g. long-overtime interview,
   * overseas-dispatch pre/post checkup) that are not periodically placed on
   * the annual calendar by the scheduler.
   */
  intervalMonths: 0 | 1 | 3 | 6 | 12;
  /** Free-text qualifier shown to humans, e.g. "雇入時・配置替時・6月以内ごとに1回". */
  humanReadable: string;
  /**
   * True when the exam is triggered by a discrete event (overtime hours,
   * dispatch start/end, accident exposure) rather than the calendar. Drives
   * the scheduler/optimizer to surface it under the "随時実施" bucket
   * instead of placing it on a specific month.
   */
  eventDriven?: boolean;
}

export interface CheckupTestItems {
  /** Mandatory items (必須項目). Independent strings; no verbatim statute text. */
  mandatory: string[];
  /** Items physicians may omit (省略可) when medically justified. */
  omissible?: string[];
}

/**
 * Trigger predicate inputs. A rule "fires" if any declared trigger matches
 * the worker profile. The order of preference (industry → job → substance →
 * work condition → unconditional) is enforced by the engine, not the data.
 */
export interface CheckupTrigger {
  /** Fires for any worker (e.g. general annual checkup). */
  unconditional?: boolean;
  /** Fires when worker is in any of these industries. */
  industries?: IndustryId[];
  /** Fires when worker handles any of these substances. */
  substances?: SubstanceId[];
  /** Fires when worker has any of these work conditions. */
  workConditions?: WorkConditionId[];
}

export interface CheckupRule {
  id: string;
  type: CheckupType;
  title: string;
  /** One-sentence summary that explains who is in scope. */
  shortDescription: string;
  trigger: CheckupTrigger;
  frequency: CheckupFrequency;
  testItems: CheckupTestItems;
  /** Reference to the controlling regulation (independent summary). */
  relatedLaw: LawReference;
  /** Practitioner notes; flagged risks, common omissions, post-employment rules. */
  notes?: string[];
}

export interface LawReference {
  /** Statute name (e.g. "労働安全衛生規則"). */
  name: string;
  /** Article references (e.g. ["第43条", "第44条"]). */
  articles: string[];
  /** Original summary written for this project — not verbatim statute text. */
  summary: string;
}

/* ---------- Worker profile & engine inputs ---------- */

export interface JobProfile {
  id: string;
  industry: IndustryId;
  name: string;
  /** Free-text summary of typical tasks. */
  description: string;
  /** Substances inherent to the job (e.g. welder → welding-fume). */
  defaultSubstances: SubstanceId[];
  /** Work conditions inherent to the job (e.g. crane op → manual-handling). */
  defaultWorkConditions: WorkConditionId[];
  /** Practitioner-facing note. */
  notes?: string;
}

export interface WorkerProfile {
  industry: IndustryId;
  /** Selected job profile IDs. */
  jobIds: string[];
  /** Manually-added substances on top of jobs. */
  substances: SubstanceId[];
  /** Manually-added work conditions on top of jobs. */
  workConditions: WorkConditionId[];
  /** ISO date of hire (used to anchor 1st annual checkup). */
  hireDate: string;
}

/**
 * One row in the determined-required-checkups output.
 * `triggeredBy` records *which* trigger fired, so the UI can explain "なぜ".
 */
export interface RequiredCheckup {
  rule: CheckupRule;
  triggeredBy: Array<
    | { kind: "unconditional" }
    | { kind: "industry"; value: IndustryId }
    | { kind: "substance"; value: SubstanceId }
    | { kind: "work-condition"; value: WorkConditionId }
  >;
}

export type MonthIndex = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export const MONTH_LABELS_JA: Record<MonthIndex, string> = {
  1: "1月",
  2: "2月",
  3: "3月",
  4: "4月",
  5: "5月",
  6: "6月",
  7: "7月",
  8: "8月",
  9: "9月",
  10: "10月",
  11: "11月",
  12: "12月",
};

export interface ScheduleEntry {
  month: MonthIndex;
  ruleId: string;
  ruleTitle: string;
  type: CheckupType;
  /** Whether this event is the at-hire event (anchored to hireDate month). */
  isAtHire: boolean;
}

export interface AnnualSchedule {
  /** ISO yyyy-mm-dd anchor used to compute event months. */
  hireDate: string;
  entries: ScheduleEntry[];
}

export interface MissingCheckup {
  rule: CheckupRule;
  /** Why it is missing — e.g. "実施記録なし" or "前回実施から12か月以上経過". */
  reason: string;
}

export interface MissingCheckupInput {
  ruleId: string;
  /** ISO yyyy-mm-dd of the most recent completed exam. */
  lastPerformed?: string;
}
