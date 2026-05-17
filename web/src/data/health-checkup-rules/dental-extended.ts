import type { CheckupRule } from "@/types/health-checkup";

/**
 * Dental-special health checkup — extended rows.
 *
 * The base rule in `./dental-special.ts` covers all 安衛則第48条 substances in
 * a single row. This file adds substance-specific rows for the two acids
 * whose dental presentation differs materially from generic 酸蝕症
 * screening — フッ化水素 (fluorosis / 顎骨壊死) and 黄りん (phossy jaw /
 * 顎骨壊死). The 特化則 (chemical regulation) also covers these substances
 * with non-dental checks, so the engine fires both rows when relevant.
 */
export const DENTAL_EXTENDED_CHECKUP_RULES: CheckupRule[] = [
  {
    id: "dental-fluoride-checkup",
    type: "dental-special",
    title: "フッ化水素 歯科医師健康診断",
    shortDescription:
      "フッ化水素・フッ化水素酸のガス・蒸気・粉じんを発する業務に常時従事する労働者に対する歯科医師健診。歯のフッ素症（斑状歯）・顎骨硬化症をスクリーニング。",
    trigger: { substances: ["hydrofluoric-acid", "dental-acid"] },
    frequency: {
      atHire: true,
      intervalMonths: 6,
      humanReadable: "雇入時・配置替え時および6か月以内ごとに1回",
    },
    testItems: {
      mandatory: [
        "業務の経歴の調査",
        "フッ化水素による既往歴・自覚症状の調査（皮膚熱傷・呼吸器症状）",
        "歯・歯肉・口腔粘膜の検査",
        "斑状歯・歯のフッ素症の有無の確認",
        "顎骨硬化症の臨床所見の確認",
      ],
      omissible: ["パノラマエックス線写真（医師判断による2次健診）"],
    },
    relatedLaw: {
      name: "労働安全衛生規則",
      articles: ["第48条"],
      summary:
        "フッ化水素のガス・蒸気・粉じんを発する業務に常時従事する者には、歯科医師による健診を雇入時・配置替え時・6か月以内ごとに実施。特化則第2類物質としての特殊健診と併行で運用。",
    },
    notes: [
      "皮膚接触で重度の化学熱傷・低カルシウム血症のリスクがあるため緊急時の対応（グルコン酸カルシウム軟膏）も併せて確認。",
      "結果報告は事業場の規模に関わらず労基署提出義務（様式第6号の2）。",
    ],
  },
  {
    id: "dental-phosphorus-checkup",
    type: "dental-special",
    title: "黄りん（白リン） 歯科医師健康診断",
    shortDescription:
      "黄りんを取扱う業務に常時従事する労働者を対象とする歯科医師健診。黄りん中毒症の顎骨壊死（phossy jaw）をスクリーニング。",
    trigger: { substances: ["phosphorus-yellow", "dental-acid"] },
    frequency: {
      atHire: true,
      intervalMonths: 6,
      humanReadable: "雇入時・配置替え時および6か月以内ごとに1回",
    },
    testItems: {
      mandatory: [
        "業務の経歴の調査",
        "黄りんによる既往歴・自覚症状の調査",
        "歯・歯肉・口腔粘膜の検査",
        "顎骨壊死の臨床所見の確認（瘻孔・骨露出）",
        "歯科パノラマ又はデンタル写真（医師判断時）",
      ],
    },
    relatedLaw: {
      name: "労働安全衛生規則",
      articles: ["第48条"],
      summary:
        "黄りんを取扱う業務に常時従事する者には、歯科医師による健診を雇入時・配置替え時・6か月以内ごとに実施。歴史的に「燐顎症（phossy jaw）」として知られる顎骨壊死を早期発見する。",
    },
    notes: [
      "黄りん業務は現代では花火・特殊化学・歴史的な軍需用途等に限定されるが、密閉化と排気が不十分な場面で重度のばく露事案が報告されている。",
      "顎骨壊死は不可逆性で抗菌薬・外科治療を要するため、瘻孔・骨露出の初発所見を確実に把握する。",
    ],
  },
];
