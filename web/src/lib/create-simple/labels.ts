/** 画面・印刷・CSV で使う表示名（公式 CREATE-SIMPLE の選択肢の文言に合わせる） */
import type {
  CsAmountLevel,
  CsContactArea,
  CsGhsKey,
  CsGloveTraining,
  CsGloveUse,
  CsPhysicalClass,
  CsPropertyType,
  CsRiskLevel,
  CsSkipReason,
  CsVentilationLevel,
  CsVolatility,
  CsWorkingHours,
} from "./types";

export const RISK_LEVEL_LABEL: Record<CsRiskLevel, string> = {
  I: "Ⅰ",
  II: "Ⅱ",
  "II-A": "Ⅱ-A",
  "II-B": "Ⅱ-B",
  III: "Ⅲ",
  IV: "Ⅳ",
};

export const RISK_LEVEL_MEANING: Record<CsRiskLevel, string> = {
  I: "些細なリスク",
  II: "小さなリスク",
  "II-A": "小さなリスク",
  "II-B": "懸念されるリスク",
  III: "中程度のリスク",
  IV: "大きなリスク",
};

export const PROPERTY_TYPE_LABEL: Record<CsPropertyType, string> = { 1: "液体", 2: "粉体", 3: "気体" };

export const AMOUNT_LABEL: Record<CsPropertyType, Record<CsAmountLevel, string>> = {
  1: { 1: "大量（1kL以上）", 2: "中量（1L〜1kL）", 3: "少量（100mL〜1L）", 4: "微量（10〜100mL）", 5: "極微量（10mL未満）" },
  2: { 1: "大量（1t以上）", 2: "中量（1kg〜1t）", 3: "少量（100g〜1kg）", 4: "微量（10〜100g）", 5: "極微量（10g未満）" },
  3: { 1: "大量（1t以上）", 2: "中量（1kg〜1t）", 3: "少量（100g〜1kg）", 4: "微量（10〜100g）", 5: "極微量（10g未満）" },
};

export const VENTILATION_LABEL: Record<CsVentilationLevel, string> = {
  A: "換気なし",
  B: "全体換気（窓・換気扇）",
  C: "工業的な全体換気・屋外",
  D: "外付け式局所排気",
  E: "囲い式局所排気（ドラフト等）",
  F: "密閉容器内",
};

export const WORKING_HOURS_LABEL: Record<CsWorkingHours, string> = {
  10: "8時間超",
  8: "7〜8時間",
  7: "6〜7時間",
  6: "5〜6時間",
  5: "4〜5時間",
  4: "3〜4時間",
  3: "2〜3時間",
  2: "1〜2時間",
  1: "30分〜1時間",
  0.5: "30分以下",
};

export const CONTACT_AREA_LABEL: Record<CsContactArea, string> = {
  10: "小さな飛沫程度",
  240: "片手の手のひら",
  480: "両手の手のひら",
  960: "両手全体",
  1500: "両手と手首",
  1980: "両腕の肘から先",
};

export const GLOVE_LABEL: Record<CsGloveUse, string> = {
  none: "着けていない",
  noInfo: "性能不明の手袋",
  resistant: "耐透過性・耐浸透性の手袋",
};

export const GLOVE_TRAINING_LABEL: Record<CsGloveTraining, string> = {
  none: "教育なし",
  basic: "基本的な教育",
  thorough: "十分な教育・訓練",
};

export const VOLATILITY_LABEL: Record<1 | 2, Record<number, string>> = {
  1: { 1: "高揮発性（沸点50℃未満）", 2: "中揮発性（沸点50〜150℃）", 3: "低揮発性（沸点150℃以上）", 4: "極低揮発性（蒸気圧0.5Pa未満）" },
  2: { 1: "高飛散性（微細な軽い粉）", 2: "中飛散性（結晶状・顆粒状）", 3: "低飛散性（壊れないペレット）" },
};

export function volatilityLabel(propertyType: CsPropertyType | null, v: CsVolatility | null): string {
  if (v === null) return "未選択";
  if (propertyType === 3 || v === 0) return "-";
  return VOLATILITY_LABEL[propertyType === 2 ? 2 : 1][v] ?? "-";
}

export const PHYSICAL_CLASS_LABEL: Record<CsPhysicalClass, string> = {
  explosives: "爆発物",
  flamGas: "可燃性ガス",
  aerosol: "エアゾール",
  oxGas: "酸化性ガス",
  gasesUnderPressure: "高圧ガス",
  flamLiq: "引火性液体",
  flamSol: "可燃性固体",
  selfReact: "自己反応性化学品",
  pyrLiq: "自然発火性液体",
  pyrSol: "自然発火性固体",
  selfHeat: "自己発熱性化学品",
  waterReact: "水反応可燃性化学品",
  oxLiq: "酸化性液体",
  oxSol: "酸化性固体",
  orgPerox: "有機過酸化物",
  metCorr: "金属腐食性化学品",
  inertExplosives: "鈍性化爆発物",
};

export const GHS_LABEL: Record<CsGhsKey, string> = {
  ...PHYSICAL_CLASS_LABEL,
  acuteToxOral: "急性毒性（経口）",
  acuteToxDermal: "急性毒性（経皮）",
  acuteToxInhalationGases: "急性毒性（吸入：ガス）",
  acuteToxInhalationVapors: "急性毒性（吸入：蒸気）",
  acuteToxInhalationDustOrMist: "急性毒性（吸入：粉じん・ミスト）",
  skinCorrOrIrrit: "皮膚腐食性／刺激性",
  eyeCorrOrIrrit: "眼に対する重篤な損傷性／眼刺激性",
  respSens: "呼吸器感作性",
  skinSens: "皮膚感作性",
  muta: "生殖細胞変異原性",
  carc: "発がん性",
  repr: "生殖毒性",
  stotSe: "特定標的臓器毒性（単回ばく露）",
  stotRe: "特定標的臓器毒性（反復ばく露）",
  aspTox: "誤えん有害性",
};

const GAS_UNDER_PRESSURE: Record<string, string> = {
  CompressedGas: "圧縮ガス",
  LiquefiedGas: "液化ガス",
  HighPressureLiquefiedGas: "高圧液化ガス",
  LowPressureLiquefiedGas: "低圧液化ガス",
  RefrigeratedLiquefiedGas: "深冷液化ガス",
  DissolvedGas: "溶解ガス",
};

export function ghsCategoryLabel(key: CsGhsKey, value: string): string {
  if (key === "gasesUnderPressure") return GAS_UNDER_PRESSURE[value] ?? value;
  if (key === "explosives") return value === "UnstableExplosive" ? "不安定爆発物" : `等級${value}`;
  if (key === "selfReact" || key === "orgPerox") return `タイプ${value}`;
  return `区分${value}`;
}

/** 判定できない理由と、何を入れれば判定できるか */
export const SKIP_REASON_LABEL: Record<CsSkipReason, string> = {
  "not-target": "対象外",
  gas: "常温で気体の物質は吸入・経皮の計算対象外です（危険性は判定します）。",
  "liquid-in-solid-product": "粉体の製品に含まれる液体・気体成分は計算対象外です。",
  "property-type-missing": "物質の性状（液体・粉体・気体）を選ぶと判定できます。",
  "volatility-missing": "揮発性／飛散性を選ぶと判定できます。",
  "contact-area-missing": "皮膚に付く範囲を選ぶと判定できます。",
  "dermal-data-missing": "分子量・logKow・水溶解度のどれかが不足しています。SDSの値を入れると判定できます。",
  "solubility-unit-unknown": "水溶解度の単位が読めません。SDSの値と単位を入れ直すと判定できます。",
};

export function formatNumber(value: number): string {
  // VBA の文字列化と同じく有効数字15桁で丸めて表示する
  return String(Number(value.toPrecision(15)));
}
