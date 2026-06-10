/**
 * 運輸交通業 / Transportation (trucking, taxi, bus, etc.).
 *
 * Leading hazards: 交通事故、荷役時の墜落・転倒、長時間運転による疲労蓄積。
 * Regulated by 改善基準告示 in addition to 労働基準法・安衛法.
 */

import type {
  CircularReference,
  LawReference,
  MonthIndex,
  MonthlyEvent,
  SafetyGoal,
  SafetyMeasure,
} from "@/types/safety-plan";

export const transportationIndustryGoals: SafetyGoal[] = [
  {
    category: "accident-reduction",
    title: "交通労働災害ゼロ",
    description:
      "業務上の交通事故をゼロにする。点呼の確実な実施、運行管理者による休憩計画、デジタルタコグラフ等の活用で疲労運転と速度超過を防止する。",
    target: "交通労働災害 0件 / 重大事故 0件",
    kpi: "交通災害件数 / 走行距離 / 速度超過件数",
  },
  {
    category: "accident-reduction",
    title: "陸上貨物運送事業における荷役災害の削減",
    description:
      "テールゲートリフター・荷台からの墜落・転落・転倒、荷崩れによる災害を防止する。陸運災害防止規程に基づくチェックリスト運用を徹底する。",
    target: "荷役災害 前年比 50% 減",
    kpi: "荷役災害件数 / 配送件数",
  },
  {
    category: "health-promotion",
    title: "睡眠時無呼吸症候群（SAS）スクリーニング",
    description:
      "運転業務従事者のSASスクリーニング検査を計画的に実施し、要精密検査者へのフォローを行う。",
    target: "対象者の年1回検査 100%",
    kpi: "受検者数 / 対象者数 / 治療継続率",
  },
];

export const transportationIndustryMeasures: SafetyMeasure[] = [
  {
    category: "industry-specific",
    title: "点呼の確実な実施（始業前・終業後）",
    description:
      "アルコール検知器による酒気帯び確認、健康状態・運行ルート・気象状況の確認、記録1年間保存。中間点呼は遠距離・夜間運行で実施。",
    frequency: "毎運行（始業前・終業後）",
    responsible: "運行管理者",
    reference: "貨物自動車運送事業輸送安全規則第7条",
  },
  {
    category: "industry-specific",
    title: "改善基準告示の遵守（拘束時間・休息期間）",
    description:
      "令和6年4月施行の改正改善基準告示に基づき、拘束時間（1日13時間原則・最大15時間）、休息期間（連続11時間以上を基本）、運転時間（2日平均1日9時間以内）を遵守する。",
    frequency: "通年",
    responsible: "運行管理者 / 労務担当",
    reference: "改善基準告示（厚労省告示）",
  },
  {
    category: "industry-specific",
    title: "テールゲートリフター操作の特別教育",
    description:
      "テールゲートリフターによる積卸し作業に従事する者には特別教育を実施（令和6年2月施行）。",
    frequency: "新規対象者の都度",
    responsible: "事業者 / 安全担当",
    reference: "安衛則第36条第5号の4",
  },
  {
    category: "industry-specific",
    title: "フォークリフト・移動式クレーンの作業計画",
    description:
      "フォークリフト・移動式クレーン等の作業時は事前に作業計画を定め、関係者へ周知。誘導者の配置と立入禁止区画を運用する。",
    frequency: "作業の都度",
    responsible: "作業主任者",
    reference: "安衛則第151条の3 / 第66条",
  },
  {
    category: "industry-specific",
    title: "車両の日常点検と定期点検",
    description:
      "始業前の日常点検と道路運送車両法に基づく3か月・12か月点検を実施。点検記録は1年または2年保存。",
    frequency: "日常 / 3か月 / 12か月",
    responsible: "運転者 / 整備管理者",
    reference: "道路運送車両法第48条",
  },
];

export const transportationMonthlyExtras: Partial<Record<MonthIndex, MonthlyEvent[]>> = {
  4: [
    {
      title: "新年度 改善基準告示遵守状況の点検",
      category: "industry-specific",
      description:
        "拘束時間・休息期間・運転時間の前年度実績を集計し、超過があった運転者と路線を特定して対策を講じる。",
      required: false,
    },
  ],
  5: [
    {
      title: "SASスクリーニング検査",
      category: "health-check",
      description:
        "運転業務従事者を対象に簡易検査を実施。要精密検査者には医療機関での確定診断とCPAP治療の継続を支援する。",
      required: false,
    },
  ],
  8: [
    {
      title: "夏季の長時間運転対策",
      category: "industry-specific",
      description:
        "盆休前後の繁忙期は休憩計画の見直し、車内温度管理、冷却タオル支給、運行管理者の点呼強化を実施。",
      required: false,
    },
  ],
  11: [
    {
      title: "陸上貨物運送事業労働災害防止強化期間",
      category: "industry-specific",
      description:
        "陸災防主催の取組に呼応し、荷役災害防止のチェックリスト運用、保護具着用徹底、職長会の意見交換を実施。",
      required: false,
    },
  ],
  12: [
    {
      title: "年末年始の輸送繁忙期対策",
      category: "industry-specific",
      description:
        "拘束時間・休息期間の遵守、無理な配送計画の排除、雪道・凍結路対策の徹底。",
      required: true,
    },
  ],
};

export const transportationLawReferences: LawReference[] = [
  {
    name: "貨物自動車運送事業法・同輸送安全規則",
    articles: [
      "輸送安全規則第7条（点呼）",
      "輸送安全規則第3条（運行管理者の業務）",
    ],
    summary:
      "事業用自動車の点呼・運行管理・運転者の指導監督・運転者台帳の整備等を定める。",
  },
  {
    name: "自動車運転者の労働時間等の改善のための基準（改善基準告示）",
    articles: ["拘束時間・休息期間・運転時間"],
    summary:
      "自動車運転者の労働時間等を一般労働者より厳格に規制する厚労省告示。令和6年4月施行の改正で休息期間11時間が基本となった。",
  },
  {
    name: "労働安全衛生規則（運輸関連）",
    articles: [
      "第36条第5号の4（テールゲートリフター操作の特別教育）",
      "第151条の3（フォークリフトの作業計画）",
      "第151条の70（陸上貨物の荷役作業）",
    ],
    summary:
      "運輸交通業に係る特別教育・作業計画・荷役作業の安全基準を定める。",
  },
  {
    name: "道路運送車両法",
    articles: ["第47条の2（日常点検整備）", "第48条（定期点検整備）"],
    summary:
      "車両の日常点検・3か月点検・12か月点検の実施と整備管理者の選任を定める。",
  },
];

export const transportationCircularReferences: CircularReference[] = [
  {
    number: "基発0307第3号",
    date: "2024-03-07",
    title: "陸上貨物運送事業における荷役作業の安全対策ガイドラインの一部改正について",
  },
  {
    number: "基発1212第1号",
    date: "2023-12-12",
    title: "自動車運転者の労働時間等の改善のための基準の改正等について",
  },
];

export const transportationBasicPolicy = `当社は「お客様の貨物と運転者の命を共に守る」を方針とし、交通労働災害と荷役災害ゼロを目指す。改善基準告示の確実な遵守、点呼・運行管理の徹底、SASスクリーニング、荷役作業の安全手順遵守を通じて、運転者が健康で安全に働ける環境を維持する。`;
