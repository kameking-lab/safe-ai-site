/**
 * 医療・福祉 / Medical & Welfare (hospitals, clinics, nursing care).
 *
 * Leading hazards: 腰痛（介護・看護）、針刺し・切創、転倒、感染症ばく露、
 * 暴言暴力（カスタマーハラスメント）、夜勤・交代制によるメンタル不調。
 */

import type {
  CircularReference,
  LawReference,
  MonthIndex,
  MonthlyEvent,
  SafetyGoal,
  SafetyMeasure,
} from "@/types/safety-plan";

export const medicalIndustryGoals: SafetyGoal[] = [
  {
    category: "accident-reduction",
    title: "腰痛・介護労災ゼロ",
    description:
      "介護・看護作業による腰痛の発生をゼロにする。「職場における腰痛予防対策指針」に基づき、ノーリフトケアと福祉用具の活用を徹底する。",
    target: "業務上腰痛 0件",
    kpi: "腰痛による休業・治療件数 / 介護負荷分析",
  },
  {
    category: "accident-reduction",
    title: "針刺し・切創ゼロ",
    description:
      "注射針・採血針等による針刺し・切創事故をゼロにする。安全機構付き器材の導入、リキャップ禁止、廃棄容器の適正配置を徹底する。",
    target: "針刺し・切創 0件",
    kpi: "針刺し報告件数 / 処置時間 / B型肝炎ワクチン接種率",
  },
  {
    category: "mental-health",
    title: "暴言・暴力（カスタマーハラスメント）対策の整備",
    description:
      "患者・利用者・家族からの暴言・暴力に対するマニュアル、相談窓口、複数対応体制を整備し、職員のメンタル不調を予防する。",
    target: "対応マニュアル整備 100% / 相談窓口認知 90% 以上",
    kpi: "発生件数 / 相談件数 / マニュアル整備状況",
  },
];

export const medicalIndustryMeasures: SafetyMeasure[] = [
  {
    category: "industry-specific",
    title: "腰痛予防対策（ノーリフトケア導入）",
    description:
      "「職場における腰痛予防対策指針」に基づき、人力での持ち上げを原則禁止し、リフト・スライディングシート等の福祉用具を導入。新任者には腰痛予防体操と動作指導を実施する。",
    frequency: "通年 / 新任者教育は配属時",
    responsible: "労働衛生担当 / 看護部 / 介護部",
    reference: "厚労省「職場における腰痛予防対策指針」",
  },
  {
    category: "industry-specific",
    title: "針刺し・切創事故防止対策",
    description:
      "安全機構付き器材の標準化、リキャップ禁止、耐貫通性廃棄容器の設置、B型肝炎ワクチン接種、暴露後対応プロトコル（PEP）整備を実施する。",
    frequency: "通年 / 教育は新任時・年1回",
    responsible: "感染対策委員会 / 看護部",
    reference: "労働者の健康障害防止指針（針刺し）",
  },
  {
    category: "industry-specific",
    title: "感染症対策（標準予防策・経路別予防策）",
    description:
      "標準予防策の徹底、感染経路別予防策の整備、N95マスクのフィットテスト、結核暴露時対応、流行期の対応マニュアル運用を実施。",
    frequency: "通年 / フィットテストは年1回",
    responsible: "感染対策委員会 / 産業医",
    reference: "感染症の予防及び感染症の患者に対する医療に関する法律",
  },
  {
    category: "industry-specific",
    title: "夜勤・交代制勤務者の健康管理",
    description:
      "夜勤回数の上限管理、勤務間インターバル11時間以上、夜勤前後の十分な休息、年1回の特定業務従事者健康診断を実施する。",
    frequency: "通年 / 健診は6か月以内ごとに1回",
    responsible: "看護管理者 / 産業医",
    reference: "安衛則第13条 / 第45条",
  },
  {
    category: "industry-specific",
    title: "暴言・暴力対策と相談窓口",
    description:
      "発生時マニュアル（複数対応・退避経路・通報基準）の整備、相談窓口の周知、被害職員へのフォロー（産業医面談・配置調整）を実施する。",
    frequency: "通年 / マニュアル見直しは年1回",
    responsible: "総務・人事 / 産業医",
    reference: "厚労省「医療従事者の安全と健康確保のための取組」",
  },
];

export const medicalMonthlyExtras: Partial<Record<MonthIndex, MonthlyEvent[]>> = {
  4: [
    {
      title: "新人看護師・新人介護職 オリエンテーション",
      category: "education",
      description:
        "腰痛予防動作、針刺し対策、感染対策、暴言暴力対応、緊急時対応の集中教育を実施。",
      required: false,
    },
  ],
  6: [
    {
      title: "ノーリフトケア実技研修",
      category: "industry-specific",
      description:
        "リフト・スライディングシート等の福祉用具の使い方を実技で再確認。各部署の使用率を集計。",
      required: false,
    },
  ],
  10: [
    {
      title: "インフルエンザ等予防接種計画",
      category: "health-check",
      description:
        "職員のインフルエンザ・B型肝炎・麻疹風疹等の予防接種計画を策定し、接種を順次実施。",
      required: false,
    },
  ],
  11: [
    {
      title: "感染症流行期対応の総点検",
      category: "industry-specific",
      description:
        "N95マスク備蓄、防護具着脱手順、暴露時対応プロトコル、面会制限ルールを点検。",
      required: false,
    },
  ],
  1: [
    {
      title: "感染症流行期の継続対応",
      category: "industry-specific",
      description:
        "インフルエンザ・ノロウイルス・新型感染症の流行状況に応じて、勤務体制・面会制限・職員の体調管理を強化。",
      required: false,
    },
  ],
};

export const medicalLawReferences: LawReference[] = [
  {
    name: "労働安全衛生法（医療・福祉関連）",
    articles: ["第13条（産業医）", "第18条（衛生委員会）", "第66条（健康診断）"],
    summary:
      "医療・福祉事業場に対する産業医選任・衛生委員会設置・特定業務従事者健診の枠組を定める。",
  },
  {
    name: "労働安全衛生規則",
    articles: ["第45条（特定業務従事者健康診断）", "第618条（救急用具の備付け）"],
    summary:
      "深夜業・暑熱・寒冷・粉じん作業等の特定業務従事者健診と救急用具の備付けを定める。",
  },
  {
    name: "感染症の予防及び感染症の患者に対する医療に関する法律",
    articles: ["第19条〜第22条（措置）"],
    summary:
      "感染症発生時の届出・就業制限・消毒等の措置を定める。医療機関の感染対策の基盤となる。",
  },
  {
    name: "労働基準法（医療・介護関連）",
    articles: ["第32条の2〜第32条の5（変形労働時間制）", "第41条の2（管理監督者）"],
    summary:
      "交代制勤務に対応する変形労働時間制と、管理監督者の取扱いを定める。",
  },
];

export const medicalCircularReferences: CircularReference[] = [
  {
    number: "基発0418第1号",
    date: "2013-04-18",
    title: "職場における腰痛予防対策指針の改訂について",
  },
  {
    number: "基発0526第2号",
    date: "2022-05-26",
    title: "労働者の心身の状態に関する情報の適正な取扱いのために事業者が講ずべき措置に関する指針の改正について",
  },
];

export const medicalBasicPolicy = `当社は「患者・利用者の安全と職員の安全は両立できる」を方針とし、腰痛・針刺し・感染症ばく露・暴言暴力による健康被害ゼロを目指す。ノーリフトケアの徹底、安全機構付き器材の標準化、感染対策チームによる継続的改善、夜勤者のインターバル確保とメンタルケアを通じて、職員が長く安心して働ける職場を実現する。`;
