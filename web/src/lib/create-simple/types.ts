/**
 * 厚生労働省 CREATE-SIMPLE ver3.2.1 の判定と同じ計算を行うための型。
 * 出典: 「CREATE-SIMPLE の設計基準」（2025年6月）と CREATE-SIMPLE_ver3.2.1.xlsm の VBA
 * （modCalc / modRASheet.RunRAinRAsheet / modFunction.CasSearch）。
 */

/** 1: 液体, 2: 粉体（固体）, 3: 気体（公式の propertyType と同じ番号） */
export type CsPropertyType = 1 | 2 | 3;

/** 取扱量レベル 1: 大量 … 5: 極微量（公式 Q1） */
export type CsAmountLevel = 1 | 2 | 3 | 4 | 5;

/** 換気レベル（公式 Q4・図表17） */
export type CsVentilationLevel = "A" | "B" | "C" | "D" | "E" | "F";

/** 1日の作業時間の選択肢（公式 Q5 の係数値＝時間） */
export type CsWorkingHours = 10 | 8 | 7 | 6 | 5 | 4 | 3 | 2 | 1 | 0.5;

/** 皮膚に接触する面積（公式 Q8・図表25, cm²） */
export type CsContactArea = 10 | 240 | 480 | 960 | 1500 | 1980;

export type CsGloveUse = "none" | "noInfo" | "resistant";
export type CsGloveTraining = "none" | "basic" | "thorough";
export type CsFitTest = "fitTest" | "sealCheck" | "none";

/**
 * 揮発性／飛散性（公式の volatilityOrDustiness）。
 * 液体: 1 高揮発性, 2 中揮発性（「わからない」も 2）, 3 低揮発性, 4 極低揮発性
 * 粉体: 1 高飛散性, 2 中飛散性, 3 低飛散性
 * 0 は気体などで「-」が選ばれた状態（公式の Worksheet_Change と同じ）。
 */
export type CsVolatility = 0 | 1 | 2 | 3 | 4;

export const CS_GHS_KEYS = [
  "explosives",
  "flamGas",
  "aerosol",
  "oxGas",
  "gasesUnderPressure",
  "flamLiq",
  "flamSol",
  "selfReact",
  "pyrLiq",
  "pyrSol",
  "selfHeat",
  "waterReact",
  "oxLiq",
  "oxSol",
  "orgPerox",
  "metCorr",
  "inertExplosives",
  "acuteToxOral",
  "acuteToxDermal",
  "acuteToxInhalationGases",
  "acuteToxInhalationVapors",
  "acuteToxInhalationDustOrMist",
  "skinCorrOrIrrit",
  "eyeCorrOrIrrit",
  "respSens",
  "skinSens",
  "muta",
  "carc",
  "repr",
  "stotSe",
  "stotRe",
  "aspTox",
] as const;

export type CsGhsKey = (typeof CS_GHS_KEYS)[number];

/** GHS 区分（"1", "1A", "2B", "1.1", "G", "LiquefiedGas" など公式の値）。未分類は省略。 */
export type CsGhs = Partial<Record<CsGhsKey, string>>;

export type CsOelUnit = "ppm" | "mg/m3";

export interface CsOelValue {
  value: number;
  unit: CsOelUnit;
}

/** ばく露限界値（公式 STEP2 の入力欄と同じ並び） */
export interface CsOelSet {
  /** 8時間濃度基準値 */
  cs8?: CsOelValue;
  /** 短時間濃度基準値 */
  csShort?: CsOelValue;
  /** 日本産業衛生学会 許容濃度 */
  jsoh?: CsOelValue;
  /** 日本産業衛生学会 最大許容濃度 */
  jsohCeiling?: CsOelValue;
  /** ACGIH TLV-TWA */
  tlvTwa?: CsOelValue;
  /** ACGIH TLV-STEL */
  tlvStel?: CsOelValue;
  /** ACGIH TLV-C */
  tlvC?: CsOelValue;
  /** DFG MAK */
  mak?: CsOelValue;
  /** DFG MAK Peak limitation */
  makPeak?: CsOelValue;
  /** その他（8時間） */
  other8?: CsOelValue;
  /** その他（短時間） */
  otherShort?: CsOelValue;
}

/** 使用するばく露限界値（公式 listSelectOEL: 0 デフォルト, 1 濃度基準値, 2 日本産業衛生学会, 3 ACGIH, 4 DFG, 5 その他） */
export type CsOelSource = 0 | 1 | 2 | 3 | 4 | 5;

export interface CsMeasured {
  value: number;
  unit: string;
}

/** 公式物質リストの法規制列（81〜93列、公式の文字列のまま） */
export interface CsRegulatoryFlags {
  skinEffect: string;
  carcinogenic: string;
  concentrationStandard: string;
  skinCutoff: string;
  specifiedClass1: string;
  specifiedClass2: string;
  specifiedClass3: string;
  specifiedCutoff: string;
  organicClass1: string;
  organicClass2: string;
  organicClass3: string;
  lead: string;
  tetraalkylLead: string;
}

/** リスクアセスメントシート STEP2 の1行（成分）に入る情報 */
export interface CsSubstance {
  name: string;
  cas?: string;
  /** 物質そのものの性状。不明なら null（判定には利用者の選択が必要） */
  propertyType: CsPropertyType | null;
  /** 揮発性／飛散性。未選択なら null */
  volatility: CsVolatility | null;
  ghs: CsGhs;
  oel: CsOelSet;
  oelSource: CsOelSource;
  molecularWeight: number | null;
  boilingPoint: number | null;
  logKow: number | null;
  flashPoint: number | null;
  /** 水溶解度（単位: mg/L, g/100mL, g/L, mg/mL, mg/cm3） */
  solubility: CsMeasured | null;
  /** 蒸気圧（単位: Pa, kPa, hPa, mPa, mmHg, Torr） */
  vaporPressure: CsMeasured | null;
  /** 公式物質リストに載っている物質のみ。手入力の物質は null */
  regulatory: CsRegulatoryFlags | null;
}

export interface CsComponent {
  substance: CsSubstance;
  /** 含有率 [wt%]（0 より大きい値） */
  contentPercent: number;
}

export interface CsRespirator {
  /** 指定防護係数（公式 Option_RPE の値: 4, 10, 11, 14, 19, 20, 25, 33, 50, 90, 1000） */
  protectionFactor: number;
  fit: CsFitTest;
}

/** STEP3 の設問への回答 */
export interface CsConditions {
  /** 製品の性状 */
  productType: CsPropertyType;
  amountLevel: CsAmountLevel;
  /** Q2 スプレー作業など空気中に飛散しやすい作業 */
  spray: boolean;
  /** Q3 塗布する合計面積が 1m² 以上（液体・中量以上のときだけ効く） */
  largeArea: boolean;
  ventilation: CsVentilationLevel;
  /** Q4 制御風速を確認している（換気レベル D・E のときだけ効く） */
  controlVelocityConfirmed: boolean;
  workingHours: CsWorkingHours;
  /** Q6 週1回以上なら "weekly"（日／週）、週1回未満なら "monthly"（日／月） */
  frequencyType: "weekly" | "monthly";
  frequencyDays: number;
  /** Q7 ばく露濃度の変動 */
  exposureVariation: "small" | "large";
  /** Q8 未回答なら null（経皮吸収は判定しない） */
  contactArea: CsContactArea | null;
  glove: CsGloveUse;
  gloveTraining: CsGloveTraining;
  /** Q11 室温なら null、室温以上ならその温度 [℃] */
  processTemperature: number | null;
  /** Q12 着火源を取り除く対策を講じている */
  ignitionSourceRemoved: boolean;
  /** Q13 爆発性雰囲気形成防止対策を実施している */
  explosiveAtmospherePrevented: boolean;
  /** Q14 近傍で有機物や金属の取扱いがある */
  organicOrMetalNearby: boolean;
  /** Q15 取扱物質が空気又は水に接触する可能性がある */
  airOrWaterContact: boolean;
  /** 呼吸用保護具（公式「実施レポート」でのみ使用。リスクアセスメントシートでは使わない） */
  respirator?: CsRespirator | null;
}

export interface CsTargets {
  inhalation: boolean;
  dermal: boolean;
  physical: boolean;
}

export interface CsAssessmentInput {
  conditions: CsConditions;
  components: CsComponent[];
  /** 既定は3つとも true */
  targets?: CsTargets;
  /**
   * "sheet": リスクアセスメントシート（既定）。呼吸用保護具は使わない。
   * "report": 実施レポート。呼吸用保護具の補正を使う（溶液中の固体の扱いも実施レポートの式）。
   */
  mode?: "sheet" | "report";
}

/** 長時間（8時間）はⅡ-A/Ⅱ-B、短時間・経皮・合計・危険性はⅡ */
export type CsRiskLevel = "I" | "II" | "II-A" | "II-B" | "III" | "IV";

export type CsSkipReason =
  | "not-target"
  | "gas"
  | "liquid-in-solid-product"
  | "property-type-missing"
  | "volatility-missing"
  | "contact-area-missing"
  | "dermal-data-missing"
  | "solubility-unit-unknown";

export interface CsInhalationResult {
  status: "ok";
  unit: CsOelUnit;
  /** 推定ばく露濃度範囲の上限（8時間）。範囲は上限×0.1〜上限 */
  exposure8h: number;
  exposureShort: number;
  level8h: CsRiskLevel;
  /** 短時間の判定（短時間のばく露限界値が決まらない場合は null） */
  levelShort: CsRiskLevel | null;
  rcr8h: number;
  rcrShort: number | null;
}

export interface CsDermalResult {
  status: "ok";
  /** 経皮ばく露限界値 [mg/day] */
  oelDermal: number;
  /** 経皮吸収量 [mg/day] */
  absorption: number;
  level: CsRiskLevel;
  rcr: number;
}

export type CsPhysicalClass =
  | "explosives"
  | "flamGas"
  | "aerosol"
  | "oxGas"
  | "gasesUnderPressure"
  | "flamLiq"
  | "flamSol"
  | "selfReact"
  | "pyrLiq"
  | "pyrSol"
  | "selfHeat"
  | "waterReact"
  | "oxLiq"
  | "oxSol"
  | "orgPerox"
  | "metCorr"
  | "inertExplosives";

export interface CsPhysicalResult {
  status: "ok";
  level: CsRiskLevel;
  /** 該当した危険性クラスごとのリスクレベル（1〜4） */
  byClass: Partial<Record<CsPhysicalClass, 1 | 2 | 3 | 4>>;
  descriptions: string[];
}

export interface CsSkipped {
  status: "skipped";
  reason: CsSkipReason;
}

export interface CsComponentResult {
  name: string;
  cas?: string;
  /** 判定に使った性状（蒸気圧のある固体を液体製品で扱う場合は 1 になる） */
  propertyType: CsPropertyType | null;
  volatility: CsVolatility | null;
  unit: CsOelUnit | null;
  /** 管理目標濃度の上限（GHS 区分から） */
  acrMax: number | null;
  /** 長時間のばく露限界値。null は「ばく露限界値なし（管理目標濃度で判定）」 */
  oel8h: number | null;
  oelShort: number | null;
  inhalation: CsInhalationResult | CsSkipped;
  dermal: CsDermalResult | CsSkipped;
  total: { status: "ok"; level: CsRiskLevel; rcr: number } | CsSkipped;
  physical: CsPhysicalResult | CsSkipped;
  /** 皮膚等障害化学物質・がん原性物質・濃度基準値設定物質・特化則・有機則など（公式の備考欄） */
  regulations: string[];
}

export interface CsAssessmentResult {
  components: CsComponentResult[];
  /** 公式「判定結果（有害性）」の文 */
  healthDescriptions: string[];
  /** 公式「判定結果（危険性）」の文 */
  physicalDescriptions: string[];
}
