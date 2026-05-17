import type { CheckupRule } from "@/types/health-checkup";

/**
 * Substance-specific special health checkups (特定化学物質障害予防規則 個別物質).
 *
 * The generic `specified-chemical-checkup` rule (declared in `./special.ts`)
 * covers the entire 特化則 family in one row. This file complements that with
 * substance-specific rows so the UI can show:
 *   - tailored test items (e.g. benzene → blood differential, vinyl-chloride
 *     → liver imaging, mercury → tremor / proteinuria)
 *   - the correct individual-record retention period (30 years for the
 *     "特別管理物質" subset such as benzene / vinyl-chloride / chromium /
 *     formaldehyde, 7 years otherwise) under 特化則第40条第2項
 *   -物質ごとの判定区分 references when the user has selected a single
 *     hazardous substance rather than the generic "specified-chemical" tag.
 *
 * Each rule is independent — the engine will fire the generic rule AND the
 * substance-specific rule when both triggers match. The result UI handles
 * deduplication via the dedupRequired() helper in the optimizer.
 */
export const SPECIAL_SUBSTANCE_SPECIFIC_CHECKUP_RULES: CheckupRule[] = [
  {
    id: "chromium-detailed-checkup",
    type: "special",
    title: "クロム酸・6価クロム化合物 特殊健康診断",
    shortDescription:
      "クロム酸塩・重クロム酸塩・6価クロム化合物を取扱う業務に常時従事する労働者を対象とした特化則健診。鼻中隔穿孔・皮膚潰瘍・呼吸器症状をスクリーニング。",
    trigger: { substances: ["chromium"] },
    frequency: {
      atHire: true,
      intervalMonths: 6,
      humanReadable: "雇入時・配置替え時および6か月以内ごとに1回",
    },
    testItems: {
      mandatory: [
        "業務の経歴の調査",
        "クロムによる自覚症状及び他覚症状の調査（鼻中隔・皮膚・気道）",
        "鼻腔内検査（鼻中隔穿孔・潰瘍の有無）",
        "皮膚所見の検査（皮膚潰瘍・皮膚炎）",
        "胸部エックス線検査（肺がんスクリーニング）",
        "尿検査（蛋白・潜血）",
      ],
      omissible: ["医師判断による省略項目（短期従事・低濃度作業）"],
    },
    relatedLaw: {
      name: "特定化学物質障害予防規則",
      articles: ["第39条", "第40条", "別表第3"],
      summary:
        "クロム酸塩・重クロム酸塩・6価クロム化合物等は特化則第1類または第2類の特定化学物質に該当し、業務従事者に対し雇入時・配置替え時・6か月以内ごとの健診と特別管理物質としての30年保存義務を課す。",
    },
    notes: [
      "クロム酸・重クロム酸・6価クロム化合物は特別管理物質。健康診断個人票の保存期間は30年（特化則第40条第2項）。",
      "肺がん・鼻腔がんは健康管理手帳の交付対象。離職後も追跡が必要。",
    ],
  },
  {
    id: "cadmium-detailed-checkup",
    type: "special",
    title: "カドミウム・カドミウム化合物 特殊健康診断",
    shortDescription:
      "カドミウム・カドミウム化合物を取扱う業務（電池製造・顔料・メッキ）に常時従事する労働者を対象。尿細管障害・骨軟化症をスクリーニング。",
    trigger: { substances: ["cadmium"] },
    frequency: {
      atHire: true,
      intervalMonths: 6,
      humanReadable: "雇入時・配置替え時および6か月以内ごとに1回",
    },
    testItems: {
      mandatory: [
        "業務の経歴の調査",
        "カドミウムによる自覚症状（咳・嗅覚異常・腰痛・骨関節痛）の調査",
        "尿中カドミウム量の検査",
        "尿中β2-ミクログロブリン又は尿中蛋白の検査",
        "胸部エックス線検査",
        "血中カドミウム濃度（必要時）",
      ],
    },
    relatedLaw: {
      name: "特定化学物質障害予防規則",
      articles: ["第39条", "別表第3"],
      summary:
        "カドミウム・カドミウム化合物（フッ化物を除く）は特化則第2類物質。尿中カドミウム・β2-ミクログロブリンを軸に近位尿細管障害をスクリーニング。",
    },
    notes: [
      "尿中β2-ミクログロブリン上昇は近位尿細管障害の早期指標。",
      "金属溶融・電池製造・顔料・メッキ等で特化則の各種ばく露防止措置（局排・呼吸保護具）と並行で運用すること。",
    ],
  },
  {
    id: "manganese-detailed-checkup",
    type: "special",
    title: "マンガン・マンガン化合物 特殊健康診断",
    shortDescription:
      "マンガン・マンガン化合物（溶接ヒューム・乾電池製造・合金製造）を取扱う業務に常時従事する労働者を対象。マンガン中毒（パーキンソン症候群）の早期発見。",
    trigger: { substances: ["manganese", "welding-fume"] },
    frequency: {
      atHire: true,
      intervalMonths: 6,
      humanReadable: "雇入時・配置替え時および6か月以内ごとに1回",
    },
    testItems: {
      mandatory: [
        "業務の経歴の調査",
        "マンガンによる自覚症状（仮面様顔貌・小刻み歩行・振戦・筋強剛・精神症状）の調査",
        "他覚症状の検査（神経学的所見）",
        "握力・指鼻指試験等の神経機能評価",
        "胸部エックス線検査（マンガン肺の確認）",
      ],
      omissible: ["神経学的精密検査（2次健診で医師判断時）"],
    },
    relatedLaw: {
      name: "特定化学物質障害予防規則",
      articles: ["第39条", "別表第3"],
      summary:
        "マンガン及びその化合物は特化則第2類物質。溶接ヒューム（マンガンを含むもの）も特化則対象となり、神経症状・呼吸器症状の継続観察が必要。",
    },
    notes: [
      "アーク溶接作業は2021年4月から特化則対象。マンガン健診の対象判定で漏れやすいので業務実態の調査を徹底する。",
      "錐体外路症状は早期は可逆だが進行で不可逆になるため初発症状の聞き取りが鍵。",
    ],
  },
  {
    id: "nickel-detailed-checkup",
    type: "special",
    title: "ニッケル化合物 特殊健康診断",
    shortDescription:
      "ニッケル化合物（ニッケル粉・酸化ニッケル・水酸化ニッケル・ニッケルカルボニル等）を取扱う業務に常時従事する労働者を対象。鼻腔がん・肺がんをスクリーニング。",
    trigger: { substances: ["nickel"] },
    frequency: {
      atHire: true,
      intervalMonths: 6,
      humanReadable: "雇入時・配置替え時および6か月以内ごとに1回",
    },
    testItems: {
      mandatory: [
        "業務の経歴の調査",
        "ニッケル化合物による自覚症状（接触皮膚炎・喘息様症状・嗅覚異常）の調査",
        "皮膚所見の検査",
        "鼻腔内検査（鼻中隔・上咽頭）",
        "胸部エックス線検査（肺がんスクリーニング）",
      ],
    },
    relatedLaw: {
      name: "特定化学物質障害予防規則",
      articles: ["第39条", "別表第3"],
      summary:
        "ニッケル化合物（粉状のもの）は特化則第1類物質、ニッケル及びニッケル化合物は第2類物質に区分される。発がん性のため特別管理物質として30年保存。",
    },
    notes: [
      "ニッケル化合物（粉状）は特別管理物質。個人票の保存期間は30年。",
      "鼻腔がん・上咽頭がんは健康管理手帳の対象。離職後の追跡が必要。",
    ],
  },
  {
    id: "benzene-detailed-checkup",
    type: "special",
    title: "ベンゼン 特殊健康診断",
    shortDescription:
      "ベンゼンを取扱う業務に常時従事する労働者を対象。再生不良性貧血・骨髄異形成・白血病をスクリーニング。",
    trigger: { substances: ["benzene"] },
    frequency: {
      atHire: true,
      intervalMonths: 6,
      humanReadable: "雇入時・配置替え時および6か月以内ごとに1回",
    },
    testItems: {
      mandatory: [
        "業務の経歴の調査",
        "ベンゼンによる自覚症状（易疲労感・出血傾向・歯肉出血）の調査",
        "他覚症状の検査",
        "末梢血液一般検査（白血球数・赤血球数・血色素量・血小板数）",
        "白血球百分率",
        "尿中フェノール量の検査（生物学的モニタリング）",
      ],
      omissible: ["骨髄検査（医師判断による2次健診時）"],
    },
    relatedLaw: {
      name: "特定化学物質障害予防規則",
      articles: ["第39条", "別表第3"],
      summary:
        "ベンゼンは特化則第2類の特別管理物質。造血器障害（再生不良性貧血・白血病）のリスクから血液一般検査と生物学的モニタリングを定期実施。",
    },
    notes: [
      "ベンゼンは特別管理物質。個人票の保存期間は30年（特化則第40条第2項）。",
      "白血病は健康管理手帳の交付対象。離職後も健診継続。",
      "ベンゼン含有率1%超の有機溶剤は使用禁止（有機則第38条の2）であることに留意。",
    ],
  },
  {
    id: "vinyl-chloride-detailed-checkup",
    type: "special",
    title: "塩化ビニル 特殊健康診断",
    shortDescription:
      "塩化ビニル（VCM）を取扱う業務に常時従事する労働者を対象。肝血管肉腫・肝機能障害・指端骨溶解症をスクリーニング。",
    trigger: { substances: ["vinyl-chloride"] },
    frequency: {
      atHire: true,
      intervalMonths: 6,
      humanReadable: "雇入時・配置替え時および6か月以内ごとに1回",
    },
    testItems: {
      mandatory: [
        "業務の経歴の調査",
        "塩化ビニルによる自覚症状（手指のしびれ・指端痛・倦怠感・右季肋部痛）の調査",
        "他覚症状の検査（皮膚硬化症・指端変化）",
        "肝機能検査（GOT・GPT・γ-GTP・ALP）",
        "腹部超音波検査（医師が必要と認める場合）",
        "胸部エックス線検査",
      ],
      omissible: ["肝臓画像精密検査（2次健診）"],
    },
    relatedLaw: {
      name: "特定化学物質障害予防規則",
      articles: ["第39条", "別表第3"],
      summary:
        "塩化ビニルは特化則第2類の特別管理物質。肝血管肉腫・肝硬変等の遅発性疾患をスクリーニング。",
    },
    notes: [
      "塩化ビニルは特別管理物質。個人票の保存期間は30年。",
      "肝血管肉腫は健康管理手帳の交付対象。離職後も追跡。",
    ],
  },
  {
    id: "isocyanate-detailed-checkup",
    type: "special",
    title: "有機イソシアネート 特殊健康診断",
    shortDescription:
      "TDI・MDI・HDIなど有機イソシアネートを取扱う業務（塗装・ウレタン製造）に常時従事する労働者を対象。職業性喘息・接触皮膚炎をスクリーニング。",
    trigger: { substances: ["isocyanate"] },
    frequency: {
      atHire: true,
      intervalMonths: 6,
      humanReadable: "雇入時・配置替え時および6か月以内ごとに1回",
    },
    testItems: {
      mandatory: [
        "業務の経歴の調査",
        "イソシアネート類による自覚症状（咳・喘鳴・胸部圧迫感・皮膚炎）の調査",
        "皮膚・粘膜の所見の検査",
        "肺機能検査（スパイロメトリー）",
        "胸部エックス線検査",
      ],
      omissible: ["特異的IgE検査・気道過敏性試験（2次健診）"],
    },
    relatedLaw: {
      name: "特定化学物質障害予防規則",
      articles: ["第39条", "別表第3"],
      summary:
        "TDI・MDI・HDI 等のイソシアネート類は特化則第2類物質。低濃度ばく露でも感作性により喘息発作を起こすため、症状の聞き取りと肺機能評価が中心。",
    },
    notes: [
      "感作性物質のため一度発症すると低濃度でも発作。ばく露ゼロを目標に呼吸用保護具・局所排気を徹底する。",
    ],
  },
  {
    id: "formaldehyde-detailed-checkup",
    type: "special",
    title: "ホルムアルデヒド 特殊健康診断",
    shortDescription:
      "ホルムアルデヒドを取扱う業務（合板・接着剤・防腐剤・病理標本処理）に常時従事する労働者を対象。眼・気道・皮膚刺激症状と上咽頭がんをスクリーニング。",
    trigger: { substances: ["formaldehyde"] },
    frequency: {
      atHire: true,
      intervalMonths: 6,
      humanReadable: "雇入時・配置替え時および6か月以内ごとに1回",
    },
    testItems: {
      mandatory: [
        "業務の経歴の調査",
        "ホルムアルデヒドによる自覚症状（眼・鼻・咽頭・気道刺激症状）の調査",
        "他覚症状の検査（皮膚炎・結膜炎）",
        "鼻腔内検査（粘膜・潰瘍の有無）",
        "胸部エックス線検査",
      ],
    },
    relatedLaw: {
      name: "特定化学物質障害予防規則",
      articles: ["第39条", "別表第3"],
      summary:
        "ホルムアルデヒドは特化則第2類の特別管理物質（IARC 1群）。上咽頭がん・気道粘膜障害・接触性皮膚炎をスクリーニング。",
    },
    notes: [
      "ホルムアルデヒドは特別管理物質。個人票の保存期間は30年。",
      "病理検査室での運用は局排設備・呼吸保護具の整備状況と併せて評価。",
    ],
  },
  {
    id: "dichloromethane-detailed-checkup",
    type: "special",
    title: "ジクロロメタン（塩化メチレン） 特殊健康診断",
    shortDescription:
      "ジクロロメタンを取扱う業務（塗料剥離・脱脂洗浄・接着剤・印刷）に常時従事する労働者を対象。胆管がん・中枢神経抑制・肝障害をスクリーニング。",
    trigger: { substances: ["dichloromethane"] },
    frequency: {
      atHire: true,
      intervalMonths: 6,
      humanReadable: "雇入時・配置替え時および6か月以内ごとに1回",
    },
    testItems: {
      mandatory: [
        "業務の経歴の調査",
        "ジクロロメタンによる自覚症状（頭痛・めまい・嘔気・倦怠感・腹痛）の調査",
        "他覚症状の検査",
        "肝機能検査（GOT・GPT・γ-GTP・ALP）",
        "腹部超音波検査（必要時）",
        "尿検査（蛋白・潜血）",
      ],
      omissible: ["胆道系画像精密検査（2次健診）"],
    },
    relatedLaw: {
      name: "特定化学物質障害予防規則",
      articles: ["第39条", "別表第3"],
      summary:
        "ジクロロメタンは特化則第2類の特別管理物質。印刷会社労働者の胆管がん事案を契機に2014年に追加。年2回の健診と局排・密閉設備・呼吸用保護具が必須。",
    },
    notes: [
      "ジクロロメタンは特別管理物質。個人票の保存期間は30年。",
      "胆管がんは健康管理手帳の交付対象。離職後も追跡。",
    ],
  },
  {
    id: "mercury-detailed-checkup",
    type: "special",
    title: "水銀・水銀化合物 特殊健康診断",
    shortDescription:
      "水銀・水銀化合物（金属水銀・無機水銀塩・有機水銀）を取扱う業務に常時従事する労働者を対象。中枢神経症状・腎機能障害・口腔症状をスクリーニング。",
    trigger: { substances: ["mercury"] },
    frequency: {
      atHire: true,
      intervalMonths: 6,
      humanReadable: "雇入時・配置替え時および6か月以内ごとに1回",
    },
    testItems: {
      mandatory: [
        "業務の経歴の調査",
        "水銀による自覚症状（手指振戦・運動失調・口腔症状・性格変化・腎症状）の調査",
        "他覚症状の検査（振戦・反射・歯肉炎）",
        "尿検査（蛋白・潜血）",
        "尿中水銀量の検査（生物学的モニタリング）",
      ],
    },
    relatedLaw: {
      name: "特定化学物質障害予防規則",
      articles: ["第39条", "別表第3"],
      summary:
        "水銀（アルキル化合物を除く）及びその無機化合物は特化則第2類物質。アルキル水銀化合物は別途毒劇法・水銀汚染防止法等で規制される。",
    },
    notes: [
      "尿中水銀は無機水銀ばく露の指標。アルキル水銀は血液・毛髪を併用。",
      "デンタルアマルガム・電解工程・温度計製造等の歴史的高ばく露業務に注意。",
    ],
  },
];
