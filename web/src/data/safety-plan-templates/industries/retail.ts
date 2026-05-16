/**
 * 小売業 / Retail.
 *
 * Leading hazards: 転倒（濡れ・段差・什器）、腰痛（荷出し・品出し）、
 * カスタマーハラスメント、強盗・防犯、夜間作業、レジでの長時間立位。
 */

import type {
  CircularReference,
  LawReference,
  MonthIndex,
  MonthlyEvent,
  SafetyGoal,
  SafetyMeasure,
} from "@/types/safety-plan";

export const retailIndustryGoals: SafetyGoal[] = [
  {
    category: "accident-reduction",
    title: "転倒災害ゼロ",
    description:
      "店舗内・バックヤード・駐車場での転倒災害をゼロにする。STOP！転倒災害プロジェクトに呼応した4S運動とすべりにくい靴の貸与を徹底する。",
    target: "転倒災害 0件",
    kpi: "転倒災害件数 / 在籍者数",
  },
  {
    category: "accident-reduction",
    title: "腰痛発生ゼロ",
    description:
      "品出し・搬入時の腰痛をゼロにする。台車・カートの活用、適切な持ち上げ動作、頻度高い作業の負荷分散を実施。",
    target: "腰痛による休業 0件",
    kpi: "腰痛報告件数 / 重量物取扱頻度",
  },
  {
    category: "mental-health",
    title: "カスタマーハラスメント対策",
    description:
      "顧客からの暴言・暴力・不当要求に対するマニュアル・複数対応体制・相談窓口を整備し、従業員のメンタル不調を予防する。",
    target: "マニュアル整備 100% / 相談窓口認知 90%",
    kpi: "発生件数 / 相談件数",
  },
];

export const retailIndustryMeasures: SafetyMeasure[] = [
  {
    category: "industry-specific",
    title: "転倒防止4S（整理・整頓・清掃・清潔）運動",
    description:
      "売場・バックヤード・荷捌場・駐車場・トイレ・階段の濡れ・凹凸・段差を日次でチェック。手すり設置、滑りにくい床材、雨天時マット運用を行う。",
    frequency: "毎日 / 重点点検は月1回",
    responsible: "店長 / 売場責任者",
    reference: "厚労省「STOP！転倒災害プロジェクト」",
  },
  {
    category: "industry-specific",
    title: "腰痛予防対策",
    description:
      "重量物の床置きをやめ作業台に置く、25kg超は2人作業または機械化、台車・カート常備、新人配属時に動作教育を実施。",
    frequency: "通年 / 教育は新人配属時",
    responsible: "売場責任者",
    reference: "厚労省「職場における腰痛予防対策指針」",
  },
  {
    category: "industry-specific",
    title: "カスタマーハラスメント対応",
    description:
      "発生時マニュアル（複数対応・退避経路・防犯通報基準・録音録画）、被害従業員へのフォロー、悪質ケースの警察連携を整備。",
    frequency: "通年 / 研修は年1回",
    responsible: "店長 / 本部 / 産業医",
    reference: "労働施策総合推進法第30条の2",
  },
  {
    category: "industry-specific",
    title: "強盗・暴漢対策（早朝・深夜営業）",
    description:
      "深夜・早朝のシフトでは複数勤務、防犯カメラの定期点検、レジ・金庫のセキュリティルール、緊急通報訓練を実施。",
    frequency: "通年 / 訓練は年1回",
    responsible: "店長 / 防犯責任者",
    reference: "深夜業務における安全確保のためのガイドライン",
  },
  {
    category: "industry-specific",
    title: "レジ業務者の健康配慮",
    description:
      "長時間立位作業者には疲労軽減マット、ローテーション、定期的な座位休憩、足腰のケアの周知を実施。",
    frequency: "通年",
    responsible: "店長 / 衛生管理者",
  },
];

export const retailMonthlyExtras: Partial<Record<MonthIndex, MonthlyEvent[]>> = {
  6: [
    {
      title: "梅雨期の転倒防止強化",
      category: "industry-specific",
      description:
        "雨天時の入口マット運用、店内通路の濡れ即時拭き取り、注意喚起表示を徹底。",
      required: false,
    },
  ],
  12: [
    {
      title: "年末繁忙期の安全配慮",
      category: "industry-specific",
      description:
        "搬入頻度増加に伴う腰痛予防、長時間労働の抑制、深夜業務の複数勤務、防犯対策を強化。",
      required: false,
    },
  ],
  1: [
    {
      title: "冬季転倒防止（凍結・降雪）",
      category: "industry-specific",
      description:
        "駐車場・歩道の凍結対策、融雪剤散布、すべりにくい靴の貸与を徹底。",
      required: false,
    },
  ],
};

export const retailLawReferences: LawReference[] = [
  {
    name: "労働安全衛生法",
    articles: ["第18条（衛生委員会）", "第59条（教育）"],
    summary: "小売業に対する衛生委員会・教育の基本枠組を定める。",
  },
  {
    name: "労働安全衛生規則",
    articles: ["第544条（通路）", "第618条（救急用具）"],
    summary: "通路の安全確保、救急用具の備付け等を定める。",
  },
  {
    name: "労働施策総合推進法",
    articles: ["第30条の2（ハラスメント防止）"],
    summary: "職場におけるハラスメント防止措置義務を定める。カスハラ対策の根拠となる。",
  },
];

export const retailCircularReferences: CircularReference[] = [
  {
    number: "基発0123第2号",
    date: "2024-01-23",
    title: "第三次産業における労働災害防止対策（転倒災害防止）の徹底について",
  },
];

export const retailBasicPolicy = `当社は「お客様の安全と従業員の安全を共に守る」を方針とし、転倒・腰痛・カスタマーハラスメントによる被害ゼロを目指す。4S活動、腰痛予防動作の徹底、カスタマーハラスメント対応マニュアルの運用、深夜業務の安全確保を通じて、従業員が長く安心して働ける店舗運営を実現する。`;
