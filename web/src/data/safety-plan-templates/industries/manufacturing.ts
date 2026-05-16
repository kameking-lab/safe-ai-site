/**
 * 製造業 / Manufacturing.
 *
 * High-risk causes: 機械はさまれ・巻き込まれ、転倒、化学物質、騒音、振動。
 * Heavy reliance on RA for machinery and chemicals.
 */

import type {
  CircularReference,
  LawReference,
  MonthIndex,
  MonthlyEvent,
  SafetyGoal,
  SafetyMeasure,
} from "@/types/safety-plan";

export const manufacturingIndustryGoals: SafetyGoal[] = [
  {
    category: "accident-reduction",
    title: "はさまれ・巻き込まれ災害ゼロ",
    description:
      "プレス機械・木材加工用機械・産業用ロボット等の機械災害を起こさない。本質安全設計とインターロック、特定自主検査を徹底する。",
    target: "はさまれ・巻き込まれ災害 0件",
    kpi: "機械災害発生件数 / 機械稼働時間",
  },
  {
    category: "ra-coverage",
    title: "化学物質RA カバー率 100%",
    description:
      "リスクアセスメント対象物（674物質、令和8年4月時点）の取扱い作業すべてでRAを実施し、ばく露濃度基準値を超える作業ゼロを目指す。",
    target: "RA対象作業の100%実施 / 濃度基準値超え 0件",
    kpi: "RA実施数 / 対象作業数 / 個人ばく露測定結果",
  },
];

export const manufacturingIndustryMeasures: SafetyMeasure[] = [
  {
    category: "industry-specific",
    title: "プレス機械・剪断機の特定自主検査",
    description:
      "動力プレス機械（5,000kN未満）は1年に1回、5,000kN以上は年2回、剪断機は1年に1回の特定自主検査を有資格者により実施し、3年間記録を保存する。",
    frequency: "年1〜2回",
    responsible: "プレス機械作業主任者 / 検査業者",
    reference: "安衛則第135条〜第135条の3",
  },
  {
    category: "industry-specific",
    title: "産業用ロボット教示・検査時の安全措置",
    description:
      "産業用ロボットの教示・検査の業務に従事する者には特別教育を実施。可動範囲内での作業は運転停止または運転速度の低下を原則とし、起動スイッチに「教示中」「検査中」の表示を行う。",
    frequency: "特別教育は新規対象者の都度 / 表示は作業の都度",
    responsible: "安全管理者 / 設備担当",
    reference: "安衛則第36条第31号〜第32号 / 第150条の3〜第151条",
  },
  {
    category: "industry-specific",
    title: "化学物質管理者・保護具着用管理責任者の選任",
    description:
      "リスクアセスメント対象物を製造・取扱う事業場は化学物質管理者を選任。保護具を使用する場合は保護具着用管理責任者を選任し、それぞれの業務を遂行させる。",
    frequency: "選任時 / 退任時",
    responsible: "事業者",
    reference: "安衛則第12条の5 / 第12条の6",
  },
  {
    category: "industry-specific",
    title: "局所排気装置等の定期自主検査",
    description:
      "有機溶剤・特定化学物質・粉じん作業に係る局所排気装置・プッシュプル型換気装置・除じん装置を1年に1回点検し、3年間記録を保存する。",
    frequency: "年1回",
    responsible: "設備担当 / 衛生管理者",
    reference: "有機則第20条 / 特化則第30条 / 粉じん則第17条",
  },
  {
    category: "industry-specific",
    title: "作業環境測定（指定作業場）",
    description:
      "粉じん・有機溶剤・特定化学物質・鉛・騒音等の指定作業場で6か月以内に1回、作業環境測定士が測定。第3管理区分は速やかに改善計画を策定し再測定する。",
    frequency: "6か月以内ごとに1回",
    responsible: "作業環境測定士 / 衛生管理者",
    reference: "安衛法第65条 / 作業環境測定法",
  },
];

export const manufacturingMonthlyExtras: Partial<Record<MonthIndex, MonthlyEvent[]>> = {
  2: [
    {
      title: "作業環境測定（前半期）",
      category: "industry-specific",
      description:
        "指定作業場の作業環境測定を実施。結果と評価を委員会で共有し、第3管理区分が出た場合は改善計画を策定する。",
      reference: "安衛法第65条",
      required: true,
    },
  ],
  5: [
    {
      title: "機械設備の特定自主検査計画策定",
      category: "equipment-check",
      description:
        "動力プレス・剪断機・フォークリフト等の特定自主検査の年間スケジュールを確定し、検査結果記録の保存体制を確認。",
      required: false,
    },
  ],
  8: [
    {
      title: "作業環境測定（後半期）",
      category: "industry-specific",
      description:
        "指定作業場の作業環境測定の後半期分を実施。第3管理区分対象作業場の改善状況を点検する。",
      reference: "安衛法第65条",
      required: true,
    },
  ],
  9: [
    {
      title: "化学物質RAの年次見直し",
      category: "ra",
      description:
        "新規対象物質追加（毎年4月）と取扱量・作業方法の変更を反映してCREATE-SIMPLE等で再見積もり。",
      reference: "安衛則第34条の2の7",
      required: true,
    },
  ],
  11: [
    {
      title: "粉じん・有機溶剤等の特殊健康診断",
      category: "health-check",
      description:
        "対象業務従事者に対し6か月以内ごとに1回の特殊健康診断を実施。配置前健診を含め記録を保存する。",
      reference: "安衛則第45条 / 有機則第29条 / 特化則第39条",
      required: true,
    },
  ],
};

export const manufacturingLawReferences: LawReference[] = [
  {
    name: "労働安全衛生法（製造業関連）",
    articles: [
      "第14条（作業主任者）",
      "第28条の2（リスクアセスメント）",
      "第57条の3（化学物質のリスクアセスメント）",
      "第65条（作業環境測定）",
    ],
    summary:
      "作業主任者の選任、機械および化学物質に係るリスクアセスメント、指定作業場の作業環境測定を定める。",
  },
  {
    name: "有機溶剤中毒予防規則",
    articles: ["第18条〜第22条（排気装置等）", "第28条〜第29条（健康診断）"],
    summary:
      "有機溶剤業務を行う場合の発散源対策・換気・保護具・健康診断・作業環境測定を定める。",
  },
  {
    name: "特定化学物質障害予防規則",
    articles: ["第3条〜第5条（製造等）", "第36条（作業環境測定）"],
    summary:
      "特定化学物質を製造・取扱う作業の発散源対策・許可・記録・健康診断を定める。",
  },
  {
    name: "粉じん障害防止規則",
    articles: ["第4条（局所排気装置等）", "第26条（作業環境測定）"],
    summary:
      "粉じん作業の発散抑制設備・呼吸用保護具・作業環境測定の頻度を定める。",
  },
];

export const manufacturingCircularReferences: CircularReference[] = [
  {
    number: "基発0207第2号",
    date: "2024-02-07",
    title: "化学物質のリスクアセスメントに係るばく露濃度基準値の運用について",
  },
  {
    number: "基発0331第15号",
    date: "2024-03-31",
    title: "プレス機械等による労働災害防止のためのガイドラインの一部改正について",
  },
];

export const manufacturingBasicPolicy = `当社は「機械と化学物質のリスクを正しく見積もり、ゼロにする」を方針とし、はさまれ・巻き込まれ災害および化学物質ばく露によるじん肺・中毒の発生をゼロにする。本質安全設計、特定自主検査、化学物質管理者を中心とした自律的化学物質管理、作業環境測定の確実な実施を通じて、安全で健康な職場を実現する。`;
