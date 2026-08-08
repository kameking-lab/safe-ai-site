export const HEAT_PRIMARY_LINKS = {
  currentGuideline:
    "https://www.mhlw.go.jp/web/t_doc?dataId=00tc9896&dataType=1&pageNo=1",
  workplacePortal: "https://neccyusho.mhlw.go.jp/",
  emergency: "https://neccyusho.mhlw.go.jp/heatstroke/",
  wbgt: "https://www.wbgt.env.go.jp/wbgt_detail.php",
  jmaAlert:
    "https://www.jma.go.jp/jma/kishou/know/bosai/heat_alert.html",
  law: "https://laws.e-gov.go.jp/law/347M50002000032",
  implementationNotice:
    "https://www.mhlw.go.jp/content/11303000/001490911.pdf",
  statistics: "https://neccyusho.mhlw.go.jp/heatstroke/",
  aed: "https://www.fdma.go.jp/relocation/kyukyukikaku/oukyu/05kobetsu/index.html",
} as const;

export const HEAT_CONTROL_HIERARCHY = [
  {
    id: "inherent",
    order: 1,
    title: "本質的対策",
    description: "暑さへのばく露そのものを避ける・減らす",
    examples: [
      "暑い時間帯を避ける",
      "作業量を減らす",
      "作業方法を変える",
      "危険作業を延期する",
    ],
  },
  {
    id: "engineering",
    order: 2,
    title: "工学的対策",
    description: "設備や作業環境で熱・日射を隔て、冷却・通風する",
    examples: [
      "日よけ",
      "送風",
      "冷房",
      "ミスト",
      "休憩所",
      "冷却設備",
    ],
  },
  {
    id: "administrative",
    order: 3,
    title: "管理的対策",
    description: "計画、時間、確認、連絡、緊急手順を運用する",
    examples: [
      "作業計画",
      "休憩",
      "水分・塩分",
      "暑熱順化",
      "体調確認",
      "声かけ",
      "単独作業回避",
      "緊急時手順",
    ],
  },
  {
    id: "ppe",
    order: 4,
    title: "個人用保護具・補助用品",
    description:
      "空調服、冷却ベスト、帽子、ネッククーラー、吸汗速乾衣類などを補助として使う",
    examples: [
      "空調服",
      "冷却ベスト",
      "帽子",
      "ネッククーラー",
      "吸汗速乾",
    ],
  },
] as const;

/**
 * This ordering is the portal's task-oriented arrangement of controls.
 * It must not be presented as the wording or a numbered order prescribed by
 * Article 612-2 or by an MHLW notice.
 */
export const HEAT_CONTROL_HIERARCHY_META = {
  informationKind: "siteCommentary",
  displayLabel: "サイト独自の優先順整理",
  sourceTitle: "職場における熱中症防止対策のためのガイドライン",
  sourceHref: HEAT_PRIMARY_LINKS.currentGuideline,
  limitation:
    "法令・通達の条項順ではありません。現場条件に応じて複数の対策を組み合わせ、個別の法的義務は一次資料で確認してください。",
  humanReviewedAt: null,
} as const;

export type HeatGoodsCategory = {
  id: string;
  name: string;
  controlClass:
    | "工学的対策"
    | "管理的対策"
    | "個人用保護具・補助用品"
    | "緊急対応";
  purpose: string;
  suitableFor: string;
  caution: string;
  limitation: string;
  sourceTitle: string;
  sourceHref: string;
  commercialDisclosure: "広告なし";
};

const guidelineSource = {
  sourceTitle: "厚生労働省・職場における熱中症防止対策のためのガイドライン",
  sourceHref: HEAT_PRIMARY_LINKS.currentGuideline,
} as const;
const wbgtSource = {
  sourceTitle: "環境省・暑さ指数（WBGT）の算出方法と留意事項",
  sourceHref: HEAT_PRIMARY_LINKS.wbgt,
} as const;
const emergencySource = {
  sourceTitle: "厚生労働省・職場でおこる熱中症／熱中症者への対応",
  sourceHref: HEAT_PRIMARY_LINKS.emergency,
} as const;

export const HEAT_GOODS_CATEGORIES = [
  {
    id: "wbgt-meter",
    name: "WBGT計",
    controlClass: "管理的対策",
    purpose: "作業位置の暑熱環境を測り、見直しの根拠を残す",
    suitableFor: "屋外、熱源周辺、場所ごとの差が大きい現場",
    caution: "黒球の有無、測定位置、応答時間、校正・点検、記録時刻を確認する",
    limitation: "機器の値だけで作業可否や法令適合を自動確定しない",
    ...wbgtSource,
    commercialDisclosure: "広告なし",
  },
  {
    id: "thermo-hygrometer",
    name: "温湿度計",
    controlClass: "管理的対策",
    purpose: "気温・湿度の変化を把握する補助に使う",
    suitableFor: "休憩所、屋内、複数区画の比較",
    caution: "直射日光、壁面熱、設置高さなど測定条件をそろえる",
    limitation: "気温・湿度だけをWBGT実測値として表示しない",
    ...wbgtSource,
    commercialDisclosure: "広告なし",
  },
  {
    id: "fan",
    name: "送風機",
    controlClass: "工学的対策",
    purpose: "通風を補い、作業場所や休憩所の環境を改善する",
    suitableFor: "通風の弱い屋内、仮設休憩所",
    caution: "粉じん・有害物の拡散、転倒、電源、騒音を別途確認する",
    limitation: "高温条件では送風だけに依存せず、作業短縮や冷却と組み合わせる",
    ...guidelineSource,
    commercialDisclosure: "広告なし",
  },
  {
    id: "spot-cooler",
    name: "スポットクーラー",
    controlClass: "工学的対策",
    purpose: "局所的な冷却場所を確保する",
    suitableFor: "固定作業、屋内休憩所、冷房が届きにくい区画",
    caution: "排熱、ドレン、電源、換気、動線を確認する",
    limitation: "冷風が届かない作業者や排熱側の環境を見落とさない",
    ...guidelineSource,
    commercialDisclosure: "広告なし",
  },
  {
    id: "shade",
    name: "日よけ",
    controlClass: "工学的対策",
    purpose: "直射日光と放射熱へのばく露を減らす",
    suitableFor: "屋外作業、待機場所、休憩所",
    caution: "風荷重、固定、避難動線、火気との距離を確認する",
    limitation: "日陰でも高温多湿になり得るため測定と休憩を続ける",
    ...guidelineSource,
    commercialDisclosure: "広告なし",
  },
  {
    id: "mist",
    name: "ミスト",
    controlClass: "工学的対策",
    purpose: "蒸発冷却を利用して周囲や身体の熱を逃がす補助にする",
    suitableFor: "換気が確保された屋外・半屋外",
    caution: "高湿度、床の滑り、電気設備、衛生管理を確認する",
    limitation: "高湿度では効果が限られ、単独の予防策にはならない",
    ...guidelineSource,
    commercialDisclosure: "広告なし",
  },
  {
    id: "cooling-vest",
    name: "冷却ベスト",
    controlClass: "個人用保護具・補助用品",
    purpose: "身体冷却を補助する",
    suitableFor: "移動作業、冷房設備を置けない作業",
    caution: "重量、可動域、冷却持続時間、交換手順、他の保護具との干渉を確認する",
    limitation: "作業時間短縮、休憩、環境改善の代わりにしない",
    ...guidelineSource,
    commercialDisclosure: "広告なし",
  },
  {
    id: "fan-jacket",
    name: "空調服・ファン付き作業服",
    controlClass: "個人用保護具・補助用品",
    purpose: "衣服内の通風を補助する",
    suitableFor: "屋外・屋内の移動作業",
    caution: "火気、粉じん、有害物、巻き込まれ、バッテリー、服装補正を確認する",
    limitation: "周囲温度や湿度、保護服との組合せで条件が変わるため過信しない",
    ...guidelineSource,
    commercialDisclosure: "広告なし",
  },
  {
    id: "neck-cooler",
    name: "ネッククーラー",
    controlClass: "個人用保護具・補助用品",
    purpose: "局所冷却の補助に使う",
    suitableFor: "移動作業、短時間の補助冷却",
    caution: "皮膚状態、締め付け、衛生、冷却時間を確認する",
    limitation: "体全体の熱負荷や重症化をこれだけで防げるとは表示しない",
    ...guidelineSource,
    commercialDisclosure: "広告なし",
  },
  {
    id: "ice-pack",
    name: "保冷剤",
    controlClass: "個人用保護具・補助用品",
    purpose: "休憩時・応急時の身体冷却を補助する",
    suitableFor: "冷凍・保冷設備が確保できる現場",
    caution: "直接皮膚へ長時間当てず、衛生、交換、再冷却の手順を決める",
    limitation: "意識や自力飲水に異常がある場合は冷却だけで様子を見ない",
    ...emergencySource,
    commercialDisclosure: "広告なし",
  },
  {
    id: "oral-rehydration",
    name: "経口補水液",
    controlClass: "管理的対策",
    purpose: "自力飲水が可能な場合の水分・塩分補給の選択肢にする",
    suitableFor: "休憩所、緊急対応用品",
    caution: "表示どおりに使用し、疾病・食事制限等がある場合は医師等の指示を確認する",
    limitation: "意識が不明瞭、または自力で飲めない人へ無理に飲ませない",
    ...emergencySource,
    commercialDisclosure: "広告なし",
  },
  {
    id: "salt-tablet",
    name: "塩分タブレット",
    controlClass: "管理的対策",
    purpose: "計画した水分・塩分補給を補助する",
    suitableFor: "長時間の暑熱作業で補給計画を運用する現場",
    caution: "水分と併せ、摂取量、疾病・食事制限、製品表示を確認する",
    limitation: "タブレットだけで熱中症を予防できるとは扱わない",
    ...guidelineSource,
    commercialDisclosure: "広告なし",
  },
  {
    id: "water-server",
    name: "ウォーターサーバー",
    controlClass: "管理的対策",
    purpose: "飲料へ短時間で到達できる配置を作る",
    suitableFor: "常設・仮設休憩所、人数の多い現場",
    caution: "衛生、補充、停電・断水時、紙コップ等の廃棄を計画する",
    limitation: "設置だけで補給時刻や休憩が守られるとは限らない",
    ...guidelineSource,
    commercialDisclosure: "広告なし",
  },
  {
    id: "rest-area",
    name: "休憩所用品",
    controlClass: "工学的対策",
    purpose: "日射を避け、冷却・休憩できる場所を整える",
    suitableFor: "屋外、広い工場、休憩所まで距離がある現場",
    caution: "収容人数、冷房、換気、飲料、連絡手段、避難動線を確認する",
    limitation: "場所だけ作って利用時間・交代要員を決めない運用を避ける",
    ...guidelineSource,
    commercialDisclosure: "広告なし",
  },
  {
    id: "portable-bed",
    name: "簡易ベッド",
    controlClass: "緊急対応",
    purpose: "作業から離した人を一人にせず状態確認する場所を補助する",
    suitableFor: "救急要請までの待機場所を設ける現場",
    caution: "転落、通路妨害、体位、継続監視、救急隊のアクセスを確認する",
    limitation: "意識不明瞭・自力飲水不能を寝かせて様子見にしない",
    ...emergencySource,
    commercialDisclosure: "広告なし",
  },
  {
    id: "aed",
    name: "AED",
    controlClass: "緊急対応",
    purpose: "心停止が疑われる場合の一次救命処置に備える",
    suitableFor: "事業場、休憩所、現場事務所",
    caution: "設置場所、点検、119通報、心肺蘇生、持参担当を訓練する",
    limitation: "熱中症を診断・予防する機器ではなく、音声案内と通信指令員に従う",
    sourceTitle: "消防庁・一般市民向け応急手当WEB講習",
    sourceHref: HEAT_PRIMARY_LINKS.aed,
    commercialDisclosure: "広告なし",
  },
  {
    id: "emergency-board",
    name: "緊急連絡掲示",
    controlClass: "管理的対策",
    purpose: "報告先、119、現場住所、誘導経路をすぐ確認できるようにする",
    suitableFor: "入口、休憩所、朝礼場所、サイネージ",
    caution: "担当変更や現場移動時に更新し、訓練用表示と実連絡先を区別する",
    limitation: "掲示だけで周知・訓練を完了したことにしない",
    ...guidelineSource,
    commercialDisclosure: "広告なし",
  },
  {
    id: "health-check-card",
    name: "体調確認カード",
    controlClass: "管理的対策",
    purpose: "本人と周囲が変化に気づく共通項目を持つ",
    suitableFor: "朝礼、交代時、外国人労働者を含む現場",
    caution: "健康情報を必要以上に集めず、閲覧者・保存期間・報告先を限定する",
    limitation: "医学的診断や就業可否の自動判定に使わない",
    ...guidelineSource,
    commercialDisclosure: "広告なし",
  },
] as const satisfies readonly HeatGoodsCategory[];

export const HEAT_WORKPLACE_CASUALTY_TREND = [
  { year: 2016, casualties: 462, deaths: 12 },
  { year: 2017, casualties: 544, deaths: 14 },
  { year: 2018, casualties: 1178, deaths: 28 },
  { year: 2019, casualties: 829, deaths: 25 },
  { year: 2020, casualties: 959, deaths: 22 },
  { year: 2021, casualties: 561, deaths: 20 },
  { year: 2022, casualties: 827, deaths: 30 },
  { year: 2023, casualties: 1106, deaths: 31 },
  { year: 2024, casualties: 1257, deaths: 31 },
  { year: 2025, casualties: 1803, deaths: 19 },
] as const;

export const HEAT_STATISTICS_META = {
  sourceTitle: "厚生労働省・職場における熱中症による死傷災害の発生状況",
  sourceHref: HEAT_PRIMARY_LINKS.statistics,
  sourceScope:
    "職場における熱中症による死亡者および休業4日以上の業務上疾病者",
  definition: "死亡者数は死傷者数の内数",
  periodStartYear: 2016,
  periodEndYear: 2025,
  sourceRetrievedAt: "2026-07-29",
  humanReviewedAt: null,
  verificationStatus: "official-url-located-content-review-pending",
  latestYear: 2025,
  latestStatus: "確定値",
  note:
    "死亡者数は死傷者数の内数です。年ごとの気象・就業・報告条件が異なるため、件数だけで個別現場の危険度を判定しません。",
  summaries: [
    "2025年は製造業365人、建設業292人。死亡者は建設業5人、警備業3人。",
    "2025年の死傷者の約72%、死亡者の約79%が7月または8月。",
    "2025年の死傷者は50歳代以上が約52%、死亡者は約84%。",
    "時間帯は午前中や15時前後が多い一方、日中の各時間帯で発生し、作業後に悪化した事例も含まれます。",
  ],
  notStructured:
    "個別事例の作業内容・背景要因は、このページの統計表へまだ構造化していません。公式ページの事案詳細を確認してください。",
} as const;
