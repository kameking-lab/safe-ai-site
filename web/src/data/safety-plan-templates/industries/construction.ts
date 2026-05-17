/**
 * 建設業 / Construction.
 *
 * High-risk industry with 墜落・転落 as the leading cause of fatal accidents.
 * Multi-employer worksites trigger 統括安全衛生責任者 / 元方安全衛生管理者 duties.
 */

import type {
  CircularReference,
  LawReference,
  MonthIndex,
  MonthlyEvent,
  SafetyGoal,
  SafetyMeasure,
} from "@/types/safety-plan";

export const constructionIndustryGoals: SafetyGoal[] = [
  {
    category: "accident-reduction",
    title: "墜落・転落災害ゼロ",
    description:
      "高さ2m以上の作業における墜落・転落災害を起こさない。フルハーネス型墜落制止用器具・親綱・手すり・作業床の三点対策を徹底する。",
    target: "墜落・転落災害 0件",
    kpi: "墜落・転落災害発生件数 / 高所作業件数",
  },
  {
    category: "accident-reduction",
    title: "重機・建設機械災害ゼロ",
    description:
      "クレーン・移動式クレーン・ドラグショベル等の機械災害を起こさない。誘導者の配置・立入禁止区画・合図統一を徹底する。",
    target: "建設機械災害 0件",
    kpi: "建設機械関連災害件数 / 機械稼働延べ日数",
  },
];

export const constructionIndustryMeasures: SafetyMeasure[] = [
  {
    category: "industry-specific",
    title: "新規入場者教育",
    description:
      "新規入場時に、作業所のルール・連絡体制・避難経路・喫煙場所・KYボード運用・保護具着用基準を教育し、教育記録を保存する。",
    frequency: "新規入場の都度",
    responsible: "現場代理人 / 安全担当",
    reference: "安衛則第642条の3",
  },
  {
    category: "industry-specific",
    title: "墜落制止用器具（フルハーネス型）の使用と特別教育",
    description:
      "高さ2m以上で作業床を設けることが困難な場合はフルハーネス型を使用。胴ベルト型からの切替対象作業者には特別教育を実施する。",
    frequency: "新規対象者の都度 / 器具点検は毎日始業前",
    responsible: "職長 / 安全担当",
    reference: "安衛則第36条第41号 / 第518条〜第521条",
  },
  {
    category: "industry-specific",
    title: "足場の組立て等の作業に係る点検",
    description:
      "足場の組立て・解体・変更後、強風・大雨・地震後、つり足場の作業日ごとの始業前に点検し、点検記録を作業終了まで保存する。",
    frequency: "組立・変更後 / 悪天候後 / つり足場は毎日始業前",
    responsible: "足場の組立て等作業主任者",
    reference: "安衛則第567条〜第568条",
  },
  {
    category: "industry-specific",
    title: "石綿（アスベスト）事前調査",
    description:
      "解体・改修工事を行う場合、事前調査結果の電子報告（石綿事前調査結果報告システム）と作業計画・作業届・記録の保存を実施する。",
    frequency: "解体・改修工事の都度",
    responsible: "石綿作業主任者 / 工事責任者",
    reference: "石綿障害予防規則第3条〜第4条の2",
  },
  {
    category: "industry-specific",
    title: "店社安全衛生管理者・統括安全衛生責任者の選任（特定元方）",
    description:
      "特定元方事業者として、関係請負人の作業の混在による災害を防止するため、統括安全衛生責任者を選任し、協議組織の設置・作業間の連絡調整・作業場所の巡視を実施する。",
    frequency: "工事着工時",
    responsible: "事業者",
    reference: "安衛法第15条〜第15条の3",
  },
];

export const constructionMonthlyExtras: Partial<Record<MonthIndex, MonthlyEvent[]>> = {
  3: [
    {
      title: "墜落・転落災害防止重点期間",
      category: "industry-specific",
      description:
        "厚労省「STOP！転落災害プロジェクト」に呼応し、足場・開口部・はしご・脚立の総点検と研修を強化する。",
      required: false,
    },
  ],
  4: [
    {
      title: "建設業労働災害防止大会・春の安全大会",
      category: "education",
      description:
        "建災防主催の大会参加と、自社の安全大会開催。年度方針と重点目標を全現場・全協力会社に周知する。",
      required: false,
    },
  ],
  6: [
    {
      title: "全国安全週間 建設業特別取組",
      category: "industry-specific",
      description:
        "経営トップ現場巡視、足場・開口部の全数点検、フルハーネス使用状況確認、職長会の意見交換会を実施。",
      required: false,
    },
  ],
  7: [
    {
      title: "夏季の熱中症 屋外作業対策",
      category: "industry-specific",
      description:
        "WBGT測定の見える化、休憩時間延長、暑熱順化計画、空調服・冷却タオル支給、塩飴・経口補水液の常備を徹底する。",
      reference: "安衛則第612条の2",
      required: true,
    },
  ],
  10: [
    {
      title: "年末工期繁忙期に向けた重点取組",
      category: "industry-specific",
      description:
        "工期逼迫による無理な作業を防ぐため、職長会・元請打合せで工程レビューを強化する。",
      required: false,
    },
  ],
  12: [
    {
      title: "年末・年始無災害運動",
      category: "industry-specific",
      description:
        "12/15〜1/15を「年末年始無災害運動」期間として安全宣言の掲示・標語・職長会発表会を実施。",
      required: false,
    },
  ],
};

export const constructionLawReferences: LawReference[] = [
  {
    name: "労働安全衛生法（建設業関連）",
    articles: [
      "第15条〜第15条の3（統括安全衛生責任者等）",
      "第29条（元方事業者の講ずべき措置）",
      "第30条（特定元方事業者の講ずべき措置）",
      "第88条（計画の届出）",
    ],
    summary:
      "重層下請構造に対応した元方事業者の責務、計画届対象工事、統括安全衛生責任者等の選任を定める。",
  },
  {
    name: "労働安全衛生規則（建設業関連）",
    articles: [
      "第518条〜第533条（墜落等による危険の防止）",
      "第564条〜第575条（足場）",
      "第642条の3（新規入場者教育）",
    ],
    summary:
      "建設業に多発する墜落・足場・型枠・掘削等の作業ごとに具体的な防止措置を定める。",
  },
  {
    name: "石綿障害予防規則",
    articles: ["第3条〜第4条の2（事前調査等）", "第6条（解体等の業務に係る措置）"],
    summary:
      "建物の解体・改修工事における石綿の事前調査・作業基準・電子報告義務を定める。",
  },
];

export const constructionCircularReferences: CircularReference[] = [
  {
    number: "基発0331第6号",
    date: "2024-03-31",
    title: "建設業における墜落・転落災害防止のための措置の徹底について",
  },
  {
    number: "基発0419第1号",
    date: "2023-04-19",
    title: "石綿障害予防規則の改正に伴う事前調査結果の報告について",
  },
];

export const constructionBasicPolicy = `当社は「全ての労働者が無事に帰宅できる現場づくり」を最重要課題とし、墜落・転落および建設機械災害ゼロを目指す。元請・協力会社が一体となり、リスクアセスメントに基づく工事計画、フルハーネスの正しい使用、足場・開口部の確実な保護、KY活動の定着、そして職長を中心とした自主的安全衛生管理を推進する。`;
