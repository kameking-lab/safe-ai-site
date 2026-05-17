import type { CheckupRule } from "@/types/health-checkup";

/**
 * Overseas dispatched worker health checkup (海外派遣労働者の健康診断).
 *
 * Governed by 安衛則第45条の2. Triggered when the employer dispatches a
 * worker overseas for 6 months or more (pre-dispatch) and when the worker
 * returns from such a dispatch (post-dispatch). Both rows are event-driven
 * (intervalMonths = 0); the scheduler optimizer surfaces them in a separate
 * "随時実施" section.
 */
export const OVERSEAS_CHECKUP_RULES: CheckupRule[] = [
  {
    id: "overseas-dispatch-pre",
    type: "overseas",
    title: "海外派遣前 健康診断",
    shortDescription:
      "事業者が労働者を本邦外の地域に6か月以上派遣しようとするときに、派遣前に実施しなければならない健康診断（安衛則第45条の2第1項）。",
    trigger: { workConditions: ["overseas-dispatch-6m"] },
    frequency: {
      atHire: false,
      intervalMonths: 0,
      humanReadable: "6か月以上の海外派遣前に1回（派遣決定後、派遣前に実施）",
      eventDriven: true,
    },
    testItems: {
      mandatory: [
        "既往歴及び業務歴の調査",
        "自覚症状及び他覚症状の有無の検査",
        "身長、体重、視力、聴力の検査",
        "胸部エックス線・喀痰検査",
        "血圧の測定",
        "貧血検査・肝機能検査・血中脂質検査・血糖検査",
        "尿検査（糖・蛋白）",
        "心電図検査",
        "腹部画像検査（医師が必要と認める場合）",
        "血液型検査・B型肝炎ウイルス抗体検査・糞便検査（医師が必要と認める場合）",
        "腹囲又はBMIの測定",
      ],
      omissible: [
        "派遣先の感染症リスクに応じた追加検査（マラリア・デング熱等の流行地域）",
      ],
    },
    relatedLaw: {
      name: "労働安全衛生規則",
      articles: ["第45条の2第1項"],
      summary:
        "事業者は、労働者を本邦外の地域に6か月以上派遣しようとするときは、当該労働者に対し、派遣前に医師による健康診断を行わなければならない（一般健診項目に派遣特有の追加項目を加える）。",
    },
    notes: [
      "派遣先国の感染症・予防接種ガイドラインに従い、健診と並行で必要なワクチネーション（A・B型肝炎、破傷風、狂犬病、黄熱等）を実施。",
      "派遣前に問題所見が出た場合は派遣の可否を産業医・本人と協議のうえ判断する。",
    ],
  },
  {
    id: "overseas-dispatch-post",
    type: "overseas",
    title: "海外派遣後 健康診断",
    shortDescription:
      "事業者が労働者を本邦外の地域に6か月以上派遣した労働者を本邦の地域に帰任させたときに実施しなければならない健康診断（安衛則第45条の2第2項）。",
    trigger: { workConditions: ["overseas-dispatch-6m"] },
    frequency: {
      atHire: false,
      intervalMonths: 0,
      humanReadable: "6か月以上の海外派遣の終了（帰国）後に1回",
      eventDriven: true,
    },
    testItems: {
      mandatory: [
        "既往歴及び業務歴の調査（派遣中の業務内容・派遣先の衛生状況の確認）",
        "自覚症状及び他覚症状の有無の検査",
        "身長、体重、視力、聴力の検査",
        "胸部エックス線・喀痰検査",
        "血圧の測定",
        "貧血検査・肝機能検査・血中脂質検査・血糖検査",
        "尿検査（糖・蛋白）",
        "心電図検査",
        "腹部画像検査（医師が必要と認める場合）",
        "血液型・B型肝炎ウイルス抗体・糞便検査（医師が必要と認める場合）",
      ],
      omissible: [
        "渡航先固有の感染症スクリーニング（マラリア血液塗抹・寄生虫便検査等）",
      ],
    },
    relatedLaw: {
      name: "労働安全衛生規則",
      articles: ["第45条の2第2項"],
      summary:
        "事業者は、本邦外の地域に6か月以上派遣した労働者を本邦の地域に帰任させたとき（再度6か月以上派遣する場合を除く）、当該労働者に対し、帰任後に医師による健康診断を行わなければならない。",
    },
    notes: [
      "再派遣の場合は派遣後健診を省略可能だが、感染症スクリーニング等は実態に応じて実施を検討する。",
      "メンタルヘルスへの影響（再適応・逆カルチャーショック）も併せて評価。",
    ],
  },
];
