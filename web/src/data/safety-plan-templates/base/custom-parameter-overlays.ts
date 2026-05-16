/**
 * Custom-parameter overlays for the plan generator.
 *
 * Layers caller-supplied attributes (special work types, overseas assignment,
 * overwork priority) onto the base template so the generated plan reflects
 * the employer's specific situation.
 *
 * Article references cite numbers only — no statutory text reproduced
 * (CLAUDE.md: 法令本文の逐語転載禁止).
 */

import type {
  OverworkPriority,
  SafetyGoal,
  SafetyMeasure,
  SpecialWorkId,
} from "@/types/safety-plan";

interface SpecialWorkOverlay {
  goals: SafetyGoal[];
  measures: SafetyMeasure[];
}

const SPECIAL_WORK_OVERLAYS: Record<SpecialWorkId, SpecialWorkOverlay> = {
  "high-place": {
    goals: [
      {
        category: "accident-reduction",
        title: "高所作業における墜落・転落災害ゼロ",
        description:
          "高さ2m以上の作業について作業床・手すり・墜落制止用器具を確実に運用する。",
        target: "高所作業における墜落・転落 0件",
        kpi: "災害件数 / 高所作業実施件数",
      },
    ],
    measures: [
      {
        category: "industry-specific",
        title: "墜落制止用器具（フルハーネス）使用と特別教育",
        description:
          "高さ2m以上で作業床を設けることが困難な場合はフルハーネス型を使用し、対象者に特別教育を実施。器具は使用前点検と耐用年数管理。",
        frequency: "対象作業の都度 / 器具点検は毎日",
        responsible: "職長 / 安全担当",
        reference: "安衛則第36条第41号 / 第518条〜第521条",
      },
    ],
  },
  "organic-solvent": {
    goals: [
      {
        category: "ra-coverage",
        title: "有機溶剤取扱い作業のばく露低減",
        description:
          "局所排気装置・全体換気装置・呼吸用保護具の組合せでばく露を低減する。",
        target: "管理濃度・ばく露濃度基準値超え 0件",
        kpi: "作業環境測定区分（第1〜第3）の改善状況",
      },
    ],
    measures: [
      {
        category: "industry-specific",
        title: "有機溶剤作業主任者の選任と職務",
        description:
          "有機溶剤作業主任者技能講習修了者から選任。作業方法の決定、保護具の使用状況監視、装置の月次点検を行う。",
        frequency: "選任時 / 月次点検",
        responsible: "事業者 / 作業主任者",
        reference: "有機溶剤中毒予防規則第19条等",
      },
    ],
  },
  "specified-chemical": {
    goals: [
      {
        category: "ra-coverage",
        title: "特定化学物質ばく露の管理徹底",
        description:
          "発がん性・健康障害性のある特化物について、ばく露低減措置と特殊健康診断を確実に実施する。",
        target: "ばく露濃度基準値 超え 0件 / 特殊健診 100% 受診",
        kpi: "作業環境測定結果 / 特殊健診受診率",
      },
    ],
    measures: [
      {
        category: "industry-specific",
        title: "特定化学物質作業主任者の選任と特殊健康診断",
        description:
          "特定化学物質作業主任者を選任し、特殊健康診断（6か月以内ごとに1回）を実施。30年間記録保存。",
        frequency: "選任時 / 健診は6か月以内ごとに1回",
        responsible: "作業主任者 / 産業医",
        reference: "特定化学物質障害予防規則第27条・第39条等",
      },
    ],
  },
  dust: {
    goals: [
      {
        category: "health-promotion",
        title: "じん肺予防とばく露低減",
        description:
          "粉じん作業のばく露低減と、じん肺健診の確実な実施でじん肺発症を防止する。",
        target: "じん肺管理区分2以上の新規発生 0件",
        kpi: "じん肺健診受診率 / 管理区分推移",
      },
    ],
    measures: [
      {
        category: "industry-specific",
        title: "じん肺健康診断と粉じん作業対策",
        description:
          "粉じん作業従事者にじん肺健診を実施。湿式作業・密閉化・局排・呼吸用保護具で発じん抑制。記録は7年保存。",
        frequency: "じん肺健診は管理区分に応じ1〜3年ごと",
        responsible: "産業医 / 安全管理者",
        reference: "じん肺法第7条〜第10条 / 粉じん障害防止規則",
      },
    ],
  },
  noise: {
    goals: [
      {
        category: "health-promotion",
        title: "騒音障害（聴力低下）の発生防止",
        description:
          "85dB以上の作業について遮音・防音保護具・配置管理を実施し、騒音性難聴の発生を防止する。",
        target: "騒音性難聴の新規発生 0件",
        kpi: "聴力検査の有所見者数 / 測定区分",
      },
    ],
    measures: [
      {
        category: "industry-specific",
        title: "騒音作業の測定と聴力検査",
        description:
          "騒音障害防止のためのガイドラインに基づき、騒音測定を実施し管理区分を決定。配置時・6か月以内ごとに聴力検査。",
        frequency: "測定は6か月以内ごとに1回 / 聴力検査は配置時・6か月以内ごとに1回",
        responsible: "産業医 / 安全管理者",
        reference: "騒音障害防止のためのガイドライン（基発0420第2号）",
      },
    ],
  },
  vibration: {
    goals: [
      {
        category: "health-promotion",
        title: "振動障害（白蝋病等）の予防",
        description:
          "振動工具の使用時間管理・体感振動低減型工具の採用・防振手袋着用で振動障害を予防する。",
        target: "振動障害の新規発生 0件",
        kpi: "振動工具使用時間記録 / 振動健診結果",
      },
    ],
    measures: [
      {
        category: "industry-specific",
        title: "振動工具取扱者の健康診断と作業時間管理",
        description:
          "振動工具取扱業務従事者には配置時・6か月以内ごとに振動健診を実施。日振動ばく露量A(8)を管理し、軽減策を実施。",
        frequency: "6か月以内ごとに1回",
        responsible: "産業医 / 安全管理者",
        reference: "基発0710第2号（振動障害総合対策要綱）",
      },
    ],
  },
  "ionizing-radiation": {
    goals: [
      {
        category: "compliance",
        title: "電離放射線業務の被ばく管理",
        description:
          "実効線量限度・等価線量限度を遵守し、ALARAの原則に基づき被ばく低減を継続する。",
        target: "個人線量限度超え 0件",
        kpi: "個人線量計記録 / 健診結果",
      },
    ],
    measures: [
      {
        category: "industry-specific",
        title: "電離放射線健康診断と線量管理",
        description:
          "放射線業務従事者には配置時・6か月以内ごとに健診を実施。個人線量計装着・記録30年保存・教育の実施。",
        frequency: "6か月以内ごとに1回",
        responsible: "放射線取扱主任者 / 産業医",
        reference: "電離放射線障害防止規則第56条等",
      },
    ],
  },
  lead: {
    goals: [
      {
        category: "compliance",
        title: "鉛中毒の発生防止",
        description:
          "鉛業務作業者の生物学的モニタリング（血中鉛・尿中δ-ALA）で早期発見・配置転換を行う。",
        target: "鉛中毒の新規発生 0件",
        kpi: "特殊健診受診率 / 生物学的指標",
      },
    ],
    measures: [
      {
        category: "industry-specific",
        title: "鉛作業主任者選任と特殊健康診断",
        description:
          "鉛作業主任者を選任し、特殊健康診断（6か月以内ごとに1回）を実施。湿式・局排・保護具で発じん抑制。",
        frequency: "選任時 / 健診は6か月以内ごとに1回",
        responsible: "作業主任者 / 産業医",
        reference: "鉛中毒予防規則第33条等",
      },
    ],
  },
  asbestos: {
    goals: [
      {
        category: "compliance",
        title: "石綿の事前調査・ばく露防止の徹底",
        description:
          "解体・改修工事における事前調査結果の電子報告と、作業者のばく露防止措置を徹底する。",
        target: "事前調査未実施 0件 / 電子報告 100%",
        kpi: "事前調査記録 / 電子報告件数",
      },
    ],
    measures: [
      {
        category: "industry-specific",
        title: "石綿障害予防規則対応（事前調査・作業届・記録保存）",
        description:
          "解体・改修工事ごとに事前調査結果報告システムへ電子報告し、作業計画・作業届・記録を作業終了後40年間保存する。",
        frequency: "工事の都度",
        responsible: "石綿作業主任者 / 工事責任者",
        reference: "石綿障害予防規則第3条〜第4条の2",
      },
    ],
  },
  "lone-work": {
    goals: [
      {
        category: "mental-health",
        title: "ひとり作業者の安全確保と孤立防止",
        description:
          "ひとり作業時の異常発生時の通報手段確保と、定期面談による孤立防止を行う。",
        target: "ひとり作業者面談実施率 100%",
        kpi: "面談実施件数 / 緊急通報訓練の実施回数",
      },
    ],
    measures: [
      {
        category: "industry-specific",
        title: "ひとり作業時の通報手段と定時連絡ルール",
        description:
          "携帯電話・非常ボタン・定時連絡（30分または1時間ごと）の運用ルールを文書化し、年1回の通報訓練を実施。",
        frequency: "通年 / 訓練は年1回",
        responsible: "事業者",
      },
    ],
  },
  "shift-work": {
    goals: [
      {
        category: "health-promotion",
        title: "交代制・深夜業従事者の健康管理",
        description:
          "深夜業従事者の特定業務従事者健康診断と勤務間インターバル運用で健康障害を予防する。",
        target: "深夜業健診受診率 100% / 勤務間インターバル違反 0件",
        kpi: "健診受診率 / 勤務間インターバル統計",
      },
    ],
    measures: [
      {
        category: "health-check",
        title: "特定業務従事者健康診断（深夜業等）",
        description:
          "深夜業を含む特定業務従事者に配置時・6か月以内ごとに1回の健診を実施。事後措置を産業医意見に基づき実施。",
        frequency: "6か月以内ごとに1回",
        responsible: "産業医 / 衛生管理者",
        reference: "安衛則第45条",
      },
    ],
  },
  "heavy-load": {
    goals: [
      {
        category: "health-promotion",
        title: "腰痛予防対策の徹底",
        description:
          "重量物取扱い（介護・荷役含む）における腰痛発生を予防するため、機械化・体位管理・健診を実施する。",
        target: "腰痛による休業 前年比 50% 減",
        kpi: "腰痛健診結果 / 休業日数",
      },
    ],
    measures: [
      {
        category: "industry-specific",
        title: "腰痛予防対策指針に基づく作業管理と健診",
        description:
          "厚労省「職場における腰痛予防対策指針」に基づき、重量制限・リフト機器導入・ストレッチ・腰痛健診を実施。",
        frequency: "配置前 / 6か月以内ごとに1回",
        responsible: "産業医 / 作業管理者",
        reference: "基発0618第1号（腰痛予防対策指針）",
      },
    ],
  },
};

export function getSpecialWorkAdditions(
  specialWork: SpecialWorkId[] | undefined,
): { goals: SafetyGoal[]; measures: SafetyMeasure[] } {
  if (!specialWork || specialWork.length === 0) {
    return { goals: [], measures: [] };
  }
  const goals: SafetyGoal[] = [];
  const measures: SafetyMeasure[] = [];
  for (const id of specialWork) {
    const overlay = SPECIAL_WORK_OVERLAYS[id];
    if (!overlay) continue;
    goals.push(...overlay.goals);
    measures.push(...overlay.measures);
  }
  return { goals, measures };
}

export function getOverseasAdditions(): {
  goals: SafetyGoal[];
  measures: SafetyMeasure[];
} {
  return {
    goals: [
      {
        category: "compliance",
        title: "海外派遣労働者の安全衛生確保",
        description:
          "海外派遣前・派遣中・帰国時の健康診断、感染症予防接種、危機管理研修を整備する。",
        target: "派遣前健診受診率 100% / 危機管理研修受講率 100%",
        kpi: "対象者数 / 実施件数",
      },
    ],
    measures: [
      {
        category: "health-check",
        title: "海外派遣労働者健康診断",
        description:
          "6か月以上海外派遣する労働者に派遣前・帰国時健診を実施。派遣中も現地で同等の健診を受診させる。",
        frequency: "派遣前 / 帰国時 / 派遣中6か月ごと",
        responsible: "産業医 / 人事部",
        reference: "安衛則第45条の2",
      },
      {
        category: "industry-specific",
        title: "海外赴任者向け危機管理研修",
        description:
          "テロ・自然災害・感染症・健康危機を想定した危機管理研修を実施し、家族向け資料も配布する。",
        frequency: "派遣前 / 年1回",
        responsible: "人事部",
      },
    ],
  };
}

const OVERWORK_HIGH: { goals: SafetyGoal[]; measures: SafetyMeasure[] } = {
  goals: [
    {
      category: "compliance",
      title: "過重労働の解消（重点対応）",
      description:
        "時間外・休日労働を月45時間以下に抑え、月80時間超を全廃する。勤務間インターバル11時間以上を100%確保。",
      target: "月80時間超 0件 / 月45時間超 前年比 50% 減 / 勤務間インターバル違反 0件",
      kpi: "労働時間統計 / 36協定特別条項発動回数",
    },
  ],
  measures: [
    {
      category: "health-check",
      title: "長時間労働者への医師面接指導（積極勧奨）",
      description:
        "月80時間超の労働者全員に面接指導を勧奨し、月100時間超は申出有無に関わらず面接指導の対象として通知。事後措置を就業区分判定で実施。",
      frequency: "月次（時間外集計後速やかに）",
      responsible: "産業医 / 人事部",
      reference: "安衛法第66条の8 / 第66条の8の2",
    },
    {
      category: "committee",
      title: "過重労働対策の安全衛生委員会重点議題化",
      description:
        "毎月の安全衛生委員会で長時間労働者の人数・健康状況・改善策を必須議題とし、事業者へ改善計画を答申する。",
      frequency: "月1回",
      responsible: "衛生委員会",
    },
  ],
};

const OVERWORK_LOW: { goals: SafetyGoal[]; measures: SafetyMeasure[] } = {
  goals: [
    {
      category: "compliance",
      title: "勤務時間管理の継続的運用",
      description:
        "既に確立された勤務時間管理を維持し、例外的な長時間労働発生時に迅速対応する体制を維持する。",
      target: "月45時間超 0件の維持 / 勤務間インターバル 11時間以上維持",
      kpi: "労働時間統計 / 月次レビュー実施回数",
    },
  ],
  measures: [
    {
      category: "committee",
      title: "勤務時間管理の月次レビュー",
      description:
        "労務担当が勤務時間データを月次集計し、衛生委員会で報告。例外発生時は産業医面談を提案する。",
      frequency: "月1回",
      responsible: "労務担当 / 衛生委員会",
    },
  ],
};

export function getOverworkAdditions(
  priority: OverworkPriority | undefined,
): { goals: SafetyGoal[]; measures: SafetyMeasure[] } {
  if (priority === "high") return OVERWORK_HIGH;
  if (priority === "low") return OVERWORK_LOW;
  return { goals: [], measures: [] };
}
