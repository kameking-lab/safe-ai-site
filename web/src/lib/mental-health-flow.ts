/**
 * Mental-health management flow engine.
 *
 * Given a workplace headcount, a worker's stress-check categorical result,
 * their interview-request state, and their job class, the engine returns:
 *
 * - The next action the employer must take (with deadlines).
 * - Whether the small-business simplified track applies.
 * - Tailored work-restriction recommendations to seed the post-interview
 *   measures discussion.
 * - The applicable compliance checklist subset (mandatory vs. effort-duty).
 *
 * No clinical judgement is made; outputs are operational HR guidance derived
 * from MHLW's stress-check implementation manual and rule articles
 * 安衛則 第52条の9〜21.
 */

import {
  INTERVIEW_FLOW_STEPS,
  JOB_CLASS_OVERLAY,
  PHYSICIAN_OPINION_TEMPLATE,
  STRESS_CHECK_REQUIREMENTS,
  SMALL_BUSINESS_STEPS,
  getEffortDutyRequirements,
  getMandatoryRequirements,
} from "@/data/mental-health-rules";
import type {
  InterviewFlowStep,
  InterviewRequest,
  JobClass,
  ObligationTier,
  SmallBusinessStep,
  StressCheckRequirement,
  StressCheckResult,
  WorkAdjustmentLevel,
} from "@/types/mental-health";
import { obligationTierFromHeadcount } from "@/types/mental-health";

export interface MentalHealthFlowInput {
  /** Number of regularly employed workers at the workplace. */
  headcount: number;
  /** Worker's stress-check categorical result. */
  stressCheckResult: StressCheckResult;
  /** Whether the worker has filed a request for physician interview. */
  interviewRequest: InterviewRequest;
  /** Worker's job class — used to tailor work-restriction recommendations. */
  jobClass: JobClass;
}

export interface RequiredAction {
  /** Imperative title of the next action the employer must take. */
  title: string;
  /** One-paragraph operational description. */
  description: string;
  /** Maximum allowed elapsed days from the trigger event, or null if open. */
  deadlineDays: number | null;
  /** Recommended work-adjustment band. */
  adjustmentLevel: WorkAdjustmentLevel;
}

export interface MentalHealthFlowOutput {
  obligationTier: ObligationTier;
  /** Operational checklist applicable to this workplace size. */
  requirements: StressCheckRequirement[];
  /** Required next action given the worker's state. */
  requiredAction: RequiredAction;
  /** Job-class-tailored work restriction bullets. */
  jobClassOverlay: string[];
  /** Steps in the interview flow yet to be completed. */
  remainingFlow: InterviewFlowStep[];
  /** Small-business roll-out steps (effort-duty workplaces only). */
  smallBusinessSteps: SmallBusinessStep[] | null;
  /** Physician opinion-form template. */
  physicianOpinionTemplate: typeof PHYSICIAN_OPINION_TEMPLATE;
  disclaimer: string;
}

const DISCLAIMER =
  "本フローは労務管理上の参考資料です。診断・治療・就業可否の最終判断は医師（産業医・主治医）の専管事項であり、本サイトは個別の医学的助言を行いません。";

function pickAction(
  result: StressCheckResult,
  request: InterviewRequest,
): RequiredAction {
  if (result === "low-stress") {
    return {
      title: "通常運用：年1回のストレスチェック継続",
      description:
        "高ストレス判定ではないため、就業上の特別措置は不要。次年度のストレスチェックまで通常の安全衛生活動を継続する。",
      deadlineDays: null,
      adjustmentLevel: "no-restriction",
    };
  }
  if (result === "borderline") {
    return {
      title: "セルフケア促進と職場環境改善の検討",
      description:
        "高ストレスには該当しないものの、本人の自己ケア促進と部署単位の集団分析を活用した職場環境改善を検討する。希望時の自主的相談窓口の周知を継続。",
      deadlineDays: 30,
      adjustmentLevel: "no-restriction",
    };
  }
  if (request === "declined") {
    return {
      title: "面接申出なし — 自主的相談窓口の継続案内",
      description:
        "本人が面接指導を希望しない場合は強制できない。社内相談窓口・EAP・さんぽセンター等の自主的相談ルートを再案内し、状況変化時には申出が可能である旨を伝える。",
      deadlineDays: 30,
      adjustmentLevel: "no-restriction",
    };
  }
  if (request === "pending") {
    return {
      title: "面接指導申出窓口の周知強化",
      description:
        "高ストレス判定通知から申出までの目安期間は概ね1ヶ月以内。申出方法・申出後の流れ・プライバシー保護方針を改めて本人へ案内する。",
      deadlineDays: 30,
      adjustmentLevel: "no-restriction",
    };
  }
  // filed
  return {
    title: "医師面接指導の調整・実施",
    description:
      "本人同意のうえ結果情報を医師に提供し、申出からおおむね1ヶ月以内に面接指導を実施。面接後は医師意見書をもとに就業上の措置を本人と協議のうえ決定する。",
    deadlineDays: 30,
    adjustmentLevel: "shift-reassignment",
  };
}

function remainingFlowSteps(
  result: StressCheckResult,
  request: InterviewRequest,
): InterviewFlowStep[] {
  if (result !== "high-stress") return [];
  if (request === "declined") {
    return INTERVIEW_FLOW_STEPS.slice(0, 1);
  }
  if (request === "pending") {
    return INTERVIEW_FLOW_STEPS.slice(1);
  }
  // filed
  return INTERVIEW_FLOW_STEPS.slice(2);
}

export function determineRequiredAction(
  input: MentalHealthFlowInput,
): MentalHealthFlowOutput {
  const obligationTier = obligationTierFromHeadcount(input.headcount);
  const requirements =
    obligationTier === "mandatory"
      ? getMandatoryRequirements()
      : getEffortDutyRequirements();

  const requiredAction = pickAction(input.stressCheckResult, input.interviewRequest);
  const remainingFlow = remainingFlowSteps(input.stressCheckResult, input.interviewRequest);

  return {
    obligationTier,
    requirements,
    requiredAction,
    jobClassOverlay: JOB_CLASS_OVERLAY[input.jobClass],
    remainingFlow,
    smallBusinessSteps: obligationTier === "effort-duty" ? SMALL_BUSINESS_STEPS : null,
    physicianOpinionTemplate: PHYSICIAN_OPINION_TEMPLATE,
    disclaimer: DISCLAIMER,
  };
}

/* ---------- Self-assessment of readiness ---------- */

export interface ReadinessQuestion {
  id: string;
  prompt: string;
  helperText: string;
}

export const READINESS_QUESTIONS: ReadinessQuestion[] = [
  {
    id: "policy",
    prompt: "ストレスチェック実施方針を文書化し、衛生委員会で審議していますか？",
    helperText: "実施時期・対象者・実施者・結果取扱方法を含む方針書が必要。",
  },
  {
    id: "implementer",
    prompt: "医師・保健師等の有資格者を実施者として指名できますか？",
    helperText: "嘱託産業医・さんぽセンター登録医師でも可。",
  },
  {
    id: "questionnaire",
    prompt: "厚労省推奨3領域（仕事負担・ストレス反応・周囲サポート）を含む調査票を準備できますか？",
    helperText: "57項目簡易調査票または23項目短縮版が推奨。",
  },
  {
    id: "interview-channel",
    prompt: "高ストレス者からの医師面接申出を受け付ける窓口を社内に設置していますか？",
    helperText: "人事または健康管理部門のいずれかでよい。",
  },
  {
    id: "privacy",
    prompt: "ストレスチェック結果へのアクセス権限を実施事務従事者に限定する管理体制がありますか？",
    helperText: "本人同意なしに事業者が個人結果を閲覧することは不可。",
  },
  {
    id: "post-measures",
    prompt: "面接指導後の就業上の措置（労働時間短縮・配置転換等）を就業規則で運用できますか？",
    helperText: "短時間勤務・テレワーク制度・配置転換規程が整備されていれば十分。",
  },
  {
    id: "retention",
    prompt: "結果・面接記録・事後措置記録を5年間保存する体制がありますか？",
    helperText: "実施事務従事者以外がアクセスできない管理体制を含む。",
  },
];

export interface ReadinessInput {
  headcount: number;
  answers: Record<string, boolean>;
}

export interface ReadinessAssessment {
  obligationTier: ObligationTier;
  totalQuestions: number;
  yesCount: number;
  readinessRatio: number;
  /** Open issues that should be resolved before launching. */
  gaps: ReadinessQuestion[];
  /** Plain-language overall verdict for the user. */
  verdict: "ready" | "partial" | "early";
}

export function assessReadiness(input: ReadinessInput): ReadinessAssessment {
  const tier = obligationTierFromHeadcount(input.headcount);
  const total = READINESS_QUESTIONS.length;
  let yes = 0;
  const gaps: ReadinessQuestion[] = [];
  for (const q of READINESS_QUESTIONS) {
    if (input.answers[q.id] === true) {
      yes++;
    } else {
      gaps.push(q);
    }
  }
  const ratio = yes / total;
  const verdict: ReadinessAssessment["verdict"] =
    ratio >= 0.85 ? "ready" : ratio >= 0.5 ? "partial" : "early";
  return {
    obligationTier: tier,
    totalQuestions: total,
    yesCount: yes,
    readinessRatio: ratio,
    gaps,
    verdict,
  };
}

export { STRESS_CHECK_REQUIREMENTS, INTERVIEW_FLOW_STEPS, SMALL_BUSINESS_STEPS };
