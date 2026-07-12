/**
 * 土止め支保工向け 土圧の概算（ランキン主働／静止土圧 ＋ 静水圧の重ね合わせ）
 *
 * 根拠・出典（数式はすべて公表された理論式・指針に基づく）:
 * - ランキン土圧論（Rankine）: 壁面摩擦を無視した鉛直壁・水平地盤の古典解。
 *     主働土圧係数 Ka = tan²(45° − φ/2) = (1 − sinφ)/(1 + sinφ)
 *     静止土圧係数 K0 = 1 − sinφ（Jáky の式）
 * - 道路土工「仮設構造物工指針」（日本道路協会）: 土止め支保工の設計で用いる
 *     土圧・水圧の重ね合わせ（地下水位以深は有効応力＋静水圧）の考え方。
 * - 労働安全衛生規則 第368条〜第375条（土止め支保工）: 部材・点検等の遵守事項。
 *   本計算は側圧の概算であり、部材断面の許容応力照査・切ばり座屈等は別途。
 *
 * 重ね合わせ（地下水位を境に有効応力で計算）:
 *   鉛直有効応力 σv'(z): z≤dw で q+γ·z、z>dw で q+γ·dw+γ'·(z−dw)（γ'=γ−γw）
 *   側方土圧（有効）  pa'(z) = K·σv'(z) − 2c·√K（引張は0で頭打ち＝クラック）
 *   静水圧            pw(z)  = γw·(z−dw)（z>dw のみ）
 *   合力 P = ∫pa' dz + ½γw·(H−dw)²
 *
 * 判定は決定論（AIは使わない）。土質定数（γ・φ・c）は現場の土質調査値を入力する
 * （土質種別の代表値は使用例プリセットで提供し、勝手に固定しない）。
 */

import type { CalcCheckItem, CalcOutcome, CalcValues, ConstructionCalculator } from "../schema";
import { formatNumber } from "../schema";

/** 水の単位体積重量 [kN/m³] */
export const GAMMA_WATER = 9.81;

const deg2rad = (d: number) => (d * Math.PI) / 180;

/** 主働土圧係数 Ka = tan²(45° − φ/2) */
export function rankineKa(phiDeg: number): number {
  return Math.tan(deg2rad(45 - phiDeg / 2)) ** 2;
}

/** 静止土圧係数 K0 = 1 − sinφ（Jáky） */
export function jakyK0(phiDeg: number): number {
  return 1 - Math.sin(deg2rad(phiDeg));
}

export type EarthPressureResult = {
  /** 側圧係数（主働 Ka または静止 K0） */
  K: number;
  /** 土圧合力（有効応力ベース）[kN/m] */
  earthThrust: number;
  /** 静水圧合力 [kN/m] */
  waterThrust: number;
  /** 合力 [kN/m] */
  total: number;
  /** 掘削底（z=H）での側方全圧（土圧＋水圧）[kN/m²] */
  pressureAtBottom: number;
  /** 有効な水位以深高さ [m] */
  submergedHeight: number;
};

/**
 * ランキン土圧＋静水圧の合力を計算する。
 * @param H 壁高（掘削深さ）[m]
 * @param gamma 湿潤単位体積重量 γ [kN/m³]
 * @param phiDeg 内部摩擦角 φ [°]
 * @param cohesion 粘着力 c [kN/m²]
 * @param surcharge 上載荷重 q [kN/m²]
 * @param waterDepth 地下水位（地表からの深さ）[m]（H以上なら水位なし）
 * @param atRest 静止土圧で計算するか（false=主働）
 */
export function computeEarthPressure(
  H: number,
  gamma: number,
  phiDeg: number,
  cohesion: number,
  surcharge: number,
  waterDepth: number,
  atRest: boolean,
): EarthPressureResult {
  const K = atRest ? jakyK0(phiDeg) : rankineKa(phiDeg);
  const dw = Math.min(Math.max(waterDepth, 0), H); // 乾燥部の高さ（0..H）
  const hsub = H - dw; // 水位以深の高さ
  const gammaEff = gamma - GAMMA_WATER; // 有効（水中）単位体積重量 γ'

  // ∫σv' dz を区間ごとに閉形式で（q は全深さに作用）
  const intSigmaV =
    surcharge * H +
    0.5 * gamma * dw * dw +
    gamma * dw * hsub +
    0.5 * gammaEff * hsub * hsub;

  // 土圧合力（有効）= K·∫σv' − 2c√K·H。負値（引張）は 0 に頭打ち。
  const earthThrust = Math.max(K * intSigmaV - 2 * cohesion * Math.sqrt(K) * H, 0);
  // 静水圧合力（三角形）
  const waterThrust = 0.5 * GAMMA_WATER * hsub * hsub;

  // 掘削底での側方全圧
  const sigmaVBottom = surcharge + gamma * dw + gammaEff * hsub;
  const earthPressureBottom = Math.max(K * sigmaVBottom - 2 * cohesion * Math.sqrt(K), 0);
  const waterPressureBottom = GAMMA_WATER * hsub;

  return {
    K,
    earthThrust,
    waterThrust,
    total: earthThrust + waterThrust,
    pressureAtBottom: earthPressureBottom + waterPressureBottom,
    submergedHeight: hsub,
  };
}

function computeEarthPressureShoring(values: CalcValues): CalcOutcome {
  const H = values.height as number;
  const gamma = values.gamma as number;
  const phi = values.phi as number;
  const cohesion = values.cohesion as number;
  const surcharge = values.surcharge as number;
  const waterDepth = values.waterDepth as number;
  const atRest = (values.pressureType as string) === "atrest";

  const r = computeEarthPressure(H, gamma, phi, cohesion, surcharge, waterDepth, atRest);
  const kLabel = atRest ? "静止土圧係数 K0" : "主働土圧係数 Ka";

  const items: CalcCheckItem[] = [
    { label: kLabel, value: formatNumber(r.K, 3) },
    { label: "土圧の合力（有効応力）", value: `${formatNumber(r.earthThrust, 1)} kN/m` },
    {
      label: "静水圧の合力",
      value: r.submergedHeight > 0 ? `${formatNumber(r.waterThrust, 1)} kN/m` : "0 kN/m（水位なし）",
    },
    {
      label: "側圧の合力（土圧＋水圧）",
      value: `${formatNumber(r.total, 1)} kN/m`,
      tone: "warning",
      note: "壁1mあたり。切ばり・腹おこし設計の外力",
    },
    { label: "掘削底での側方全圧", value: `${formatNumber(r.pressureAtBottom, 1)} kN/m²` },
  ];

  const warnings: string[] = [];
  if (r.submergedHeight > 0) {
    warnings.push(
      `地下水位以深（${formatNumber(r.submergedHeight, 1)}m）は有効応力（γ'=γ−9.81）に静水圧を重ねています。排水・止水の条件で水圧の扱いが変わるため、実設計では地下水位・被圧の確認が必須です。`,
    );
  }
  if (cohesion > 0) {
    warnings.push(
      "粘着力 c による引張域（負の土圧）は 0 に頭打ちしています（引張クラックを見込む安全側処理）。粘性土は時間経過・含水で土圧が増大するため、長期は c を見込まない検討も行ってください。",
    );
  }
  warnings.push(
    "本計算はランキン理論（壁面摩擦・粘着力の効果を限定）の概算で、掘削底の盤ぶくれ（ヒービング／ボイリング）・根入れ長・切ばり座屈・腹おこしの断面照査は含みません。道路土工「仮設構造物工指針」等により別途照査してください。",
  );
  warnings.push(
    "掘削深さ2m以上（明り掘削）は地山の掘削作業主任者の選任が必要です（安衛則第359条）。土止め支保工の切ばり・腹おこしの取付け・取外し作業には土止め支保工作業主任者の選任が必要です（安衛則第374条）。",
  );

  return {
    tone: "warning",
    headline: "側圧を算定",
    value: formatNumber(r.total, 1),
    unit: "kN/m",
    summary: `${atRest ? "静止" : "主働"}土圧と静水圧の重ね合わせで、壁1mあたりの側圧合力は約 ${formatNumber(r.total, 1)} kN/m です（掘削底の側方全圧 約 ${formatNumber(r.pressureAtBottom, 1)} kN/m²）。切ばり・腹おこし・矢板の設計外力の目安に用いてください。`,
    items,
    steps: [
      `${kLabel} = ${atRest ? "1 − sinφ" : "tan²(45° − φ/2)"}（φ=${formatNumber(phi, 0)}°）→ ${formatNumber(r.K, 3)}`,
      `鉛直有効応力の積分 ∫σv'dz = qH + ½γ·dw² + γ·dw·hsub + ½γ'·hsub²（γ'=γ−γw=${formatNumber(gamma - GAMMA_WATER, 1)}）`,
      `土圧合力 = K·∫σv'dz − 2c√K·H = ${formatNumber(r.earthThrust, 1)} kN/m（負値は0に頭打ち）`,
      `静水圧合力 = ½·γw·hsub² = ½·9.81·${formatNumber(r.submergedHeight, 2)}² = ${formatNumber(r.waterThrust, 1)} kN/m`,
      `側圧合力 P = 土圧 + 水圧 = ${formatNumber(r.total, 1)} kN/m`,
    ],
    warnings,
  };
}

export const earthPressureShoringCalculator: ConstructionCalculator = {
  slug: "earth-pressure-shoring",
  title: "土圧の概算（ランキン主働／静止土圧＋静水圧）",
  shortTitle: "土圧・静水圧",
  summary:
    "土止め支保工の設計外力となる側圧を、ランキン主働土圧（または静止土圧）と静水圧の重ね合わせで概算します。土質定数は現場の土質調査値を入力してください（土質種別の代表値は入力例で提供）。",
  fields: [
    {
      kind: "select",
      id: "pressureType",
      label: "土圧の種類",
      options: [
        { value: "active", label: "主働土圧（変位を許容・ランキン Ka）" },
        { value: "atrest", label: "静止土圧（変位を許さない・K0＝1−sinφ）" },
      ],
      defaultValue: "active",
      help: "自立性の低い山留め・剛な壁は静止土圧側で検討することがあります",
    },
    {
      kind: "number",
      id: "height",
      label: "壁高（掘削深さ）H",
      unit: "m",
      min: 0.5,
      max: 20,
      step: 0.1,
      defaultValue: 4,
    },
    {
      kind: "number",
      id: "gamma",
      label: "土の単位体積重量 γ",
      unit: "kN/m³",
      min: 12,
      max: 22,
      step: 0.5,
      defaultValue: 18,
      help: "湿潤単位体積重量。砂質土18前後・粘性土16〜18・礫質土20前後（要土質調査）",
    },
    {
      kind: "number",
      id: "phi",
      label: "内部摩擦角 φ",
      unit: "°",
      min: 0,
      max: 45,
      step: 1,
      defaultValue: 30,
      help: "砂質土30〜35・礫質土35〜40・粘性土は0に近い（要土質調査）",
    },
    {
      kind: "number",
      id: "cohesion",
      label: "粘着力 c",
      unit: "kN/m²",
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 0,
      help: "砂質土は0。粘性土は室内試験値を入力（長期は見込まない検討も）",
      aiOptional: true,
    },
    {
      kind: "number",
      id: "surcharge",
      label: "上載荷重 q",
      unit: "kN/m²",
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 10,
      help: "地表面の載荷（重機・資材・交通荷重等）。仮設構造物工指針では10kN/m²程度を見込むことが多い",
      aiOptional: true,
    },
    {
      kind: "number",
      id: "waterDepth",
      label: "地下水位（地表からの深さ）",
      unit: "m",
      min: 0,
      max: 20,
      step: 0.1,
      defaultValue: 4,
      help: "壁高H以上なら水位なし（水圧0）。小さいほど水圧が大きくなります",
      aiOptional: true,
    },
  ],
  basis: [
    {
      label: "ランキン土圧論（主働土圧係数 Ka＝tan²(45°−φ/2)、静止土圧係数 K0＝1−sinφ）",
      description:
        "壁面摩擦を無視した鉛直壁・水平地盤の古典解。主働土圧・静止土圧係数の算定に用います。",
    },
    {
      label: "道路土工 仮設構造物工指針（日本道路協会）",
      description:
        "土止め支保工の側圧（土圧＋水圧の重ね合わせ）・上載荷重の見込み方の基準。数値は最新版の指針で確認してください。",
    },
    {
      label: "労働安全衛生規則 第368条〜第375条（土止め支保工）・第359条・第374条（作業主任者）",
      description:
        "土止め支保工の部材・点検、明り掘削／土止め支保工作業主任者の選任義務。本計算は側圧の概算で、遵守事項の確認は別途必要です。",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000032#Mp-At_368",
    },
  ],
  cautions: [
    "本計算は側圧（外力）の概算であり、切ばり・腹おこし・親杭横矢板・鋼矢板の断面照査、根入れ長、盤ぶくれ（ヒービング・ボイリング）の検討には代わりません。",
    "土質定数（γ・φ・c）は必ず現場の土質調査（ボーリング・土質試験）の値を用いてください。プリセットは代表値の目安です。",
    "地下水は排水・止水工法により水圧の扱いが大きく変わります。被圧地下水・盤ぶくれの恐れがある場合は専門技術者の検討が必須です。",
  ],
  examples: [
    {
      label: "砂質土 H=4m・φ30°・γ18・水位4m（乾燥）",
      values: { pressureType: "active", height: 4, gamma: 18, phi: 30, cohesion: 0, surcharge: 10, waterDepth: 4 },
    },
    {
      label: "砂質土 H=5m・地下水位2m（水圧あり）",
      values: { pressureType: "active", height: 5, gamma: 18, phi: 30, cohesion: 0, surcharge: 10, waterDepth: 2 },
    },
    {
      label: "礫質土 H=6m・φ38°・静止土圧",
      values: { pressureType: "atrest", height: 6, gamma: 20, phi: 38, cohesion: 0, surcharge: 10, waterDepth: 6 },
    },
  ],
  keywords: [
    "土圧",
    "ランキン",
    "クーロン",
    "土止め",
    "山留め",
    "支保工",
    "切ばり",
    "腹おこし",
    "水圧",
    "静水圧",
    "側圧",
    "掘削",
    "矢板",
  ],
  relatedSlugs: ["water-pressure", "shoring-member-check"],
  compute: computeEarthPressureShoring,
};
