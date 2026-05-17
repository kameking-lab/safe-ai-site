/**
 * 卸売業 / Wholesale.
 *
 * Risks similar to 倉庫 but with more vehicle traffic, mixed warehouse + sales
 * functions, and frequent forklift operation by non-dedicated drivers.
 */

import type {
  CircularReference,
  LawReference,
  MonthIndex,
  MonthlyEvent,
  SafetyGoal,
  SafetyMeasure,
} from "@/types/safety-plan";

export const wholesaleIndustryGoals: SafetyGoal[] = [
  {
    category: "accident-reduction",
    title: "フォークリフト関連災害ゼロ",
    description:
      "フォークリフトとの接触・はさまれ・転倒災害をゼロにする。歩車分離、構内速度制限、有資格者のみ運転、月次点検を徹底する。",
    target: "フォークリフト災害 0件",
    kpi: "フォークリフト関連災害件数 / 稼働時間",
  },
  {
    category: "accident-reduction",
    title: "墜落・転落災害ゼロ（棚卸・高所棚作業）",
    description:
      "高い棚への積込み・取り出しや棚卸し作業での墜落・転落をゼロにする。脚立・はしごの使用ルール、高所ピッキング機の活用を徹底する。",
    target: "墜落・転落災害 0件",
    kpi: "墜落・転落件数 / 高所作業件数",
  },
  {
    category: "accident-reduction",
    title: "腰痛発生ゼロ",
    description:
      "ピッキング・荷捌・配送準備での腰痛をゼロにする。重量物の機械化、台車活用、動作教育を徹底する。",
    target: "業務上腰痛 0件",
    kpi: "腰痛報告件数 / 取扱重量",
  },
];

export const wholesaleIndustryMeasures: SafetyMeasure[] = [
  {
    category: "industry-specific",
    title: "フォークリフト運転技能講習・特別教育",
    description:
      "最大荷重1トン以上は技能講習修了者、1トン未満は特別教育修了者が運転する。職長は運転者の資格を確認・記録する。",
    frequency: "新規対象者の都度",
    responsible: "事業者 / 職長",
    reference: "安衛法第59条第3項・第61条",
  },
  {
    category: "industry-specific",
    title: "フォークリフトの月次点検と特定自主検査",
    description:
      "始業前点検、月例点検、年次の特定自主検査を実施し、3年間記録を保存。タイヤ・制動・操舵・荷役装置・警報装置の確認。",
    frequency: "始業前 / 月1回 / 年1回（特定自主検査）",
    responsible: "整備担当 / フォークリフト運転者",
    reference: "安衛則第151条の21〜第151条の25",
  },
  {
    category: "industry-specific",
    title: "倉庫内歩車分離と構内速度制限",
    description:
      "フォークリフト走行経路と歩行者経路を線引き・段差・ガードレールで分離。構内速度制限8km/h以下、交差点での一旦停止、警報音・回転灯の使用を徹底。",
    frequency: "通年 / 経路見直しは年1回",
    responsible: "倉庫長 / 安全管理者",
  },
  {
    category: "industry-specific",
    title: "重量物取扱とアシスト機器導入",
    description:
      "25kg超は2人作業または機械化、台車・パワーアシストスーツ・電動ピッキングカートを導入。床面段差の解消、リフトテーブル設置を進める。",
    frequency: "通年",
    responsible: "倉庫長 / 設備担当",
  },
  {
    category: "industry-specific",
    title: "棚・什器の安定確保（地震対策）",
    description:
      "高層棚のアンカー固定、転倒防止チェーン、荷崩れ防止ネットを運用。地震想定の避難経路と緊急避難手順を周知。",
    frequency: "通年 / 点検は四半期",
    responsible: "倉庫長 / 防災担当",
  },
];

export const wholesaleMonthlyExtras: Partial<Record<MonthIndex, MonthlyEvent[]>> = {
  3: [
    {
      title: "棚卸前の安全点検",
      category: "industry-specific",
      description:
        "棚卸前に脚立・高所ピッキング機・パワーアシスト機器を点検。棚卸作業手順と応援者教育を実施。",
      required: false,
    },
  ],
  9: [
    {
      title: "下半期 棚卸前の安全点検",
      category: "industry-specific",
      description:
        "下半期棚卸前に脚立・高所ピッキング機を再点検。",
      required: false,
    },
  ],
};

export const wholesaleLawReferences: LawReference[] = [
  {
    name: "労働安全衛生法",
    articles: ["第59条第3項（特別教育）", "第61条（就業制限）"],
    summary:
      "フォークリフト・移動式クレーン等の運転に必要な特別教育・技能講習・免許を定める。",
  },
  {
    name: "労働安全衛生規則",
    articles: [
      "第151条の3（フォークリフトの作業計画）",
      "第151条の21〜第151条の25（点検）",
      "第518条〜第533条（墜落の防止）",
      "第544条（通路）",
    ],
    summary:
      "フォークリフトの作業計画・点検、墜落防止、通路の安全等の基準を定める。",
  },
];

export const wholesaleCircularReferences: CircularReference[] = [
  {
    number: "基発0331第4号",
    date: "2024-03-31",
    title: "陸上貨物運送事業における荷役作業の安全対策ガイドラインの一部改正について",
  },
];

export const wholesaleBasicPolicy = `当社は「荷も人も安全に動かす」を方針とし、フォークリフト災害・墜落・腰痛をゼロにする。歩車分離、フォークリフトの確実な点検と有資格運転、重量物のアシスト機器化、棚の地震対策を通じて、倉庫・配送現場で全員が安全に働ける環境を実現する。`;
