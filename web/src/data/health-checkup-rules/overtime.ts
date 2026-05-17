import type { CheckupRule } from "@/types/health-checkup";

/**
 * Overtime / long-hour worker medical interview (長時間労働者の医師面接指導).
 *
 * Governed by 安衛法第66条の8 (and 第66条の8の2 for research/development
 * workers, 第66条の8の4 for the high-degree-professional system). Triggered
 * when the worker's monthly overtime hours exceed the statutory threshold
 * AND the worker manifests fatigue or applies for the interview, so we
 * treat it as event-driven (intervalMonths = 0) and surface it under the
 * "随時実施" bucket in the optimizer rather than a fixed calendar slot.
 */
export const OVERTIME_CHECKUP_RULES: CheckupRule[] = [
  {
    id: "overtime-medical-interview",
    type: "overtime",
    title: "長時間労働者の医師による面接指導",
    shortDescription:
      "時間外・休日労働が月80時間を超え、疲労の蓄積が認められる労働者が申し出た場合に、医師による面接指導を実施する義務（労働安全衛生法第66条の8）。",
    trigger: { workConditions: ["overtime-80h", "night-work"] },
    frequency: {
      atHire: false,
      intervalMonths: 0,
      humanReadable:
        "時間外労働 月80時間超かつ申出があった労働者に対し、申出後遅滞なく実施（随時）",
      eventDriven: true,
    },
    testItems: {
      mandatory: [
        "勤務状況の確認（時間外・休日労働時間、深夜業の頻度）",
        "疲労蓄積度の確認（自覚症状、睡眠、生活習慣）",
        "心身の状況の確認（抑うつ症状・自殺念慮・身体症状）",
        "他の業務上の心理的負荷・職場環境要因の聴取",
        "面接結果に基づく就業上の措置（労働時間短縮・配置転換・受診勧奨）の意見書作成",
      ],
      omissible: [
        "面接後の追加検査（必要に応じ医師判断で実施）",
      ],
    },
    relatedLaw: {
      name: "労働安全衛生法",
      articles: ["第66条の8", "第66条の8の2", "第66条の8の3", "第66条の8の4"],
      summary:
        "事業者は、時間外・休日労働が1か月あたり80時間を超え、疲労の蓄積が認められる労働者が申し出た場合、医師による面接指導を実施しなければならない。研究開発業務・高度プロフェッショナル制度該当者には別途、申出を要件としない実施義務がある。",
    },
    notes: [
      "面接指導の記録は5年間保存（労働安全衛生規則第52条の6）。",
      "研究開発業務従事者は月100時間超で本人申出なしでも面接指導が義務（安衛法第66条の8の2）。",
      "高度プロフェッショナル制度対象労働者は健康管理時間が1週間あたり40時間を超えた時間が月100時間を超えた場合に本人申出なしで面接指導が義務（安衛法第66条の8の4）。",
      "労働時間状況の客観的把握（PC ログオン記録等）が前提（安衛法第66条の8の3、平成31年4月施行）。",
    ],
  },
];
