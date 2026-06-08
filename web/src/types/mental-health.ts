/**
 * Mental-health management domain types.
 *
 * Models three orthogonal concerns of an employer's mental-health program:
 *
 * 1. Stress-check program — the annual stress-check survey (年1回ストレスチェック)
 *    required by Industrial Safety and Health Act art. 66-10 for workplaces with
 *    50 or more regular employees, and the corresponding effort-duty (努力義務)
 *    track for sub-50 workplaces.
 *
 * 2. High-stress-worker interview guidance — the post-survey workflow that runs
 *    when a worker flagged as high-stress requests a physician interview, and
 *    the work-restriction measures the employer may impose afterwards.
 *
 * 3. Harassment linkage — power/sex/maternity/customer harassment programs that
 *    sit alongside the stress-check program and that auditors expect to see
 *    cross-referenced from the same internal procedure.
 *
 * All outputs are operational HR / safety guidance. Clinical judgement is
 * always the attending or industrial physician's responsibility.
 */

/* ---------- Workplace classification ---------- */

/**
 * Stress-check obligation tier.
 * - `mandatory` — 50+ regular employees (常時使用する労働者). Annual stress
 *   check is a legal obligation, with reporting to the labour standards
 *   inspection office.
 * - `effort-duty` — under 50 employees. The same article applies as an effort
 *   duty (努力義務); the local Sanpo Center (地域産業保健センター) offers free
 *   support and physician interviews.
 */
export type ObligationTier = "mandatory" | "effort-duty";

export type WorkplaceSize = "under-10" | "10-49" | "50-99" | "100-299" | "300-plus";

export function obligationTierFromHeadcount(headcount: number): ObligationTier {
  return headcount >= 50 ? "mandatory" : "effort-duty";
}

export const WORKPLACE_SIZE_LABELS: Record<WorkplaceSize, string> = {
  "under-10": "10人未満",
  "10-49": "10〜49人",
  "50-99": "50〜99人",
  "100-299": "100〜299人",
  "300-plus": "300人以上",
};

export function sizeBucketFromHeadcount(headcount: number): WorkplaceSize {
  if (headcount < 10) return "under-10";
  if (headcount < 50) return "10-49";
  if (headcount < 100) return "50-99";
  if (headcount < 300) return "100-299";
  return "300-plus";
}

/* ---------- Stress-check program ---------- */

/**
 * One requirement of the annual stress-check program. The 11 mandatory items
 * map to the MHLW implementation manual (ストレスチェック制度実施マニュアル)
 * and the rules listed in 労働安全衛生規則 第52条の9〜21.
 */
export interface StressCheckRequirement {
  id: string;
  /** Short label in Japanese for the UI. */
  label: string;
  /** One-paragraph operational description. */
  description: string;
  /** Article numbers in 労働安全衛生規則 (e.g. "52条の10"). */
  ruleArticles: string[];
  /** Which obligation tiers this requirement applies to. */
  appliesTo: ObligationTier[];
  /** Whether this is a baseline (must-have) item vs. a recommended one. */
  baseline: boolean;
}

/**
 * One step in the chronological stress-check implementation procedure
 * (年間の実施手順). Whereas {@link StressCheckRequirement} lists *what must be
 * true*, this models *what to do, in what order, and by when* across one annual
 * cycle — the roadmap a first-time mandatory workplace needs to avoid omissions.
 */
export interface StressCheckProcedureStep {
  /** Phase grouping for the annual cycle. */
  phase: "準備期" | "実施期" | "事後対応期" | "報告・保存期";
  /** Imperative step title. */
  title: string;
  /** One- to two-sentence operational detail. */
  detail: string;
  /** When this step happens, relative to the survey (plain Japanese). */
  timing: string;
  /** Baseline requirement ids this step fulfils, for cross-reference. */
  relatedRequirementIds: string[];
  /** True if the step applies only to mandatory (50人以上) workplaces. */
  mandatoryOnly?: boolean;
}

/**
 * A planning step in the small-business simplified track. Sub-50 workplaces
 * have less internal capacity, so the sequence emphasises Sanpo Center support
 * and shared external implementers over building in-house teams.
 */
export interface SmallBusinessStep {
  no: number;
  title: string;
  body: string;
  /** Required external resource — e.g. Sanpo Center, contract physician. */
  externalResource?: string;
  /** Approximate time to complete this step from kick-off. */
  estimatedDays: number;
}

/* ---------- High-stress interview workflow ---------- */

/**
 * Job class used to scope interview-guidance recommendations. Mirrors the
 * occupational groupings the MHLW high-stress interview manual references.
 */
export type JobClass =
  | "office"
  | "field"
  | "driving"
  | "shift-work"
  | "healthcare"
  | "service";

export const JOB_CLASS_LABELS: Record<JobClass, string> = {
  office: "事務・デスクワーク",
  field: "建設・屋外現場",
  driving: "運転・運行業務",
  "shift-work": "交替制・夜勤",
  healthcare: "医療・介護",
  service: "接客・サービス",
};

/** Stress-check categorical result. */
export type StressCheckResult = "high-stress" | "borderline" | "low-stress";

/** Whether the worker has filed a request for physician interview. */
export type InterviewRequest = "filed" | "pending" | "declined";

/** Recommended employer action after the interview. */
export type WorkAdjustmentLevel =
  | "no-restriction"
  | "overtime-cap"
  | "shift-reassignment"
  | "leave-of-absence";

export interface InterviewFlowStep {
  no: number;
  title: string;
  body: string;
  /** Maximum allowed elapsed days from the trigger event. */
  deadlineDays: number | null;
  /** Responsible role inside the workplace. */
  owner: "employer" | "implementer" | "industrial-physician" | "worker";
}

/* ---------- Harassment linkage ---------- */

export type HarassmentType = "power" | "sexual" | "maternity" | "customer";

export const HARASSMENT_TYPE_LABELS: Record<HarassmentType, string> = {
  power: "パワーハラスメント",
  sexual: "セクシュアルハラスメント",
  maternity: "妊娠・出産・育休等ハラスメント",
  customer: "カスタマーハラスメント",
};

export interface HarassmentLinkage {
  type: HarassmentType;
  /** What the employer must do, beyond the stress-check program itself. */
  employerDuties: string[];
  /** Legal basis — short citation (act + article). */
  legalBasis: string[];
  /** How this links into the stress-check / interview workflow. */
  linkToStressCheck: string;
}
