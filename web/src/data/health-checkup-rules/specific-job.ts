import type { CheckupRule } from "@/types/health-checkup";

/**
 * Specific-job worker health checkup (特定業務従事者の健康診断).
 *
 * Under 安衛則第45条, workers engaged in any of the 14 task categories listed
 * in 安衛則第13条第1項第3号 must receive a periodic checkup every six months
 * (twice per fiscal year). The checkup items overlap with the general checkup,
 * with chest X-ray and sputum allowed at annual cadence.
 */
export const SPECIFIC_JOB_CHECKUP_RULES: CheckupRule[] = [
  {
    id: "specific-job-checkup",
    type: "specific-job",
    title: "特定業務従事者の健康診断",
    shortDescription:
      "深夜業・暑熱・寒冷・騒音・振動・粉じん・坑内・電離放射線・高圧・重量物取扱い等の特定業務に常時従事する労働者を対象とする健診（6か月以内ごと）。",
    trigger: {
      workConditions: [
        "night-work",
        "hot-work",
        "cold-work",
        "noise-work",
        "vibration-work",
        "radiation-work",
        "high-pressure-work",
        "dust-work",
        "manual-handling",
        "underground-work",
        "deep-night-driver",
      ],
    },
    frequency: {
      atHire: true,
      intervalMonths: 6,
      humanReadable:
        "配置替えの際および6か月以内ごとに1回（胸部エックス線・喀痰検査は1年以内ごと）",
    },
    testItems: {
      mandatory: [
        "既往歴及び業務歴の調査",
        "自覚症状及び他覚症状の有無の検査",
        "身長、体重、腹囲、視力及び聴力の検査",
        "血圧の測定",
        "貧血検査（血色素量・赤血球数）",
        "肝機能検査（GOT・GPT・γ-GTP）",
        "血中脂質検査",
        "血糖検査",
        "尿検査（糖・蛋白）",
        "心電図検査",
      ],
      omissible: [
        "胸部エックス線・喀痰検査（1年以内ごとに1回でよい）",
        "身長（20歳以上）",
      ],
    },
    relatedLaw: {
      name: "労働安全衛生規則",
      articles: ["第45条", "第13条第1項第3号"],
      summary:
        "特定業務（14区分）に常時従事する労働者には配置替え時および6か月以内ごとに健診を実施する。対象業務は深夜業・坑内・暑熱・寒冷・粉じん・電離放射線・振動・騒音・高圧・重量物取扱い等を含む。",
    },
    notes: [
      "深夜業従事者は本人の自発的健診を受診し提出した場合の費用負担・就業上の措置に関するガイドラインがある（平成12年告示）。",
      "対象業務該当性は所定労働時間の比率や反復性で判断される。台帳・配置記録で根拠を残すこと。",
    ],
  },
];
