/**
 * あと施工アンカーの引抜き耐力の概算（コーン状破壊／付着破壊）
 *
 * 根拠・出典（数式は公表された設計式に基づく。メーカー固有値は「証明書の値を入力」方式）:
 * - コーン状破壊（コンクリートの引張破壊）:
 *     Tcb = 0.31 · √(σB) · Ac   [N]
 *       σB: コンクリートの圧縮強度 [N/mm²]
 *       Ac: コーン状破壊面の有効水平投影面積 = π · ℓce · (ℓce + D) [mm²]
 *       ℓce: 有効埋込み長さ [mm]、D: アンカー径（または穿孔径）[mm]
 *     出典: 日本建築センター「建築設備耐震設計・施工指針」／日本建築あと施工アンカー協会
 *           （JCAA）「あと施工アンカー 設計・施工指針」のコーン状破壊式。
 * - 付着破壊（接着系アンカー）:
 *     Ta = τa · π · D · ℓce   [N]
 *       τa: 付着強度 [N/mm²] ← **メーカーの認定・試験証明書の値を入力**（勝手な既定値は使わない）
 * - 許容引抜き荷重 = min(コーン, 付着) ÷ 安全率。安全率は指針・使用条件で異なる（常時3・短期2 等）。
 *
 * 本計算は「証明書の値・設計式」から許容引抜き荷重を求め、設計引張力に対する安全率を判定する
 * 補助ツールです。縁端距離・アンカー間隔による低減、鋼材（アンカー筋）の降伏、支圧・せん断・
 * 群効果は含みません。実施工はメーカーの設計施工要領・認定内容に従ってください。
 *
 * 判定は決定論（AIは使わない）。
 */

import type { CalcCheckItem, CalcOutcome, CalcValues, ConstructionCalculator } from "../schema";
import { formatNumber } from "../schema";

/** コーン状破壊面の有効水平投影面積 Ac = π·ℓce·(ℓce + D) [mm²] */
export function coneProjectedArea(le: number, D: number): number {
  return Math.PI * le * (le + D);
}

/** コーン状破壊耐力 Tcb = 0.31·√(σB)·Ac [N] */
export function coneStrengthN(sigmaB: number, le: number, D: number): number {
  return 0.31 * Math.sqrt(sigmaB) * coneProjectedArea(le, D);
}

/** 付着破壊耐力 Ta = τa·π·D·ℓce [N]（τa は証明書の値） */
export function bondStrengthN(tauA: number, D: number, le: number): number {
  return tauA * Math.PI * D * le;
}

/** 安全率（select value → 数値） */
export const ANCHOR_SAFETY_FACTORS: Record<string, { factor: number; label: string }> = {
  longterm: { factor: 3, label: "常時（長期）安全率3" },
  shortterm: { factor: 2, label: "短期（地震時等）安全率2" },
};

function computeAnchorPullout(values: CalcValues): CalcOutcome {
  const designLoad = values.designLoad as number; // 設計引張力 [kN]
  const sigmaB = values.concreteStrength as number; // [N/mm²]
  const le = values.embedDepth as number; // 有効埋込み長さ [mm]
  const D = values.anchorDia as number; // アンカー径 [mm]
  const tauA = values.bondStrength as number; // 付着強度 [N/mm²]（0=未入力＝付着評価しない）
  const sfKey = values.safetyFactor as string;
  const sf = ANCHOR_SAFETY_FACTORS[sfKey]?.factor ?? 3;

  const Ac = coneProjectedArea(le, D);
  const coneN = coneStrengthN(sigmaB, le, D);
  const coneKn = coneN / 1000;
  const coneAllow = coneKn / sf;

  const hasBond = tauA > 0;
  const bondN = hasBond ? bondStrengthN(tauA, D, le) : 0;
  const bondKn = bondN / 1000;
  const bondAllow = hasBond ? bondKn / sf : Infinity;

  // 支配する許容引抜き荷重（評価したモードの最小）
  const governAllow = Math.min(coneAllow, bondAllow);
  const governMode = bondAllow < coneAllow ? "付着破壊" : "コーン状破壊";
  const safety = designLoad > 0 ? governAllow / designLoad : Infinity;
  const ok = governAllow >= designLoad;

  const items: CalcCheckItem[] = [
    { label: "コーン投影面積 Ac", value: `${formatNumber(Ac, 0)} mm²`, note: "π·ℓce·(ℓce+D)" },
    { label: "コーン状破壊耐力 Tcb", value: `${formatNumber(coneKn, 1)} kN`, note: "0.31·√σB·Ac" },
    {
      label: "付着破壊耐力 Ta",
      value: hasBond ? `${formatNumber(bondKn, 1)} kN（τa=${formatNumber(tauA, 1)}）` : "未評価（付着強度を未入力）",
      tone: hasBond ? undefined : "warning",
      note: hasBond ? "τa·π·D·ℓce" : "証明書のτaを入力すると評価します",
    },
    { label: `許容引抜き荷重（÷${sf}）`, value: `${formatNumber(governAllow, 1)} kN`, note: `支配: ${governMode}` },
    {
      label: "設計引張力 に対する安全率",
      value: designLoad > 0 ? `${formatNumber(safety, 2)} 倍（許容 ${formatNumber(governAllow, 1)} / 設計 ${formatNumber(designLoad, 1)}）` : "—",
      tone: ok ? "safe" : "danger",
    },
  ];

  const warnings: string[] = [];
  if (!hasBond) {
    warnings.push(
      "付着破壊（接着系アンカー）を評価していません。接着系アンカーでは付着破壊が支配することが多いため、必ずメーカーの認定・試験証明書の付着強度τaを入力して確認してください（勝手な既定値は用いません）。",
    );
  }
  if (!ok && designLoad > 0) {
    warnings.push(
      `許容引抜き荷重 ${formatNumber(governAllow, 1)}kN が設計引張力 ${formatNumber(designLoad, 1)}kN を下回ります。埋込み長さ・アンカー径・コンクリート強度の見直し、本数増、あるいはメーカー選定の再検討が必要です。`,
    );
  }
  warnings.push(
    "本計算は縁端距離・アンカー間隔（へりあき）による低減、鋼材（アンカー本体・アンカー筋）の降伏、せん断・支圧・群効果を含みません。これらはメーカーの設計施工要領・認定内容で必ず確認してください。",
  );
  warnings.push(
    "コーン状破壊式の係数（0.31·√σB·Ac）・安全率は指針・版により異なります。採用する指針（JCAA設計指針・建築設備耐震設計施工指針・各建築学会指針等）の最新版と、メーカーの認定条件を優先してください。",
  );
  warnings.push(
    "施工品質（穿孔径・清掃・注入・養生・へりあき）が引抜き耐力を大きく左右します。所定の施工手順と、必要に応じて現場引張試験（非破壊・破壊）で確認してください。",
  );

  return {
    tone: ok ? "safe" : "danger",
    headline: ok ? "引抜きOK（要確認）" : "引抜き不足",
    value: designLoad > 0 ? formatNumber(safety, 2) : formatNumber(governAllow, 1),
    unit: designLoad > 0 ? "倍" : "kN",
    summary: ok
      ? `許容引抜き荷重 約${formatNumber(governAllow, 1)}kN（支配: ${governMode}）が設計引張力 ${formatNumber(designLoad, 1)}kN を上回ります（安全率 ${formatNumber(safety, 2)}倍）。縁端距離・鋼材・付着は別途確認してください。`
      : `許容引抜き荷重 約${formatNumber(governAllow, 1)}kN（支配: ${governMode}）が設計引張力 ${formatNumber(designLoad, 1)}kN を下回ります。設計の見直しが必要です。`,
    items,
    steps: [
      `コーン投影面積 Ac = π·ℓce·(ℓce+D) = π·${formatNumber(le, 0)}·(${formatNumber(le, 0)}+${formatNumber(D, 0)}) = ${formatNumber(Ac, 0)} mm²`,
      `コーン状破壊耐力 Tcb = 0.31·√σB·Ac = 0.31·√${formatNumber(sigmaB, 0)}·${formatNumber(Ac, 0)} = ${formatNumber(coneN, 0)} N ≒ ${formatNumber(coneKn, 1)} kN`,
      hasBond
        ? `付着破壊耐力 Ta = τa·π·D·ℓce = ${formatNumber(tauA, 1)}·π·${formatNumber(D, 0)}·${formatNumber(le, 0)} = ${formatNumber(bondN, 0)} N ≒ ${formatNumber(bondKn, 1)} kN`
        : `付着破壊耐力 Ta = 未評価（付着強度τa未入力）`,
      `許容引抜き荷重 = min(コーン, 付着) ÷ 安全率${sf} = ${formatNumber(governAllow, 1)} kN（支配: ${governMode}）`,
      designLoad > 0
        ? `安全率 = 許容 ${formatNumber(governAllow, 1)} ÷ 設計引張力 ${formatNumber(designLoad, 1)} = ${formatNumber(safety, 2)} 倍 → ${ok ? "OK" : "NG"}`
        : `設計引張力を入力すると安全率を判定します`,
    ],
    warnings,
  };
}

export const anchorPulloutCalculator: ConstructionCalculator = {
  slug: "anchor-pullout",
  title: "あと施工アンカーの引抜き耐力（コーン破壊／付着）",
  shortTitle: "あと施工アンカー引抜き",
  summary:
    "コンクリート強度・埋込み長さ・アンカー径からコーン状破壊耐力を、証明書の付着強度から付着破壊耐力を求め、安全率で許容引抜き荷重を判定します。メーカー固有値は必ず認定・試験証明書の値を入力してください（勝手な既定値は使いません）。",
  fields: [
    {
      kind: "number",
      id: "designLoad",
      label: "設計引張力（1本あたり）",
      unit: "kN",
      min: 0,
      max: 500,
      step: 0.5,
      defaultValue: 10,
      help: "アンカー1本に作用する引張力。0にすると許容引抜き荷重のみ表示",
    },
    {
      kind: "number",
      id: "concreteStrength",
      label: "コンクリート圧縮強度 σB",
      unit: "N/mm²",
      min: 15,
      max: 60,
      step: 1,
      defaultValue: 21,
      help: "設計基準強度Fc（母材の実強度）。コーン状破壊の算定に使用",
    },
    {
      kind: "number",
      id: "embedDepth",
      label: "有効埋込み長さ ℓce",
      unit: "mm",
      min: 20,
      max: 400,
      step: 5,
      defaultValue: 100,
      help: "有効埋込み長さ。メーカーの最小埋込み長さ以上とすること",
    },
    {
      kind: "number",
      id: "anchorDia",
      label: "アンカー径 D",
      unit: "mm",
      min: 6,
      max: 50,
      step: 1,
      defaultValue: 12,
      help: "アンカー径（または穿孔径）。M12なら12",
    },
    {
      kind: "number",
      id: "bondStrength",
      label: "付着強度 τa（証明書の値）",
      unit: "N/mm²",
      min: 0,
      max: 25,
      step: 0.5,
      defaultValue: 0,
      help: "接着系アンカーの付着強度。必ずメーカーの認定・試験証明書の値を入力。0のままだと付着評価をスキップ（勝手な既定値は使いません）",
      aiOptional: true,
    },
    {
      kind: "select",
      id: "safetyFactor",
      label: "安全率",
      options: [
        { value: "longterm", label: "常時（長期）安全率3" },
        { value: "shortterm", label: "短期（地震時等）安全率2" },
      ],
      defaultValue: "longterm",
      help: "採用する指針・使用条件で異なります。指針の最新版で確認してください",
      aiOptional: true,
    },
  ],
  basis: [
    {
      label: "コーン状破壊式 Tcb＝0.31·√(σB)·Ac（Ac＝π·ℓce·(ℓce+D)）",
      description:
        "日本建築センター「建築設備耐震設計・施工指針」／日本建築あと施工アンカー協会（JCAA）設計指針のコーン状破壊耐力式。係数は採用指針の最新版で確認してください。",
    },
    {
      label: "付着破壊式 Ta＝τa·π·D·ℓce（τaは証明書の値）",
      description:
        "接着系アンカーの付着破壊耐力。付着強度τaはメーカーの大臣認定・第三者試験の証明書の値を用います（本サイトは既定値を持ちません）。",
    },
    {
      label: "メーカーの設計・施工要領書／大臣認定",
      description:
        "縁端距離・アンカー間隔・最小埋込み長さ・許容引抜き荷重表・施工手順は各製品の認定内容に従ってください。本計算は概算の確認補助です。",
    },
  ],
  cautions: [
    "本計算はコーン状破壊・付着破壊の概算のみで、縁端距離・アンカー間隔（へりあき）低減、鋼材（アンカー本体・アンカー筋）の降伏、せん断・支圧・群効果は含みません。",
    "付着強度τa・許容引抜き荷重・安全率・コーン式の係数は、採用する指針の版とメーカーの認定条件で必ず確認してください。勝手な既定値は用いていません（τa未入力時は付着評価をスキップ）。",
    "施工品質（穿孔径・孔内清掃・注入・養生・へりあき）が耐力を大きく左右します。重要部位は現場引張試験で確認してください。",
  ],
  examples: [
    {
      label: "M12・埋込100mm・Fc21・常時（付着未入力＝コーンのみ）",
      values: { designLoad: 10, concreteStrength: 21, embedDepth: 100, anchorDia: 12, bondStrength: 0, safetyFactor: "longterm" },
    },
    {
      label: "接着系 M16・埋込125mm・Fc24・τa10（証明書値）",
      values: { designLoad: 20, concreteStrength: 24, embedDepth: 125, anchorDia: 16, bondStrength: 10, safetyFactor: "longterm" },
    },
    {
      label: "地震時（安全率2）M12・埋込100mm・Fc21",
      values: { designLoad: 15, concreteStrength: 21, embedDepth: 100, anchorDia: 12, bondStrength: 0, safetyFactor: "shortterm" },
    },
  ],
  keywords: [
    "アンカー",
    "あと施工アンカー",
    "引抜き",
    "引張",
    "コーン破壊",
    "付着",
    "接着系",
    "金属拡張",
    "ケミカル",
    "埋込み",
    "定着",
    "耐力",
  ],
  compute: computeAnchorPullout,
};
