// /ky への外部からのディープリンク（業種ページ・事故事例・日誌など）で渡される
// クエリパラメータを正規化するためのヘルパー。
//
// /industries/<id> から来る ?industry=<id> を KY プリセットID へマップする。
// 業種ページは industries-content の ID（construction/food/healthcare/...）を
// 渡してくるが、KY プリセットは別の体系（construction/manufacturing/medical/
// care-facility/homecare/transport/forestry/food/retail/ladder/cleaning）。
// マッピングできないキーは undefined を返し、プリセット適用をスキップする。

export const INDUSTRY_PARAM_TO_PRESET: Readonly<Record<string, string>> = Object.freeze({
  construction: "construction",
  manufacturing: "manufacturing",
  healthcare: "medical",
  medical: "medical",
  "medical-welfare": "medical",
  welfare: "care-facility",
  care: "care-facility",
  "care-facility": "care-facility",
  homecare: "homecare",
  transport: "transport",
  logistics: "transport",
  warehouse: "transport",
  wholesale: "transport",
  forestry: "forestry",
  food: "food",
  retail: "retail",
  service: "retail",
  cleaning: "cleaning",
  ladder: "ladder",
});

export function mapIndustryParamToPresetId(
  industry: string | null | undefined
): string | undefined {
  if (!industry) return undefined;
  return INDUSTRY_PARAM_TO_PRESET[industry];
}

// industries-content の各業種ページが渡してくる ?topic=<key> のラベル化。
// 厳密な工種名ではなく、ユーザーに「何のテーマで来たか」を伝える目的のみ。
const TOPIC_LABELS: Readonly<Record<string, string>> = Object.freeze({
  scaffold: "足場の組立て・解体作業",
  fall: "高所作業（屋根・梁上）",
  crane: "クレーン・玉掛け作業",
  demolition: "解体・はつり作業",
  heat: "夏季屋外作業",
  "heat-illness": "熱中症対策作業",
  press: "プレス機作業",
  forklift: "フォークリフト作業",
  robot: "産業用ロボット作業",
  chemical: "化学物質取扱い作業",
  dust: "粉じん作業",
  knife: "刃物・スライサー作業",
  delivery: "配送・搬送作業",
  "night-shift": "夜勤・深夜作業",
  newcomer: "新人作業者の作業",
  transfer: "移乗・介助",
  needle: "注射・採血",
  infection: "感染症対策",
  violence: "暴力・カスハラ対応",
  "home-visit": "訪問先での作業",
  cashier: "レジ業務",
  stocking: "品出し作業",
  "fresh-food": "生鮮食品取扱い",
  ladder: "脚立・はしご作業",
});

export function describeTopic(topic: string | null | undefined): string | undefined {
  if (!topic) return undefined;
  return TOPIC_LABELS[topic];
}
