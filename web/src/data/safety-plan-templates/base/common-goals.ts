/**
 * Baseline goals common across industries.
 *
 * Numerical targets reflect realistic ranges seen in published 安全衛生計画書
 * from associations and SMEs. Industries adjust these in their own files.
 */

import type { SafetyGoal, ScaleId } from "@/types/safety-plan";

export const commonBaseGoals: SafetyGoal[] = [
  {
    category: "accident-reduction",
    title: "労働災害ゼロの達成",
    description:
      "休業4日以上の労働災害をゼロにする。発生した場合は1週間以内に原因分析と再発防止策を策定し委員会で共有する。",
    target: "休業4日以上 0件 / 度数率 1.00 未満",
    kpi: "労災発生件数 / 度数率（100万延労働時間あたり）",
  },
  {
    category: "education-coverage",
    title: "安全衛生教育の100%受講",
    description:
      "雇入れ時教育・作業内容変更時教育・職長等教育・特別教育の受講対象者全員に確実に教育を実施する。",
    target: "対象者受講率 100%",
    kpi: "受講記録（教育台帳）の対象者数と受講者数",
  },
  {
    category: "near-miss-reporting",
    title: "ヒヤリハット報告の活性化",
    description:
      "労働者1人あたりヒヤリハットを年2件以上収集・分析し、対策を実施する。報告者を非難しない運用を徹底する。",
    target: "1人あたり 年2件以上",
    kpi: "ヒヤリハット報告件数 / 在籍者数",
  },
  {
    category: "health-promotion",
    title: "健康診断受診率の維持",
    description:
      "定期健康診断・特定業務従事者健診の対象者全員が受診する。要再検査・要医療判定者の受診率を90%以上にする。",
    target: "受診率 100% / 事後措置完了率 90% 以上",
    kpi: "対象者 / 受診者 / 事後措置完了者",
  },
  {
    category: "ra-coverage",
    title: "リスクアセスメントの実施",
    description:
      "化学物質RA・機械RAを計画的に実施し、見積もり対象作業をカバーする。",
    target: "対象作業の100%でRA実施 / 高リスク残置ゼロ",
    kpi: "RA実施件数 / 対象作業数",
  },
  {
    category: "compliance",
    title: "安全衛生委員会の確実な開催",
    description:
      "毎月1回以上開催し、付議事項を網羅、議事録を3年間保存する。",
    target: "開催率 100%（月1回以上） / 議事録保存 3年",
    kpi: "開催回数 / 議事録ファイル数",
  },
];

export const scaleAdjustments: Record<ScaleId, SafetyGoal[]> = {
  small: [
    {
      category: "compliance",
      title: "安全衛生推進者を中心とした自主管理体制の維持",
      description:
        "推進者の業務分掌を明確にし、毎月の安全衛生活動の進捗確認と外部相談機関（労働基準監督署・労働衛生コンサルタント等）の活用を行う。",
      target: "月次活動進捗 100% / 外部相談 年2回以上",
      kpi: "月次レビュー実施回数 / 外部相談記録",
    },
  ],
  medium: [
    {
      category: "mental-health",
      title: "ストレスチェック実施と職場環境改善",
      description:
        "全員にストレスチェックを実施し、高ストレス者の医師面接指導を確実に提供。集団分析を活用した職場改善計画を策定する。",
      target: "実施率 90% 以上 / 集団分析を全部署で実施",
      kpi: "受検率 / 面接指導申出件数 / 改善計画件数",
    },
  ],
  large: [
    {
      category: "mental-health",
      title: "メンタルヘルス4ケア体制の確立",
      description:
        "セルフケア・ラインケア・事業場内産業保健スタッフによるケア・事業場外資源によるケアの体制を整備し、各層の研修を年1回以上実施する。",
      target: "4ケア研修 各層年1回以上 / EAP契約 維持",
      kpi: "研修受講数 / EAP相談件数",
    },
    {
      category: "compliance",
      title: "総括安全衛生管理者を中心とした全社統括",
      description:
        "総括安全衛生管理者の指揮下で、各事業場の活動状況を四半期で集約し、本社レベルの方針へ反映する。",
      target: "全事業場の活動報告 100% / 四半期レビュー 100%",
      kpi: "報告提出率 / レビュー実施回数",
    },
  ],
};

export function getBaseGoals(scale: ScaleId): SafetyGoal[] {
  return [...commonBaseGoals, ...scaleAdjustments[scale]];
}
