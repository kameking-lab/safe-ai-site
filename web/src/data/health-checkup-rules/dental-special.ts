import type { CheckupRule } from "@/types/health-checkup";

/**
 * Dental special health checkup (歯科特殊健康診断) under 安衛則第48条.
 *
 * Required for workers handling acid mists, halogen acids, etc. that
 * cause dental erosion (酸蝕症). The 2022 amendment removed the 50-employee
 * threshold for the result-reporting obligation, so even a single covered
 * worker now triggers a 様式第6号の2 報告書 submission.
 */
export const DENTAL_SPECIAL_CHECKUP_RULES: CheckupRule[] = [
  {
    id: "dental-special-checkup",
    type: "dental-special",
    title: "歯科医師による特殊健康診断",
    shortDescription:
      "塩酸・硝酸・硫酸・亜硫酸・フッ化水素・黄りんその他歯やその支持組織に有害な物のガス・蒸気・粉じんを発する業務に常時従事する労働者を対象。",
    trigger: { substances: ["dental-acid"] },
    frequency: {
      atHire: true,
      intervalMonths: 6,
      humanReadable: "雇入時・配置替え時および6か月以内ごとに1回",
    },
    testItems: {
      mandatory: [
        "業務の経歴の調査",
        "酸蝕症その他歯・口腔の健康障害の既往歴の調査",
        "歯・口腔の自覚症状の検査",
        "歯・歯肉・口腔粘膜・歯列・咬合の検査",
        "酸蝕症の有無に関する歯科医師の所見",
      ],
    },
    relatedLaw: {
      name: "労働安全衛生規則",
      articles: ["第48条"],
      summary:
        "塩酸・硝酸・硫酸・亜硫酸・フッ化水素・黄りん等のガス・蒸気・粉じんを発する業務に常時従事する者には、歯科医師による健康診断を雇入時・配置替え時・6か月以内ごとに実施する。",
    },
    notes: [
      "令和4年10月1日施行の改正により、事業場の規模にかかわらず歯科医師による健診結果報告書（様式第6号の2）の所轄労基署への提出が必要となった。",
      "結果は5年間保存（健康診断個人票）。",
    ],
  },
];
