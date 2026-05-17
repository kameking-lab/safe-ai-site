import type { CheckupRule } from "@/types/health-checkup";

/**
 * Silicosis (じん肺) health checkup. Governed by じん肺法 (1960) and its
 * enforcement regulations rather than the 安衛則. Frequency depends on
 * the worker's じん肺管理区分 (administrative classification 1–4).
 */
export const SILICOSIS_CHECKUP_RULES: CheckupRule[] = [
  {
    id: "silicosis-checkup",
    type: "silicosis",
    title: "じん肺健康診断",
    shortDescription:
      "じん肺法施行規則別表に掲げる粉じん作業に常時従事する労働者・従事したことのある労働者が対象。じん肺管理区分により頻度が異なる。",
    trigger: {
      substances: ["silica-dust", "asbestos"],
      workConditions: ["dust-work"],
    },
    frequency: {
      atHire: true,
      intervalMonths: 12,
      humanReadable:
        "就業時健診（粉じん作業就業時）／定期健診は管理区分により1〜3年に1回（管理1：3年、管理2・3：1年）",
    },
    testItems: {
      mandatory: [
        "粉じん作業歴の調査",
        "じん肺の自覚症状・他覚症状の有無の検査",
        "胸部エックス線直接撮影による検査",
        "胸部に関する臨床検査（必要時）",
        "肺機能検査（管理区分により実施）",
      ],
      omissible: [
        "結核精密検査・心肺機能検査（管理区分に応じ追加）",
      ],
    },
    relatedLaw: {
      name: "じん肺法",
      articles: ["第7条", "第8条", "第9条", "第11条"],
      summary:
        "粉じん作業に従事する者は、就業時・定期・離職時・有所見者の定期外健診の4種を実施。胸部エックス線写真と症状からじん肺管理区分（管理1〜4）を都道府県労働局長が決定する。",
    },
    notes: [
      "管理区分2以上は粉じんばく露の継続によりじん肺症の進展リスクがあるため作業転換の検討対象。",
      "離職時に労働者が請求した場合は離職時健診を実施し、健康管理手帳を交付（じん肺法第10条）。",
      "個人票はじん肺法施行規則により7年間保存（管理区分決定通知書も含む）。",
    ],
  },
];
