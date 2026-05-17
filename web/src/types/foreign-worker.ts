/**
 * Foreign-worker support domain types.
 *
 * Two orthogonal concerns are modelled here:
 *
 * 1. Residence-status guides — what labor / immigration law says about each
 *    Status of Residence (在留資格) under the Immigration Control Act and the
 *    Technical Intern Training Act. Used by `/foreign-workers/status/[status]`.
 *
 * 2. Multilingual safety training materials — short, plain-language safety
 *    talks paired with translations in the four most-common worker languages
 *    on Japanese sites today (English, Vietnamese, Chinese, Indonesian) plus
 *    a Yasashii-Nihongo (易しい日本語) base. Used by
 *    `/foreign-workers/safety-training`.
 *
 * Both data sets are independent of the global i18n catalog (`src/lib/i18n/`)
 * because the audience differs: i18n targets site visitors, foreign-worker
 * materials target the workers themselves, where literal back-translation
 * fidelity matters more than UI tone.
 */

/* ---------- Languages ---------- */

/**
 * Languages supported for foreign-worker materials.
 * - `ja-easy` is Yasashii-Nihongo (易しい日本語) — short sentences, only
 *   common-use kanji, ruby recommended.
 * - The remaining four cover the top sending countries reported by the
 *   Ministry of Health, Labour and Welfare's annual foreign-worker statistics
 *   (令和5年「外国人雇用状況」届出): VN, CN, ID, plus EN as lingua franca.
 */
export type MaterialLanguage = "ja-easy" | "en" | "vi" | "zh" | "id";

export const MATERIAL_LANGUAGES: MaterialLanguage[] = [
  "ja-easy",
  "en",
  "vi",
  "zh",
  "id",
];

export const MATERIAL_LANGUAGE_LABELS: Record<MaterialLanguage, string> = {
  "ja-easy": "やさしい日本語",
  en: "English",
  vi: "Tiếng Việt",
  zh: "中文",
  id: "Bahasa Indonesia",
};

export const MATERIAL_LANGUAGE_LABELS_JA: Record<MaterialLanguage, string> = {
  "ja-easy": "やさしい日本語",
  en: "英語",
  vi: "ベトナム語",
  zh: "中国語",
  id: "インドネシア語",
};

/* ---------- Residence status (在留資格) ---------- */

/**
 * Residence-status identifiers. The set covers the categories that most often
 * appear in workplace safety contexts; it deliberately omits diplomatic /
 * student-only statuses because they do not authorize regular employment.
 *
 * - `technical-intern-1` / `-2` / `-3` correspond to 技能実習1号・2号・3号.
 * - `specified-skilled-1` / `-2` correspond to 特定技能1号・2号.
 * - `engineer-humanities-intl` is 技術・人文知識・国際業務.
 * - `skilled-labor` is 技能 (e.g. foreign cuisine cooks).
 * - `permanent-resident` / `long-term-resident` / `spouse-of-japanese`
 *   are 永住者・定住者・日本人の配偶者等 (status-based — no work limit).
 * - `designated-activities-eparts-jpn-cook` covers 特定活動 with employment
 *   permission. It is a single bucket because the safety obligations are
 *   broadly identical across sub-categories.
 */
export type ResidenceStatusId =
  | "technical-intern-1"
  | "technical-intern-2"
  | "technical-intern-3"
  | "specified-skilled-1"
  | "specified-skilled-2"
  | "engineer-humanities-intl"
  | "skilled-labor"
  | "permanent-resident"
  | "long-term-resident"
  | "spouse-of-japanese"
  | "designated-activities-employment";

export const RESIDENCE_STATUS_LABELS_JA: Record<ResidenceStatusId, string> = {
  "technical-intern-1": "技能実習1号",
  "technical-intern-2": "技能実習2号",
  "technical-intern-3": "技能実習3号",
  "specified-skilled-1": "特定技能1号",
  "specified-skilled-2": "特定技能2号",
  "engineer-humanities-intl": "技術・人文知識・国際業務",
  "skilled-labor": "技能（外国料理調理師等）",
  "permanent-resident": "永住者",
  "long-term-resident": "定住者",
  "spouse-of-japanese": "日本人の配偶者等",
  "designated-activities-employment": "特定活動（就労可）",
};

export const RESIDENCE_STATUS_LABELS_EN: Record<ResidenceStatusId, string> = {
  "technical-intern-1": "Technical Intern Training (i)",
  "technical-intern-2": "Technical Intern Training (ii)",
  "technical-intern-3": "Technical Intern Training (iii)",
  "specified-skilled-1": "Specified Skilled Worker (i)",
  "specified-skilled-2": "Specified Skilled Worker (ii)",
  "engineer-humanities-intl": "Engineer / Specialist in Humanities / International Services",
  "skilled-labor": "Skilled Labor",
  "permanent-resident": "Permanent Resident",
  "long-term-resident": "Long-Term Resident",
  "spouse-of-japanese": "Spouse or Child of Japanese National",
  "designated-activities-employment": "Designated Activities (employment permitted)",
};

/**
 * Buckets used to group statuses on the hub page. The grouping matches how
 * MHLW pamphlets explain the system to employers (work-restricted vs.
 * status-based vs. activity-based).
 */
export type ResidenceCategory =
  | "training" // 技能実習 — strict work-scope limits, dispatch prohibited
  | "specified-skill" // 特定技能 — 12 industrial fields, transferable
  | "professional" // 技人国・技能 — academic/skill-based, white-collar
  | "status-based" // 永住・定住・日配 — no work-scope limit
  | "designated"; // 特定活動 — case-by-case

export const RESIDENCE_CATEGORY_LABELS_JA: Record<ResidenceCategory, string> = {
  training: "技能実習（職種限定・転籍原則不可）",
  "specified-skill": "特定技能（特定産業分野・転職可）",
  professional: "専門的・技術的分野",
  "status-based": "身分・地位に基づく在留資格（就労制限なし）",
  designated: "特定活動",
};

/**
 * The 12 specified-industry fields recognised under the Specified Skilled
 * Worker programme as of 2024 reform. The English IDs are stable; Japanese
 * labels reflect the post-2024 reorganisation that merged the former
 * 素形材・産業機械・電気電子情報関連製造業 fields into 工業製品製造業 and added
 * 自動車運送業・鉄道・林業・木材産業.
 */
export type SsfField =
  | "care"
  | "building-cleaning"
  | "industrial-products"
  | "construction"
  | "shipbuilding"
  | "automobile-maintenance"
  | "aviation"
  | "accommodation"
  | "automobile-transport"
  | "railway"
  | "agriculture"
  | "fishery"
  | "food-manufacturing"
  | "food-service"
  | "forestry"
  | "wood-industry";

export const SSF_FIELD_LABELS_JA: Record<SsfField, string> = {
  care: "介護",
  "building-cleaning": "ビルクリーニング",
  "industrial-products": "工業製品製造業",
  construction: "建設",
  shipbuilding: "造船・舶用工業",
  "automobile-maintenance": "自動車整備",
  aviation: "航空",
  accommodation: "宿泊",
  "automobile-transport": "自動車運送業",
  railway: "鉄道",
  agriculture: "農業",
  fishery: "漁業",
  "food-manufacturing": "飲食料品製造業",
  "food-service": "外食業",
  forestry: "林業",
  "wood-industry": "木材産業",
};

/* ---------- Law reference (shared shape) ---------- */

export interface LawReference {
  /** Short statute label, e.g. "労働基準法". */
  name: string;
  /** Article references shown as plain strings. */
  articles?: string[];
  /** Original summary (not verbatim statute text). */
  summary: string;
}

/* ---------- Residence-status rule shape ---------- */

export interface EmployerObligation {
  id: string;
  title: string;
  /** One-paragraph practitioner summary. */
  detail: string;
  /** Optional law reference for traceability. */
  law?: LawReference;
}

export interface WorkerRight {
  id: string;
  title: string;
  detail: string;
  law?: LawReference;
}

export interface CommonTrouble {
  id: string;
  title: string;
  /** Description of the trouble pattern as seen in practice. */
  detail: string;
  /** Practical mitigation recommendation. */
  mitigation: string;
}

export interface ResidenceStatusRule {
  id: ResidenceStatusId;
  category: ResidenceCategory;
  /** Japanese label kept on the rule for offline rendering. */
  labelJa: string;
  labelEn: string;
  /** One-line description for hub cards. */
  summary: string;
  /** Maximum length of stay, in human-readable form. */
  periodOfStay: string;
  /**
   * What kinds of work this status authorises. Free text because the
   * authorised scope changes per individual (designation of work category,
   * permission for activity outside status, etc.).
   */
  workScope: string;
  /** True when there is no work-scope limit (status-based statuses). */
  unlimitedWorkScope: boolean;
  /** True when work-category transfer is normally allowed (e.g. SSW). */
  transferAllowed: boolean;
  /**
   * If this status maps to specified industrial fields, list them. Empty for
   * non-SSW statuses.
   */
  ssfFields?: SsfField[];
  /** Labor and safety laws that apply with anything noteworthy. */
  relevantSafetyLaws: LawReference[];
  /** Concrete employer obligations under that status. */
  employerObligations: EmployerObligation[];
  /** Rights workers retain regardless of nationality. */
  workerRights: WorkerRight[];
  /** Common trouble patterns reported by JITCO / OTIT / labor bureaus. */
  commonTroubles: CommonTrouble[];
  /** Authoritative sources (kept for citation; URLs not loaded at runtime). */
  sources: Array<{ name: string; url?: string }>;
}

/* ---------- Multilingual safety training material ---------- */

/**
 * Industry grouping used by the safety-training builder. Matches the
 * categories used by MHLW's foreign-worker safety leaflet series
 * (建設業・製造業・介護・農業・外食業・宿泊業).
 */
export type MaterialIndustry =
  | "construction"
  | "manufacturing"
  | "care"
  | "agriculture"
  | "food-service"
  | "accommodation";

export const MATERIAL_INDUSTRY_LABELS_JA: Record<MaterialIndustry, string> = {
  construction: "建設業",
  manufacturing: "製造業",
  care: "介護",
  agriculture: "農業",
  "food-service": "外食業",
  accommodation: "宿泊業",
};

export const MATERIAL_INDUSTRY_LABELS_EN: Record<MaterialIndustry, string> = {
  construction: "Construction",
  manufacturing: "Manufacturing",
  care: "Caregiving",
  agriculture: "Agriculture",
  "food-service": "Food service",
  accommodation: "Accommodation",
};

/**
 * Safety topics that have been identified as a leading cause of foreign-
 * worker injury under MHLW's 死亡災害・休業4日以上 statistics. The set is
 * intentionally compact so each industry has a usable cross-product.
 */
export type MaterialTopic =
  | "fall-from-height" // 高所作業・墜落転落
  | "chemical-handling" // 化学物質取扱い
  | "heatstroke" // 熱中症予防
  | "lower-back-injury" // 腰痛予防
  | "infection-prevention"; // 感染症予防

export const MATERIAL_TOPIC_LABELS_JA: Record<MaterialTopic, string> = {
  "fall-from-height": "高所作業・墜落転落の防止",
  "chemical-handling": "化学物質の正しい取扱い",
  heatstroke: "熱中症の予防",
  "lower-back-injury": "腰痛の予防",
  "infection-prevention": "感染症の予防",
};

export const MATERIAL_TOPIC_LABELS_EN: Record<MaterialTopic, string> = {
  "fall-from-height": "Preventing falls from height",
  "chemical-handling": "Safe handling of chemicals",
  heatstroke: "Heatstroke prevention",
  "lower-back-injury": "Lower-back injury prevention",
  "infection-prevention": "Infection prevention",
};

/**
 * A single bullet / checklist row, rendered in the chosen language. Bullets
 * are kept short (<= ~25 characters in Japanese / ~12 words in English) so
 * a worker can read them at a glance on a paper handout.
 */
export interface MaterialBullet {
  /** Stable id within the material — used as React key. */
  id: string;
  /**
   * Translation table. Every bullet ships all five languages so the printable
   * handout can show parallel columns without runtime fallback logic.
   */
  text: Record<MaterialLanguage, string>;
  /**
   * Optional hint that this bullet is best paired with an illustration on the
   * printed handout. Illustration generation is out of scope; the flag is
   * surfaced as a margin marker on the page.
   */
  illustrationHint?: string;
}

export interface SafetyMaterial {
  id: string;
  industry: MaterialIndustry;
  topic: MaterialTopic;
  /** Title shown on cards & PDF headers, fully translated. */
  title: Record<MaterialLanguage, string>;
  /** 1-2 line lead paragraph, fully translated. */
  intro: Record<MaterialLanguage, string>;
  /** Action checklist — usually 5-8 rows. */
  checklist: MaterialBullet[];
  /** Emergency response or report-to lines. */
  emergency: MaterialBullet[];
  /** Source attribution (single line of plain text). */
  source: string;
}

/* ---------- Aggregate index types ---------- */

export interface ResidenceStatusIndex {
  byId: Record<ResidenceStatusId, ResidenceStatusRule>;
  all: ResidenceStatusRule[];
}

export interface SafetyMaterialIndex {
  all: SafetyMaterial[];
  byIndustry: Record<MaterialIndustry, SafetyMaterial[]>;
  byTopic: Record<MaterialTopic, SafetyMaterial[]>;
}

/**
 * Filter input for the material builder.
 */
export interface MaterialFilter {
  industry?: MaterialIndustry;
  topic?: MaterialTopic;
  language?: MaterialLanguage;
}
