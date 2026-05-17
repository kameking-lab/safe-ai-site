import type { CheckupRule } from "@/types/health-checkup";

/**
 * General annual health checkup. Required for all workers; the at-hire
 * version under 安衛則第43条, the periodic version under 安衛則第44条.
 */
export const GENERAL_CHECKUP_RULES: CheckupRule[] = [
  {
    id: "general-at-hire",
    type: "general",
    title: "雇入時の健康診断",
    shortDescription:
      "常時使用する労働者を雇い入れる際に実施する健康診断（常時使用＝1年以上雇用見込み・週所定労働時間が通常労働者の4分の3以上が目安）。",
    trigger: { unconditional: true },
    frequency: {
      atHire: true,
      intervalMonths: 12,
      humanReadable: "雇入時に1回（医師判断で省略可の項目あり）",
    },
    testItems: {
      mandatory: [
        "既往歴及び業務歴の調査",
        "自覚症状及び他覚症状の有無の検査",
        "身長、体重、腹囲、視力及び聴力の検査",
        "胸部エックス線検査",
        "血圧の測定",
        "貧血検査（血色素量・赤血球数）",
        "肝機能検査（GOT・GPT・γ-GTP）",
        "血中脂質検査（LDL/HDLコレステロール・中性脂肪）",
        "血糖検査",
        "尿検査（糖・蛋白）",
        "心電図検査",
      ],
      omissible: ["胸部エックス線（直近で別途実施があり医師が不要と判断した場合）"],
    },
    relatedLaw: {
      name: "労働安全衛生規則",
      articles: ["第43条"],
      summary:
        "事業者は常時使用する労働者を雇い入れたときに、医師による健康診断を実施しなければならない。検査項目は11項目で医師判断による省略規定がある。",
    },
    notes: [
      "雇入前3か月以内の健診結果書面の提出で代替可（同等の検査項目を満たす場合）。",
      "短期パート・有期雇用でも更新で1年超見込みになる時点で対象になりうる。",
    ],
  },
  {
    id: "general-periodic",
    type: "general",
    title: "定期健康診断",
    shortDescription:
      "常時使用する労働者に対し、1年以内ごとに1回、定期的に実施する健康診断。",
    trigger: { unconditional: true },
    frequency: {
      atHire: false,
      intervalMonths: 12,
      humanReadable: "1年以内ごとに1回（医師判断で省略可の項目あり）",
    },
    testItems: {
      mandatory: [
        "既往歴及び業務歴の調査",
        "自覚症状及び他覚症状の有無の検査",
        "身長、体重、腹囲、視力及び聴力の検査",
        "胸部エックス線検査・喀痰検査",
        "血圧の測定",
        "貧血検査（血色素量・赤血球数）",
        "肝機能検査（GOT・GPT・γ-GTP）",
        "血中脂質検査（LDL/HDLコレステロール・中性脂肪）",
        "血糖検査",
        "尿検査（糖・蛋白）",
        "心電図検査",
      ],
      omissible: [
        "身長（20歳以上）",
        "腹囲（40歳未満等の一定条件）",
        "胸部エックス線（40歳未満で一定条件を満たす場合）",
        "貧血・肝機能・血中脂質・血糖・心電図（35歳・40歳以外で医師判断）",
      ],
    },
    relatedLaw: {
      name: "労働安全衛生規則",
      articles: ["第44条"],
      summary:
        "事業者は常時使用する労働者に対し、1年以内ごとに1回、定期に健康診断を実施しなければならない。医師判断による項目省略の規定が複数ある。",
    },
    notes: [
      "結果は健診後遅滞なく労働者へ通知、所見ありは医師の意見聴取・就業上の措置検討が必須（安衛法第66条の4・第66条の5）。",
      "常時50人以上の事業場は所轄労基署へ定期健康診断結果報告書の提出義務（様式第6号）。",
    ],
  },
];
