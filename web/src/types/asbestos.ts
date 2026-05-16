/**
 * Asbestos compliance domain types.
 *
 * Models the practitioner-side concerns of complying with the Ordinance on
 * Prevention of Health Impairment Due to Asbestos (石綿障害予防規則), the
 * Industrial Safety and Health Act (労働安全衛生法) and the Air Pollution
 * Control Act (大気汚染防止法) for building demolition / renovation work.
 *
 * Two regulatory waves drive most operational questions on Japanese sites
 * today:
 *
 * - R4.4 (2022-04-01) — pre-work investigation reports must be filed with
 *   the Labour Standards Inspection Office for projects above defined
 *   thresholds, and the prefectural office under the Air Pollution Control
 *   Act, even when no asbestos is identified.
 * - R5.10 (2023-10-01) — only a Qualified Asbestos-Containing Building
 *   Materials Investigator (建築物石綿含有建材調査者) may carry out the
 *   pre-work investigation; the qualification took effect with a transition
 *   period that ended in 2023.
 *
 * The data set is intentionally compact and re-derives nothing from the
 * statute text verbatim — the goal is to give a contractor an actionable
 * pre-work checklist, not a textbook reproduction.
 */

/* ---------- Asbestos work level (石綿レベル) ---------- */

/**
 * Three operational tiers used by the industry. The Ordinance does not use
 * these labels directly, but they are the standard classification adopted
 * in MHLW guidance and JATI training materials, and they govern the
 * isolation, PPE and waste handling regime.
 *
 * - `level-1` covers sprayed asbestos and asbestos-containing sprayed
 *   coatings (吹付け石綿). Highest dispersion risk.
 * - `level-2` covers thermal insulation, fireproofing covering and
 *   acoustic insulation containing asbestos (保温材・耐火被覆材・断熱材).
 * - `level-3` covers all other forms — typically asbestos-cement boards,
 *   slates and similar formed products (成形板等).
 */
export type AsbestosWorkLevel = "level-1" | "level-2" | "level-3";

export const ASBESTOS_WORK_LEVEL_LABELS_JA: Record<AsbestosWorkLevel, string> = {
  "level-1": "レベル1（吹付け石綿等）",
  "level-2": "レベル2（保温材・耐火被覆材・断熱材）",
  "level-3": "レベル3（成形板・スレート等）",
};

export const ASBESTOS_WORK_LEVEL_LABELS_EN: Record<AsbestosWorkLevel, string> = {
  "level-1": "Level 1 — sprayed asbestos",
  "level-2": "Level 2 — insulating / fireproofing material",
  "level-3": "Level 3 — formed products (boards, slates)",
};

/* ---------- Building / project scope inputs ---------- */

/**
 * Building category that drives the construction-year cut-off for the
 * "may-contain-asbestos" presumption and the threshold for mandatory
 * reporting under the Air Pollution Control Act.
 */
export type BuildingCategory =
  | "residential-detached"
  | "residential-multi"
  | "non-residential"
  | "civil-engineering";

export const BUILDING_CATEGORY_LABELS_JA: Record<BuildingCategory, string> = {
  "residential-detached": "戸建住宅",
  "residential-multi": "共同住宅・集合住宅",
  "non-residential": "非住宅（事務所・店舗・工場・倉庫等）",
  "civil-engineering": "工作物（煙突・配管・タンク等）",
};

/**
 * Construction project category. Determines whether the work is in scope of
 * the pre-work investigation reporting regime at all.
 */
export type ProjectCategory =
  | "demolition" // 解体工事
  | "renovation" // 改修工事
  | "maintenance" // 補修・保全工事
  | "new-build"; // 新築 — generally out of scope unless re-using existing materials

export const PROJECT_CATEGORY_LABELS_JA: Record<ProjectCategory, string> = {
  demolition: "解体工事",
  renovation: "改修工事",
  maintenance: "補修・保全工事",
  "new-build": "新築工事",
};

/* ---------- Reporting / investigation requirement outcomes ---------- */

/**
 * Whether a project triggers the obligation to file a pre-work
 * investigation report (事前調査結果の労基署・自治体報告) under Anseiho
 * §88 / 石綿則 §3 and 大気汚染防止法 §18-15.
 */
export type ReportingRequirement =
  | "required-anseiho-and-airpollution" // both 労基署 and 自治体報告
  | "required-anseiho-only" // 労基署のみ
  | "required-airpollution-only" // 自治体のみ
  | "investigation-only" // 事前調査義務はあるが報告義務なし
  | "out-of-scope"; // 事前調査・報告いずれも該当しない

export const REPORTING_REQUIREMENT_LABELS_JA: Record<ReportingRequirement, string> = {
  "required-anseiho-and-airpollution":
    "事前調査結果報告：労基署＋自治体 両方に必要",
  "required-anseiho-only": "事前調査結果報告：労基署のみ必要",
  "required-airpollution-only": "事前調査結果報告：自治体（大防法）のみ必要",
  "investigation-only": "事前調査は必要・報告義務は対象外",
  "out-of-scope": "事前調査・報告義務いずれも対象外",
};

/* ---------- Project scope (engine input) ---------- */

/**
 * Project-scope input for `determineInvestigationRequirement` /
 * `determineReportingObligation`. Fields are kept minimal — these are the
 * data points contractors typically know at the planning stage.
 */
export interface ProjectScope {
  /** Building / works category. */
  buildingCategory: BuildingCategory;
  /** Project category. */
  projectCategory: ProjectCategory;
  /**
   * Year construction work started, four-digit Western calendar. Used for
   * the 2006-09-01 (H18.9) ban cut-off and the 1975 sprayed-asbestos ban.
   */
  constructionStartYear: number;
  /**
   * Total contract amount in JPY (including consumption tax). Used for the
   * Anseiho §88 §100万円 threshold. Unknown / unestimated may be left
   * undefined; engine treats undefined as below threshold.
   */
  contractValueJpy?: number;
  /**
   * Floor area of the part to be demolished or refurbished, in m². Used for
   * the 大防法 §80m² demolition threshold.
   */
  workAreaSqm?: number;
  /**
   * True when the contractor knows asbestos-containing materials are
   * present (e.g. from a prior investigation). Skips the "presumed unknown"
   * branch.
   */
  asbestosKnownPresent?: boolean;
}

/* ---------- Investigation requirement outcome ---------- */

/**
 * Result returned by `determineInvestigationRequirement`. The conclusion is
 * always Yes for demolition / renovation of any building; the field is kept
 * boolean for downstream UI clarity.
 */
export interface InvestigationOutcome {
  /** Whether 事前調査 is required at all. */
  investigationRequired: boolean;
  /**
   * Whether a 建築物石綿含有建材調査者 (qualified investigator) is required.
   * True for buildings; false for civil-engineering 工作物 — those use the
   * 一般建築物石綿含有建材調査者 or analyst as appropriate.
   */
  qualifiedInvestigatorRequired: boolean;
  /**
   * Whether the construction-year presumption applies (built / installed
   * before 2006-09-01 → presumed to contain asbestos unless cleared).
   */
  presumedContaining: boolean;
  /** Plain-language explanation of the decision, ~2 short sentences. */
  rationale: string;
  /** Statute / ordinance article references for traceability. */
  lawReferences: AsbestosLawReference[];
}

/* ---------- Required form ---------- */

/**
 * A single notification / report form a contractor must produce or file.
 * The full list is generated by `generateNotificationForms`.
 */
export interface NotificationForm {
  /** Stable id for React keys / sitemap. */
  id: string;
  /** Form label in Japanese. */
  name: string;
  /** Authority where the form is filed. */
  filedWith: "labour-standards-office" | "prefecture-or-city" | "on-site-display" | "internal-record";
  /** Statute / ordinance trigger for the form. */
  trigger: string;
  /** Filing deadline (relative to work start). */
  deadline: string;
  /** Practitioner-style summary of what the form must cover. */
  contents: string;
  /** Optional notes — e.g. when an online filing channel exists. */
  note?: string;
}

/* ---------- Work plan template ---------- */

export interface WorkPlanSection {
  id: string;
  /** Section heading shown on the work-plan template. */
  heading: string;
  /** Bullet items the contractor fills in or copies. */
  items: string[];
}

export interface WorkPlanTemplate {
  level: AsbestosWorkLevel;
  /** Plain Japanese title shown on the template header. */
  title: string;
  /** One-paragraph overview of the level. */
  summary: string;
  /** Required isolation / containment measures. */
  isolation: string[];
  /** Required personal protective equipment. */
  ppe: string[];
  /** Required notifications and on-site displays. */
  notifications: string[];
  /** Detailed sections, rendered as collapsibles or print sections. */
  sections: WorkPlanSection[];
  /** Statute references for the level. */
  lawReferences: AsbestosLawReference[];
}

/* ---------- Required qualifications ---------- */

export interface AsbestosQualification {
  id: string;
  /** Japanese label. */
  name: string;
  /** Whether this is a 作業主任者 / 特別教育 / その他資格. */
  type: "chief-supervisor" | "special-education" | "investigator" | "analyst";
  /** Plain-language description of when this person is required on site. */
  requiredWhen: string;
  /** How the certificate is obtained. */
  howToObtain: string;
  /** Statute references. */
  lawReferences: AsbestosLawReference[];
}

/* ---------- Law reference ---------- */

export interface AsbestosLawReference {
  /** Short statute label, e.g. "石綿障害予防規則". */
  name: string;
  /** Article references shown as plain strings. */
  articles?: string[];
  /** Practitioner summary of the cited provision. */
  summary: string;
}

/* ---------- Aggregate indexes ---------- */

export interface AsbestosRulebook {
  /** Forms keyed by id. */
  forms: NotificationForm[];
  /** Work-plan templates keyed by level. */
  workPlans: Record<AsbestosWorkLevel, WorkPlanTemplate>;
  /** Qualifications used across the feature. */
  qualifications: AsbestosQualification[];
}

/* ---------- UI helpers ---------- */

export const ASBESTOS_BAN_YEAR_FULL = 2006; // 2006-09-01 全面禁止
export const ASBESTOS_BAN_YEAR_SPRAYED = 1975; // 1975 吹付け禁止 (含有率5%超)
export const REPORTING_ANSEIHO_CONTRACT_THRESHOLD_JPY = 1_000_000;
export const REPORTING_AIR_POLLUTION_AREA_THRESHOLD_SQM = 80;
