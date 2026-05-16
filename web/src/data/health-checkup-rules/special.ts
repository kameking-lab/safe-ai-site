import type { CheckupRule } from "@/types/health-checkup";

/**
 * Special health checkups (特殊健康診断) keyed by hazardous-substance regulation.
 *
 * Each rule is structured so the engine can fire it from a substance trigger
 * (e.g. selecting "organic-solvent" on the worker profile). The frequency is
 * "at hire / job-change / every six months" across these regulations, with
 * the exception of asbestos which is annual after exposure ends.
 */
export const SPECIAL_CHECKUP_RULES: CheckupRule[] = [
  {
    id: "organic-solvent-checkup",
    type: "special",
    title: "有機溶剤等健康診断",
    shortDescription:
      "有機則第29条で定める第1類・第2類有機溶剤を取扱う業務に常時従事する労働者を対象。配置替え時および6か月以内ごとに1回。",
    trigger: { substances: ["organic-solvent"] },
    frequency: {
      atHire: true,
      intervalMonths: 6,
      humanReadable: "雇入時・配置替え時および6か月以内ごとに1回",
    },
    testItems: {
      mandatory: [
        "業務の経歴の調査",
        "有機溶剤による健康障害の既往歴の有無の調査",
        "有機溶剤による自覚症状又は他覚症状の有無の検査",
        "尿中の蛋白の有無の検査",
        "対象溶剤に応じた尿中代謝物の検査（例: トルエン→馬尿酸、キシレン→メチル馬尿酸）",
        "貧血検査（医師が必要と認める場合）",
        "肝機能検査（GOT・GPT・γ-GTP）",
      ],
    },
    relatedLaw: {
      name: "有機溶剤中毒予防規則",
      articles: ["第29条"],
      summary:
        "屋内作業場等で第1類・第2類有機溶剤の業務に常時従事する者には、雇入時・配置替え時・6か月以内ごとに健康診断を実施し、特殊健康診断結果報告書を所轄労基署へ提出する。",
    },
    notes: [
      "対象溶剤ごとに尿中代謝物の指標と判定区分が定められている（基発0331等）。",
      "結果は5年間保存。事業場規模を問わず特殊健診結果報告書（様式第3号の2）の提出が必要。",
    ],
  },
  {
    id: "specified-chemical-checkup",
    type: "special",
    title: "特定化学物質健康診断",
    shortDescription:
      "特化則別表第1・第2に掲げる特定化学物質（第1類・第2類・第3類のうち定められたもの）を取扱う業務に常時従事する労働者が対象。物質ごとに項目・頻度が異なる。",
    trigger: {
      substances: [
        "specified-chemical",
        "welding-fume",
        "chromium",
        "cadmium",
        "manganese",
        "nickel",
        "benzene",
        "vinyl-chloride",
        "isocyanate",
        "formaldehyde",
        "dichloromethane",
        "mercury",
      ],
    },
    frequency: {
      atHire: true,
      intervalMonths: 6,
      humanReadable:
        "雇入時・配置替え時および6か月以内ごとに1回（物質により1次・2次健診）",
    },
    testItems: {
      mandatory: [
        "業務の経歴の調査",
        "対象化学物質による既往歴・自覚症状の調査",
        "物質ごとに告示で定める検査項目（例: クロムは鼻腔・皮膚、ベンゼンは血液像、塩ビは肝機能、ホルムアルデヒドは眼・気道刺激症状）",
        "尿検査（糖・蛋白）",
      ],
      omissible: ["1次健診結果に応じた2次健診項目（医師判断で必要時）"],
    },
    relatedLaw: {
      name: "特定化学物質障害予防規則",
      articles: ["第39条", "第40条", "第41条", "第42条"],
      summary:
        "特定化学物質を取扱う業務に常時従事する者には、雇入時・配置替え時・6か月以内ごとに健診を実施。検査項目は物質ごとに告示で定められ、結果は健康診断個人票として最低7年（特別管理物質は30年）保存。",
    },
    notes: [
      "石綿・ベリリウム・コークス炉等は特別管理物質として30年保存義務。",
      "健診結果は所轄労基署へ報告（規模問わず特殊健診結果報告書を提出）。",
      "従事終了後も健康管理手帳交付対象物質（ベンゼン・塩ビ・クロム酸等）は離職後も健診を継続する。",
    ],
  },
  {
    id: "lead-checkup",
    type: "special",
    title: "鉛健康診断",
    shortDescription:
      "鉛則第53条で定める鉛業務（鉛精錬・電池製造・鉛蓄電池解体等）に常時従事する労働者が対象。",
    trigger: { substances: ["lead"] },
    frequency: {
      atHire: true,
      intervalMonths: 6,
      humanReadable: "雇入時・配置替え時および6か月以内ごとに1回",
    },
    testItems: {
      mandatory: [
        "業務の経歴の調査",
        "作業条件の調査",
        "鉛による自覚症状・他覚症状の検査",
        "血液中の鉛量の検査",
        "尿中のデルタアミノレブリン酸（δ-ALA）量の検査",
      ],
      omissible: ["医師判断で省略可：血液中の鉛量（短期従事者）等"],
    },
    relatedLaw: {
      name: "鉛中毒予防規則",
      articles: ["第53条"],
      summary:
        "鉛業務に常時従事する者には、雇入時・配置替え時・6か月以内ごとに健診を実施。血中鉛・尿中δ-ALAが法定指標。",
    },
    notes: [
      "判定基準は告示（昭和55年労働省告示第64号）に従う。",
      "鉛蓄電池解体・はんだ使用業務も対象になりうるため、作業実態の調査を行う。",
    ],
  },
  {
    id: "tetra-alkyl-lead-checkup",
    type: "special",
    title: "四アルキル鉛健康診断",
    shortDescription:
      "四アルキル鉛則第22条で定める四アルキル鉛業務に常時従事する労働者が対象。",
    trigger: { substances: ["tetra-alkyl-lead"] },
    frequency: {
      atHire: true,
      intervalMonths: 6,
      humanReadable: "雇入時・配置替え時および6か月以内ごとに1回",
    },
    testItems: {
      mandatory: [
        "業務歴及び既往歴の調査",
        "自覚症状の有無の検査",
        "他覚症状（不眠、悪夢、頭痛、精神症状等）の検査",
        "血液中の鉛量・尿中δ-ALA量の検査",
      ],
    },
    relatedLaw: {
      name: "四アルキル鉛中毒予防規則",
      articles: ["第22条"],
      summary:
        "四アルキル鉛業務に常時従事する者には、雇入時・配置替え時・6か月以内ごとに健診を実施。中枢神経症状を含むスクリーニングを行う。",
    },
  },
  {
    id: "high-pressure-checkup",
    type: "special",
    title: "高気圧業務健康診断",
    shortDescription:
      "高気圧則第38条で定める高圧室内業務・潜水業務に常時従事する労働者が対象。",
    trigger: { workConditions: ["high-pressure-work"] },
    frequency: {
      atHire: true,
      intervalMonths: 6,
      humanReadable: "雇入時・配置替え時および6か月以内ごとに1回",
    },
    testItems: {
      mandatory: [
        "既往歴及び高気圧業務歴の調査",
        "関節痛、腰痛、四肢のしびれ等の自覚症状の検査",
        "耳鼻咽喉科学的検査（鼓膜・聴力）",
        "肺活量・心電図検査",
        "血圧・尿検査",
      ],
      omissible: ["医師判断で項目の省略可"],
    },
    relatedLaw: {
      name: "高気圧作業安全衛生規則",
      articles: ["第38条"],
      summary:
        "高圧室内業務・潜水業務に常時従事する者には、雇入時・配置替え時・6か月以内ごとに健診を実施。減圧症・骨壊死・耳鼻咽喉科症状のスクリーニングを行う。",
    },
    notes: [
      "潜水士は高圧則第12条で再圧室での治療体制が要件、所定の健診と併せて評価する。",
    ],
  },
  {
    id: "asbestos-post-employment",
    type: "special",
    title: "石綿健康診断",
    shortDescription:
      "石綿則第40条で定める石綿等を取扱う業務に常時従事する労働者・過去に従事した離職者が対象。離職後も健康管理手帳により継続。",
    trigger: {
      substances: ["asbestos"],
      workConditions: ["asbestos-handling-past"],
    },
    frequency: {
      atHire: true,
      intervalMonths: 6,
      humanReadable:
        "雇入時・配置替え時・6か月以内ごとに1回。離職後は健康管理手帳に基づき年1回。",
    },
    testItems: {
      mandatory: [
        "業務の経歴の調査（石綿ばく露歴）",
        "石綿による疾病の既往歴の調査",
        "せき・たん・息切れ等の自覚症状の検査",
        "胸部エックス線直接撮影による検査",
      ],
      omissible: [
        "胸部らせんCT・喀痰細胞診（医師が必要と認めた場合に追加）",
      ],
    },
    relatedLaw: {
      name: "石綿障害予防規則",
      articles: ["第40条", "第41条"],
      summary:
        "石綿等を取扱う業務に常時従事する者・過去に従事した者は、雇入時・配置替え時・6か月以内ごとに健診を実施。健康診断個人票は40年保存。離職後は健康管理手帳の対象。",
    },
    notes: [
      "石綿は健康管理手帳交付対象（離職後の継続フォロー）。",
      "個人票の保存期間は40年と長期。法改正履歴に注意。",
    ],
  },
];
