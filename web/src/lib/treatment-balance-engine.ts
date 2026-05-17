/**
 * Treatment-work balance engine.
 *
 * Builds a structured workforce-support plan (not a medical care plan) from a
 * combination of illness condition, work type, severity and desired work
 * arrangement. Also renders a printable attending-physician opinion-form
 * template and a phased return-to-work step sequence.
 *
 * Outputs are operational HR/safety guidance derived from MHLW's "Guidelines
 * on Supporting Both Treatment and Work in the Workplace" (revised Reiwa 5);
 * any clinical judgement remains with the attending physician.
 */

import type {
  IllnessCondition,
  SeverityLevel,
  WorkType,
} from "@/types/illness-consideration";
import { getConditionById } from "@/data/illness-considerations";

export type DesiredArrangement =
  | "fulltime"
  | "shorttime"
  | "flex"
  | "telework"
  | "phased-return";

export interface SupportPlanInput {
  conditionId: string;
  workType: WorkType;
  severity: SeverityLevel;
  arrangement: DesiredArrangement;
  /** Employee-stated wishes / context (free text from the form). */
  employeeNote?: string;
}

export interface SupportPlanSection {
  heading: string;
  bullets: string[];
}

export interface ReturnStep {
  stepNo: number;
  title: string;
  durationLabel: string;
  description: string;
  workloadPercent: number;
}

export interface DoctorOpinionTemplate {
  recipient: string;
  patientFields: string[];
  fitnessQuestions: string[];
  workConstraints: string[];
  observationItems: string[];
  reviewSchedule: string;
}

export interface SupportPlan {
  conditionName: string;
  categoryLabel: string;
  sections: SupportPlanSection[];
  returnSteps: ReturnStep[];
  doctorOpinionTemplate: DoctorOpinionTemplate;
  highlightedLaws: string[];
  followUpCadence: string;
  disclaimer: string;
}

const WORK_TYPE_LABEL: Record<WorkType, string> = {
  desk: "デスクワーク・事務",
  field: "建設・屋外現場",
  driving: "運転業務",
  manufacturing: "製造・組立作業",
  healthcare: "医療・福祉現場",
  service: "接客・サービス業",
};

const ARRANGEMENT_LABEL: Record<DesiredArrangement, string> = {
  fulltime: "通常勤務",
  shorttime: "短時間勤務",
  flex: "フレックス勤務",
  telework: "テレワーク併用",
  "phased-return": "段階的復職",
};

const SEVERITY_LABEL: Record<SeverityLevel, string> = {
  mild: "軽度（通常業務がほぼ可能）",
  moderate: "中等度（一定の配慮が必要）",
  severe: "重度（大幅な配置・時間調整が必要）",
};

const CATEGORY_LABEL: Record<string, string> = {
  cancer: "がん（悪性新生物）",
  stroke: "脳血管疾患（脳卒中）",
  "heart-disease": "心疾患（循環器疾患）",
  diabetes: "糖尿病",
  "mental-health": "精神疾患・メンタルヘルス",
  "intractable-disease": "難病・指定難病",
};

function workTypeOverlay(workType: WorkType, severity: SeverityLevel): string[] {
  const tips: Record<WorkType, string[]> = {
    desk: [
      "ディスプレイ作業の連続時間を1時間以内に区切る",
      "音声入力・拡大表示など、補助具導入の余地を検討",
    ],
    field: [
      "屋外気温・粉塵・騒音の暴露時間を縮小",
      "高所作業・玉掛け等の有資格作業の可否を主治医意見書で再確認",
    ],
    driving: [
      "意識消失リスクのある疾患（脳卒中・心疾患・糖尿病）は運転業務の可否を慎重に判定",
      "長距離・夜間運転を一時的に他者へ振替",
    ],
    manufacturing: [
      "立ち作業時間と重量物取扱量を計測し、上限を設定",
      "ライン作業の場合は休憩ローテーションを優先設計",
    ],
    healthcare: [
      "夜勤・当直シフトを除外できる体制を確保",
      "感染リスクの高い業務（隔離室対応等）の見直し",
    ],
    service: [
      "立ち仕事・接客時間を短時間に区切る",
      "カスタマーハラスメントへの対応マニュアルを共有",
    ],
  };
  const base = tips[workType];
  if (severity === "severe") {
    return [...base, "重度の場合は配置転換・障害者雇用枠への切替も検討対象"];
  }
  return base;
}

function arrangementOverlay(arrangement: DesiredArrangement): string[] {
  switch (arrangement) {
    case "shorttime":
      return [
        "短時間勤務（4〜6時間）を就業規則で明文化",
        "賃金・社会保険の扱いを事前に本人へ説明",
      ];
    case "flex":
      return [
        "コアタイムを最小化し、通院・通勤負荷を緩和",
        "勤務時間の記録方法を明確化",
      ];
    case "telework":
      return [
        "在宅勤務時の労働時間管理・連絡頻度のルール化",
        "在宅環境（机・椅子・通信）の整備支援",
      ];
    case "phased-return":
      return [
        "段階的復職プログラム（試し出勤→短時間→フルタイム）を設計",
        "各段階の業務量と評価指標を本人と合意",
      ];
    case "fulltime":
    default:
      return [
        "通常勤務であっても通院日・体調変動への配慮は継続",
      ];
  }
}

function severityFollowUp(severity: SeverityLevel): string {
  switch (severity) {
    case "severe":
      return "毎月、本人・人事・産業医の三者で見直し。主治医意見書は3ヶ月ごとに更新。";
    case "moderate":
      return "3ヶ月ごとに本人・人事・産業医で見直し。主治医意見書は6ヶ月ごとに更新。";
    case "mild":
    default:
      return "6ヶ月ごとに本人・人事・産業医で見直し。主治医意見書は年1回更新を目安。";
  }
}

function buildSections(
  condition: IllnessCondition,
  workType: WorkType,
  severity: SeverityLevel,
  arrangement: DesiredArrangement,
): SupportPlanSection[] {
  return [
    {
      heading: "作業内容に関する配慮",
      bullets: [
        ...condition.workConsiderations,
        ...workTypeOverlay(workType, severity),
      ],
    },
    {
      heading: "勤務時間・休暇に関する配慮",
      bullets: [
        ...condition.timeConsiderations,
        ...arrangementOverlay(arrangement),
      ],
    },
    {
      heading: "作業環境に関する配慮",
      bullets: condition.environmentConsiderations,
    },
    {
      heading: "本人・主治医・産業医とのコミュニケーション",
      bullets: condition.communicationPoints,
    },
  ];
}

function buildReturnSteps(severity: SeverityLevel): ReturnStep[] {
  const baseDescription = (load: number, focus: string) =>
    `業務負荷の目安：通常の${load}%。${focus}`;

  if (severity === "severe") {
    return [
      {
        stepNo: 1,
        title: "試し出勤（通勤訓練）",
        durationLabel: "2〜4週間",
        description: baseDescription(20, "通勤と職場滞在に慣れる。担当業務は付与しない。"),
        workloadPercent: 20,
      },
      {
        stepNo: 2,
        title: "短時間勤務（軽作業）",
        durationLabel: "4〜8週間",
        description: baseDescription(40, "1日4時間・軽作業中心。判断業務・対外折衝は除外。"),
        workloadPercent: 40,
      },
      {
        stepNo: 3,
        title: "短時間勤務（通常業務の一部）",
        durationLabel: "4〜8週間",
        description: baseDescription(60, "1日6時間。担当業務の一部を再開。残業禁止。"),
        workloadPercent: 60,
      },
      {
        stepNo: 4,
        title: "通常勤務（業務量段階引上げ）",
        durationLabel: "8〜12週間",
        description: baseDescription(80, "1日8時間。残業は段階的に解除。"),
        workloadPercent: 80,
      },
      {
        stepNo: 5,
        title: "通常勤務（完全復帰）",
        durationLabel: "以降継続",
        description: baseDescription(100, "通常業務へ完全復帰。定期的な産業医面談を継続。"),
        workloadPercent: 100,
      },
    ];
  }

  if (severity === "moderate") {
    return [
      {
        stepNo: 1,
        title: "短時間勤務（軽作業）",
        durationLabel: "2〜4週間",
        description: baseDescription(50, "1日4〜6時間。軽作業中心、判断業務は限定。"),
        workloadPercent: 50,
      },
      {
        stepNo: 2,
        title: "短時間勤務（通常業務の一部）",
        durationLabel: "4〜8週間",
        description: baseDescription(70, "1日6時間。担当業務の一部を再開。残業禁止。"),
        workloadPercent: 70,
      },
      {
        stepNo: 3,
        title: "通常勤務（残業段階解除）",
        durationLabel: "4〜8週間",
        description: baseDescription(90, "1日8時間。残業は月20時間以内を目安に段階解除。"),
        workloadPercent: 90,
      },
      {
        stepNo: 4,
        title: "通常勤務（完全復帰）",
        durationLabel: "以降継続",
        description: baseDescription(100, "通常業務へ完全復帰。"),
        workloadPercent: 100,
      },
    ];
  }

  return [
    {
      stepNo: 1,
      title: "短時間勤務（試行）",
      durationLabel: "2週間",
      description: baseDescription(70, "1日6時間。通院日の柔軟取得を確保。"),
      workloadPercent: 70,
    },
    {
      stepNo: 2,
      title: "通常勤務（残業制限あり）",
      durationLabel: "4週間",
      description: baseDescription(90, "1日8時間。残業は当面制限。"),
      workloadPercent: 90,
    },
    {
      stepNo: 3,
      title: "通常勤務（完全復帰）",
      durationLabel: "以降継続",
      description: baseDescription(100, "通常業務へ完全復帰。"),
      workloadPercent: 100,
    },
  ];
}

function buildDoctorOpinionTemplate(
  condition: IllnessCondition,
): DoctorOpinionTemplate {
  return {
    recipient: "○○株式会社 産業医・人事担当 御中",
    patientFields: [
      "氏名・生年月日・所属",
      "現在の病名（必要に応じて）",
      "発症・受診開始日",
      "現在の治療内容（外来通院・入院・薬物療法 等）",
    ],
    fitnessQuestions: [
      "現時点での就業可否（就業可・条件付き就業可・就業不可）",
      "条件付き就業可の場合の主な制限事項",
      "予測される治療経過と勤務継続可能性",
    ],
    workConstraints: [
      "1日あたりの就業可能時間の上限",
      "残業・夜勤・深夜業の可否",
      "出張・運転業務の可否",
      "重量物取扱・高所作業の可否",
      "暑熱・寒冷・粉塵・化学物質暴露への注意点",
      `特に避けたい業務内容（${condition.name}の特性をふまえて）`,
    ],
    observationItems: [
      "症状再発・増悪の兆候として職場が察知すべき項目",
      "緊急時の対応（救急要請・受診先）",
      "服薬・治療に関する職場での配慮事項",
    ],
    reviewSchedule:
      "次回の意見書更新は概ね○ヶ月後を予定。状況が変化した場合は随時連絡。",
  };
}

export function generateSupportPlan(input: SupportPlanInput): SupportPlan {
  const condition = getConditionById(input.conditionId);
  if (!condition) {
    throw new Error(`Unknown illness condition: ${input.conditionId}`);
  }

  const sections = buildSections(
    condition,
    input.workType,
    input.severity,
    input.arrangement,
  );
  const returnSteps = buildReturnSteps(input.severity);
  const doctorOpinionTemplate = buildDoctorOpinionTemplate(condition);

  const highlightedLaws = [
    "労働安全衛生法第69条（健康保持増進）",
    "労働安全衛生法第70条の2（両立支援）",
    "厚労省「事業場における治療と仕事の両立支援のためのガイドライン」（令和5年改訂）",
  ];

  return {
    conditionName: condition.name,
    categoryLabel: CATEGORY_LABEL[condition.category] ?? condition.category,
    sections,
    returnSteps,
    doctorOpinionTemplate,
    highlightedLaws,
    followUpCadence: severityFollowUp(input.severity),
    disclaimer:
      "本プランは労務管理上の参考資料です。診断・治療方針・就業可否の最終判断は主治医および産業医に委ねてください。",
  };
}

export function describeWorkType(workType: WorkType): string {
  return WORK_TYPE_LABEL[workType];
}

export function describeArrangement(arr: DesiredArrangement): string {
  return ARRANGEMENT_LABEL[arr];
}

export function describeSeverity(level: SeverityLevel): string {
  return SEVERITY_LABEL[level];
}

export const WORK_TYPE_OPTIONS: { value: WorkType; label: string }[] = (
  Object.keys(WORK_TYPE_LABEL) as WorkType[]
).map((v) => ({ value: v, label: WORK_TYPE_LABEL[v] }));

export const ARRANGEMENT_OPTIONS: {
  value: DesiredArrangement;
  label: string;
}[] = (Object.keys(ARRANGEMENT_LABEL) as DesiredArrangement[]).map((v) => ({
  value: v,
  label: ARRANGEMENT_LABEL[v],
}));

export const SEVERITY_OPTIONS: { value: SeverityLevel; label: string }[] = (
  Object.keys(SEVERITY_LABEL) as SeverityLevel[]
).map((v) => ({ value: v, label: SEVERITY_LABEL[v] }));
