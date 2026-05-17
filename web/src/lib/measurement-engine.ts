/**
 * Work Environment Measurement Engine
 *
 * Implements:
 *   - Workplace target identification (安衛令第21条 各号該当判定)
 *   - Management class determination (管理区分判定: 第1〜第3)
 *   - Improvement measures by management class (区分別改善措置)
 *
 * Sources:
 *   - 作業環境測定基準（昭和51年労働省告示第46号）
 *   - JISHA「作業環境測定ガイドブック」
 *
 * IMPORTANT: This engine provides decision-support output only.
 * Final determination must be made by a certified occupational
 * hygiene consultant (労働衛生コンサルタント) or a registered
 * work environment measurement agency (作業環境測定機関).
 */

import type {
  ManagementClass,
  ManagementClassInput,
  ManagementClassResult,
  ImprovementMeasure,
  TargetFinderInput,
  IdentifiedTarget,
  MeasurementCategoryId,
} from "@/types/work-environment";
import { MEASUREMENT_CATEGORIES } from "@/data/measurement-rules";

// ---------------------------------------------------------------------------
// Target workplace identification
// ---------------------------------------------------------------------------

/**
 * Identify which of the 10 mandatory measurement categories apply to a
 * given set of industry/process/substance inputs.
 *
 * Returns an array sorted by match score descending.
 */
export function identifyTargetWorkplaces(
  input: TargetFinderInput
): IdentifiedTarget[] {
  const searchTerms = buildSearchTerms(input);

  const results: IdentifiedTarget[] = [];

  for (const category of MEASUREMENT_CATEGORIES) {
    const matchedConditions: IdentifiedTarget["matchedConditions"] = [];
    let totalScore = 0;

    for (const condition of category.triggerConditions) {
      const hits = condition.keywords.filter((kw) =>
        searchTerms.some((term) => term.includes(kw) || kw.includes(term))
      );
      if (hits.length > 0) {
        const score = hits.length / condition.keywords.length;
        totalScore += score;
        matchedConditions.push(condition);
      }
    }

    if (matchedConditions.length > 0) {
      results.push({
        category,
        matchedConditions,
        matchScore: Math.min(1, totalScore / category.triggerConditions.length),
      });
    }
  }

  return results.sort((a, b) => b.matchScore - a.matchScore);
}

function buildSearchTerms(input: TargetFinderInput): string[] {
  return [
    input.industryGroup,
    ...input.processes,
    ...input.substances,
    input.keywords,
  ]
    .flatMap((s) => s.split(/[\s,、。・]+/))
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// ---------------------------------------------------------------------------
// Management class determination
// (作業環境測定基準告示に基づく管理区分判定)
// ---------------------------------------------------------------------------

/**
 * Determine management class from A and B measurement ratios.
 *
 * Ratio = measured value / management concentration (管理濃度).
 *   ratio < 1  → below management concentration
 *   ratio >= 1 → at or above management concentration
 *
 * A-measurement classification (geometric mean & GSD):
 *   Class 1: geometric mean × exp(1.645 × ln(GSD)) < 1  (EAM < management concentration)
 *   Class 3: geometric mean >= 1                          (mean exceeds management concentration)
 *   Class 2: otherwise
 *
 * When GSD is not provided, a simplified rule based on mean ratio only is used.
 *
 * B-measurement classification:
 *   Class 1: ratio < 0.5   (≤ 1/2 of management concentration)
 *   Class 2: 0.5 ≤ ratio < 1
 *   Class 3: ratio >= 1
 *
 * Combined class = max(aClass, bClass).
 */
export function determineManagementClass(
  input: ManagementClassInput
): ManagementClassResult {
  const aClass = classifyAMeasurement(input.aMeasurementRatio, input.aGsd);
  const bClass = input.useBMeasurement && input.bMeasurementRatio !== undefined
    ? classifyBMeasurement(input.bMeasurementRatio)
    : undefined;

  const combined: ManagementClass =
    bClass !== undefined
      ? Math.max(aClass, bClass) as ManagementClass
      : aClass;

  const explanation = buildExplanation(combined, aClass, bClass, input);
  const improvementMeasures = getImprovementMeasures(combined, input.category);

  return {
    managementClass: combined,
    aClass,
    bClass,
    explanation,
    improvementMeasures,
    deadline: combined === 2 ? "3ヶ月以内" : combined === 3 ? "直ちに" : undefined,
  };
}

function classifyAMeasurement(
  meanRatio: number,
  gsd?: number
): ManagementClass {
  if (gsd !== undefined && gsd > 1) {
    // Use upper confidence limit: geometric mean × exp(1.645 × ln(GSD))
    const ucl = meanRatio * Math.exp(1.645 * Math.log(gsd));
    if (ucl < 1) return 1;
    if (meanRatio >= 1) return 3;
    return 2;
  }
  // Simplified: use mean ratio only
  if (meanRatio < 0.1) return 1;   // <10% of management concentration
  if (meanRatio < 1) return 2;     // 10%–100%
  return 3;                         // ≥100% (exceeds management concentration)
}

function classifyBMeasurement(ratio: number): ManagementClass {
  if (ratio < 0.5) return 1;
  if (ratio < 1) return 2;
  return 3;
}

function buildExplanation(
  combined: ManagementClass,
  aClass: ManagementClass,
  bClass: ManagementClass | undefined,
  input: ManagementClassInput
): string {
  const classBasisText =
    bClass !== undefined
      ? `A測定: 第${aClass}管理区分、B測定: 第${bClass}管理区分 → 総合判定: 第${combined}管理区分`
      : `A測定: 第${aClass}管理区分 → 総合判定: 第${combined}管理区分`;

  const status: Record<ManagementClass, string> = {
    1: "作業環境は良好です。引き続き現状を維持してください。",
    2: "作業環境の改善が必要です。3ヶ月以内に改善措置を実施し、再測定を行ってください。",
    3: "作業環境が著しく不良です。直ちに改善措置を講じ、労働者には呼吸用保護具を使用させてください（安衛則第577条の2等）。",
  };

  const ratioText = `管理濃度比（A測定平均）: ${(input.aMeasurementRatio * 100).toFixed(1)}%` +
    (input.useBMeasurement && input.bMeasurementRatio !== undefined
      ? `、管理濃度比（B測定）: ${(input.bMeasurementRatio * 100).toFixed(1)}%`
      : "");

  return `${classBasisText}\n${ratioText}\n${status[combined]}`;
}

// ---------------------------------------------------------------------------
// Improvement measures by management class and category
// ---------------------------------------------------------------------------

export function getImprovementMeasures(
  managementClass: ManagementClass,
  category: MeasurementCategoryId
): ImprovementMeasure[] {
  const common = COMMON_MEASURES[managementClass];
  const categorySpecific = CATEGORY_MEASURES[category]?.[managementClass] ?? [];
  return [...common, ...categorySpecific];
}

const COMMON_MEASURES: Record<ManagementClass, ImprovementMeasure[]> = {
  1: [
    {
      priority: "maintain",
      title: "現状維持・定期確認",
      detail: "作業環境が良好な状態を維持してください。次回定期測定まで現状の管理を継続してください。",
    },
  ],
  2: [
    {
      priority: "within-3months",
      title: "改善措置の実施（3ヶ月以内）",
      detail:
        "安衛法第65条の2に基づき、施設・設備・作業工程・作業方法の点検を行い、改善計画を策定してください。",
    },
    {
      priority: "within-3months",
      title: "労働者への健康障害防止措置",
      detail:
        "改善完了まで有効な呼吸用保護具（防じんマスク、防毒マスク等）を使用させ、有害物質へのばく露を最小化してください。",
    },
    {
      priority: "within-3months",
      title: "再測定の実施",
      detail:
        "改善措置実施後、速やかに再測定を行い、第1管理区分への改善を確認してください。",
    },
  ],
  3: [
    {
      priority: "immediate",
      title: "直ちに作業方法の改善（安衛法第65条の2）",
      detail:
        "発散源の密閉化・局所排気装置の設置・改善、または当該物質を使用しない工程への変更など根本的な改善措置を直ちに講じてください。",
    },
    {
      priority: "immediate",
      title: "呼吸用保護具の使用義務（安衛則第577条の2）",
      detail:
        "改善完了まで、使用する物質に対応した有効な呼吸用保護具（電動ファン付き呼吸用保護具等）を全作業者に使用させてください。",
    },
    {
      priority: "immediate",
      title: "労働基準監督署への報告（必要に応じ）",
      detail:
        "特定化学物質等で第3管理区分が継続する場合は、所轄の労働基準監督署に相談・報告が必要になる場合があります。",
    },
    {
      priority: "immediate",
      title: "再測定の実施",
      detail:
        "改善措置実施後、速やかに再測定を行い、管理区分の改善を確認してください。",
    },
  ],
};

const CATEGORY_MEASURES: Partial<
  Record<MeasurementCategoryId, Partial<Record<ManagementClass, ImprovementMeasure[]>>>
> = {
  dust: {
    2: [
      {
        priority: "within-3months",
        title: "局所排気装置・プッシュプル型換気装置の点検・強化",
        detail:
          "フード開口面速度が基準（0.7m/s以上、プッシュプル型は0.2m/s）を満たしているか確認し、不足の場合は改修してください。",
      },
    ],
    3: [
      {
        priority: "immediate",
        title: "防じんマスクの選定・フィットテスト実施",
        detail:
          "DS2以上の防じんマスクを粉じん種別に応じて選定し、作業者ごとにフィットテストを実施してください。",
      },
    ],
  },
  "specific-chem": {
    2: [
      {
        priority: "within-3months",
        title: "特化物健康診断の実施確認",
        detail:
          "当該物質に対応する特定化学物質健康診断（特化則第39条）が適切に実施されているか確認してください。",
      },
    ],
    3: [
      {
        priority: "immediate",
        title: "特別管理物質の場合：測定記録・健診結果の30年保存",
        detail:
          "特別管理物質（第1類・がん原性第2類）は測定記録を30年間保存する義務があります。記録管理体制を確認してください。",
      },
    ],
  },
  "organic-solv": {
    2: [
      {
        priority: "within-3months",
        title: "局所排気装置の排風量確認",
        detail:
          "有機則第16条の局所排気装置が所定の制御風速を満たしているか測定し、不足の場合はダクト・ファンを点検してください。",
      },
    ],
    3: [
      {
        priority: "immediate",
        title: "有機ガス用防毒マスクの配備",
        detail:
          "当該有機溶剤の種類に適合した吸収缶付き防毒マスクまたは電動ファン付き呼吸用保護具を配備してください。",
      },
    ],
  },
  noise: {
    2: [
      {
        priority: "within-3months",
        title: "耳栓・イヤーマフの適切な選定・使用",
        detail:
          "SNR値が騒音レベルに対応した防音保護具を選定し、作業者が正しく装着できるよう指導してください。",
      },
    ],
    3: [
      {
        priority: "immediate",
        title: "騒音発生源の防音対策（遮音・防振）",
        detail:
          "機械への防振マウント設置、防音カバーの設置、騒音発生源と作業者の距離確保等の工学的対策を検討してください。",
      },
    ],
  },
  lead: {
    2: [
      {
        priority: "within-3months",
        title: "鉛健康診断の実施確認（鉛則第53条）",
        detail:
          "6ヶ月以内ごとの鉛健康診断（血中鉛・尿中δ-アミノレブリン酸等）が適切に実施されているか確認してください。",
      },
    ],
    3: [
      {
        priority: "immediate",
        title: "鉛取扱い作業の緊急対策",
        detail:
          "鉛スクラップ等の高濃度発散源を速やかに密閉化または隔離し、作業者の血中鉛濃度を確認してください（40μg/dLを超える場合は就業禁止等）。",
      },
    ],
  },
};

// ---------------------------------------------------------------------------
// Utility: industry group list for UI dropdowns
// ---------------------------------------------------------------------------

export const INDUSTRY_GROUPS = [
  "製造業（金属・機械）",
  "製造業（化学・石油）",
  "製造業（食品・飲料）",
  "製造業（紙・印刷）",
  "製造業（繊維・縫製）",
  "製造業（ゴム・プラスチック）",
  "建設業（土木）",
  "建設業（建築）",
  "建設業（設備工事）",
  "鉱業（金属鉱山）",
  "鉱業（石炭・石油）",
  "運輸・倉庫業",
  "クリーニング業",
  "医療・歯科",
  "事務所・ビル管理",
  "その他サービス業",
  "その他",
] as const;

export const COMMON_PROCESSES = [
  "溶接・溶断",
  "研磨・研削",
  "切削・機械加工",
  "プレス・鍛造",
  "塗装・コーティング",
  "洗浄・脱脂（有機溶剤）",
  "接着・シーリング",
  "粉体混合・充填",
  "鋳造・型砂処理",
  "印刷・製版",
  "熱処理・焼成",
  "冷凍・冷蔵保管",
  "タンク・ピット内作業",
  "トンネル掘削",
  "はんだ付け",
  "電気設備（X線・放射線）",
  "事務・デスクワーク（セントラル空調）",
] as const;
