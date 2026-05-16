import type { CheckupRule } from "@/types/health-checkup";

/**
 * Rare-metal and special-management substance health checkups
 * (特化則 特別管理物質: ベリリウム・砒素・コークス炉排出ガス 等).
 *
 * These are uncommon-but-high-consequence exposures. The 特化則第40条第2項 (and
 * 別表第3) sets the individual-record retention to 30 years for this subset.
 * They are split into their own file to make the engine output easier to
 * interpret on a per-substance basis.
 */
export const SPECIAL_RARE_METAL_CHECKUP_RULES: CheckupRule[] = [
  {
    id: "beryllium-checkup",
    type: "special",
    title: "ベリリウム・ベリリウム化合物 特殊健康診断",
    shortDescription:
      "ベリリウム及びその化合物（粉状）を取扱う業務に常時従事する労働者を対象。慢性ベリリウム症（CBD）・肺がんをスクリーニング。",
    trigger: { substances: ["beryllium"] },
    frequency: {
      atHire: true,
      intervalMonths: 6,
      humanReadable: "雇入時・配置替え時および6か月以内ごとに1回",
    },
    testItems: {
      mandatory: [
        "業務の経歴の調査（ばく露年数・濃度）",
        "ベリリウムによる自覚症状（咳・息切れ・発熱・関節痛・倦怠感）の調査",
        "他覚症状の検査（皮膚炎・リンパ節腫脹）",
        "胸部エックス線検査（CBD・肺がん）",
        "肺機能検査（スパイロメトリー）",
      ],
      omissible: ["胸部CT・気管支肺胞洗浄・BeLPT（医師判断による2次健診）"],
    },
    relatedLaw: {
      name: "特定化学物質障害予防規則",
      articles: ["第39条", "第40条第2項", "別表第3"],
      summary:
        "ベリリウム及びその化合物（粉状のもの）は特化則第1類の特別管理物質。慢性ベリリウム症と肺がんのリスクが高く、健康診断個人票の保存期間は30年。",
    },
    notes: [
      "ベリリウム及びその化合物は特別管理物質。個人票の保存期間は30年。",
      "慢性ベリリウム症は数年〜数十年遅れて発症。離職後も健康管理手帳で追跡可能。",
      "セラミック・原子炉部品・特殊合金等の特殊用途業務で運用前にばく露評価を実施すること。",
    ],
  },
  {
    id: "arsenic-checkup",
    type: "special",
    title: "砒素・砒素化合物 特殊健康診断",
    shortDescription:
      "砒素及びその化合物（アルシン・三酸化砒素・水素化砒素等）を取扱う業務に常時従事する労働者を対象。皮膚がん・肺がん・末梢神経障害・肝障害をスクリーニング。",
    trigger: { substances: ["arsenic"] },
    frequency: {
      atHire: true,
      intervalMonths: 6,
      humanReadable: "雇入時・配置替え時および6か月以内ごとに1回",
    },
    testItems: {
      mandatory: [
        "業務の経歴の調査",
        "砒素による自覚症状（皮膚色素沈着・角化・末梢神経症状・倦怠感）の調査",
        "他覚症状の検査（皮膚所見・神経学的所見）",
        "尿中砒素量の検査（生物学的モニタリング）",
        "胸部エックス線検査",
        "肝機能検査（GOT・GPT・γ-GTP）",
      ],
      omissible: ["神経伝導検査（医師判断による2次健診）"],
    },
    relatedLaw: {
      name: "特定化学物質障害予防規則",
      articles: ["第39条", "第40条第2項", "別表第3"],
      summary:
        "砒素及びその化合物は特化則第2類の特別管理物質。肺がん・皮膚がん・膀胱がんのリスクから30年保存と健康管理手帳の対象。",
    },
    notes: [
      "砒素及びその化合物は特別管理物質。個人票の保存期間は30年。",
      "肺がん・皮膚がんは健康管理手帳の交付対象。離職後も健診継続。",
      "尿中砒素は採尿前24〜48時間の海産物摂取で偽陽性化するため食事の聞き取りが必要。",
    ],
  },
];
