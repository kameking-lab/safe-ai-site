/**
 * サービス業（ビルメンテナンス、清掃、警備、リース等） / Service.
 *
 * Diverse risks: 転倒・墜落、機材取扱、顧客対応のメンタル負荷、夜勤、
 * クライアント先での重層構造による作業調整の難しさ。
 */

import type {
  CircularReference,
  LawReference,
  MonthIndex,
  MonthlyEvent,
  SafetyGoal,
  SafetyMeasure,
} from "@/types/safety-plan";

export const serviceIndustryGoals: SafetyGoal[] = [
  {
    category: "accident-reduction",
    title: "転倒・墜落災害ゼロ",
    description:
      "清掃・点検・警備業務での転倒・墜落・高所作業災害をゼロにする。床面の濡れ対策、はしご・脚立の3点支持、フルハーネス使用の徹底を行う。",
    target: "転倒・墜落災害 0件",
    kpi: "転倒・墜落災害件数 / 高所作業件数",
  },
  {
    category: "mental-health",
    title: "カスタマーハラスメント対応の整備",
    description:
      "顧客・利用者からの暴言・暴力・不当要求に対するマニュアル・相談窓口・複数対応体制を整備し、現場担当者のメンタル不調を予防する。",
    target: "マニュアル整備 100% / 相談窓口認知 90%",
    kpi: "発生件数 / 相談件数 / マニュアル整備状況",
  },
  {
    category: "education-coverage",
    title: "クライアント先ルールの周知徹底",
    description:
      "クライアントごとの安全衛生ルールを派遣前に確実に共有し、新規入場者教育を実施する。",
    target: "派遣前教育 100% / 新規入場者教育 100%",
    kpi: "教育記録 / クライアント別ヒヤリハット件数",
  },
];

export const serviceIndustryMeasures: SafetyMeasure[] = [
  {
    category: "industry-specific",
    title: "脚立・はしごの安全使用ルール",
    description:
      "天板に乗らない、3点支持、開き止め金具の確実なロック、補助者の配置、定期点検と劣化品の更新を運用する。",
    frequency: "通年 / 点検は四半期ごと",
    responsible: "現場責任者 / 安全担当",
    reference: "安衛則第527条〜第528条",
  },
  {
    category: "industry-specific",
    title: "高所作業のフルハーネス使用",
    description:
      "高さ2m以上で作業床を設けることが困難な場合はフルハーネス型墜落制止用器具を使用。特別教育を受けた者が作業する。",
    frequency: "高所作業の都度",
    responsible: "現場責任者",
    reference: "安衛則第36条第41号 / 第518条〜第521条",
  },
  {
    category: "industry-specific",
    title: "クライアント先での新規入場者教育",
    description:
      "クライアントの作業所ルール、避難経路、緊急連絡先、KYボード運用、保護具着用基準を派遣前または現場到着時に教育する。",
    frequency: "派遣先変更の都度",
    responsible: "営業担当 / 現場責任者",
    reference: "安衛則第642条の3（建設業の場合）",
  },
  {
    category: "industry-specific",
    title: "夜勤・交代制勤務者の健康管理",
    description:
      "警備・清掃の夜勤従事者には6か月以内ごとに特定業務従事者健診を実施し、勤務間インターバルの確保とメンタル相談窓口の周知を行う。",
    frequency: "健診は6か月以内ごとに1回",
    responsible: "産業医 / 衛生管理者",
    reference: "安衛則第45条",
  },
  {
    category: "industry-specific",
    title: "カスタマーハラスメント対応",
    description:
      "発生時マニュアル（複数対応・退避経路・通報基準）の整備、相談窓口の周知、被害職員へのフォロー、悪質ケースのクライアント連携を実施。",
    frequency: "通年 / マニュアル見直しは年1回",
    responsible: "総務 / 産業医",
    reference: "厚労省「カスタマーハラスメント対策企業マニュアル」",
  },
];

export const serviceMonthlyExtras: Partial<Record<MonthIndex, MonthlyEvent[]>> = {
  5: [
    {
      title: "脚立・はしご一斉点検",
      category: "equipment-check",
      description:
        "全現場で保有する脚立・はしごを一斉点検し、劣化品の更新計画を策定する。",
      required: false,
    },
  ],
  9: [
    {
      title: "カスタマーハラスメント対応研修",
      category: "education",
      description:
        "全現場責任者と新規入社者を対象に、想定事例ロールプレイによる対応研修を実施。",
      required: false,
    },
  ],
};

export const serviceLawReferences: LawReference[] = [
  {
    name: "労働安全衛生法",
    articles: ["第59条（教育）", "第65条の3（作業の管理）"],
    summary:
      "サービス業に係る一般的な教育と作業管理の枠組。",
  },
  {
    name: "労働安全衛生規則",
    articles: [
      "第518条〜第533条（墜落の防止）",
      "第527条〜第528条（はしご道・脚立）",
      "第618条（救急用具）",
    ],
    summary:
      "墜落・転落防止、はしご・脚立、救急用具の備付け等の基準を定める。",
  },
  {
    name: "労働施策総合推進法（パワハラ・カスハラ）",
    articles: ["第30条の2（職場におけるハラスメント防止措置）"],
    summary:
      "事業主に対し、職場におけるハラスメント防止のための雇用管理上必要な措置を義務付ける。カスハラ対策は近年の指針改正で位置付けが明確化された。",
  },
];

export const serviceCircularReferences: CircularReference[] = [
  {
    number: "基発0421第1号",
    date: "2023-04-21",
    title: "脚立・はしごからの墜落・転落災害防止対策の徹底について",
  },
];

export const serviceBasicPolicy = `当社は「現場ごとのリスクを正確に把握し、現場担当者を孤立させない」を方針とし、転倒・墜落災害および顧客対応によるメンタル不調をゼロにする。脚立・はしごの確実な使用ルール、クライアント先での新規入場者教育、カスタマーハラスメント対応マニュアルの整備を通じて、現場担当者が安全・安心して働ける環境を実現する。`;
