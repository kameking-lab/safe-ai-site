/**
 * 電線（600V IV）の許容電流チェック（内線規程・電流減少係数）＋安衛則の結線
 *
 * 根拠（出典明記）:
 * - 内線規程（JEAC 8001）資料「絶縁電流の許容電流」: 600V ビニル絶縁電線（IV）の
 *   許容電流（周囲温度30℃以下・がいし引き配線＝単独/気中の基準値）を代表値として収録。
 *   内線規程は法令ではなく民間規程だが、電気設備の設計・施工で広く準用される。
 * - 同 電流減少係数: 同一の管・線ぴ・ダクト等に収める電線数による低減係数
 *   （3本以下0.70・4本0.63・5〜6本0.56・7〜15本0.49）。
 * - 労働安全衛生規則 第339条（停電作業）・第349条（架空電線等の充電電路に近接する作業）:
 *   電気工事・近接作業の安全措置（本サイトの安衛法資産との結線）。
 *
 * 判定は決定論的なしきい値チェック（AIは使わない）。※本計算は概算・参考値。
 */

import type { CalcOutcome, CalcValues, ConstructionCalculator } from "../schema";
import { formatNumber } from "../schema";

/**
 * 600V IV電線 許容電流 [A]（内線規程・周囲温度30℃以下・がいし引き＝単独/気中の基準値）。
 * より線は公称断面積[mm²]、単線は直径[mm]で表記。
 */
export const IV_AMPACITY_A: Record<string, { label: string; amp: number }> = {
  "1.6": { label: "単線 1.6mm", amp: 27 },
  "2.0": { label: "単線 2.0mm", amp: 35 },
  "2.6": { label: "単線 2.6mm", amp: 48 },
  "5.5": { label: "より線 5.5mm²", amp: 49 },
  "8": { label: "より線 8mm²", amp: 61 },
  "14": { label: "より線 14mm²", amp: 88 },
  "22": { label: "より線 22mm²", amp: 115 },
  "38": { label: "より線 38mm²", amp: 162 },
  "60": { label: "より線 60mm²", amp: 217 },
  "100": { label: "より線 100mm²", amp: 298 },
};

/** 電流減少係数（同一管・ダクト内の電線数） */
export const CURRENT_REDUCTION: Record<string, { label: string; factor: number }> = {
  air: { label: "がいし引き・単独（低減なし）", factor: 1.0 },
  "3": { label: "同一管内 3本以下", factor: 0.7 },
  "4": { label: "同一管内 4本", factor: 0.63 },
  "6": { label: "同一管内 5〜6本", factor: 0.56 },
  "15": { label: "同一管内 7〜15本", factor: 0.49 },
};

function computeCableAmpacity(values: CalcValues): CalcOutcome {
  const size = String(values.size);
  const install = String(values.install);
  const currentA = values.currentA as number; // 使用電流（負荷電流）

  const base = IV_AMPACITY_A[size] ?? IV_AMPACITY_A["5.5"];
  const reduction = CURRENT_REDUCTION[install] ?? CURRENT_REDUCTION.air;
  const allowableA = base.amp * reduction.factor;
  const ok = currentA <= allowableA + 1e-9;
  const utilization = allowableA > 0 ? (currentA / allowableA) * 100 : 0;

  const warnings: string[] = [];
  if (!ok) {
    warnings.push(
      `使用電流 ${formatNumber(currentA, 0)}A が許容電流 ${formatNumber(allowableA, 0)}A を超えています。太い電線への変更・回路分割・収容本数の見直しが必要です。`,
    );
  } else if (utilization > 80) {
    warnings.push(
      `許容電流に対する使用率が${formatNumber(utilization, 0)}%です。連続負荷・周囲温度が高い場合は余裕を見て太めの電線を選定してください。`,
    );
  }
  warnings.push(
    "許容電流は内線規程の代表値（周囲温度30℃以下）です。周囲温度が高い・多条布設・直射日光下では低減が必要です。電圧降下・過電流保護（ブレーカ定格）も別途確認してください。",
  );
  warnings.push(
    "電気工事・停電作業では検電・短絡接地・作業指揮者の選任等の措置が必要です（安衛則339条）。架空電線等の充電電路に近接する作業では絶縁用防具の装着・離隔等の措置が必要です（同349条）。",
  );

  return {
    tone: ok ? "safe" : "danger",
    headline: ok ? "許容電流内" : "許容超過",
    value: formatNumber(allowableA, 0),
    unit: "A",
    summary: ok
      ? `${base.label}（${reduction.label}）の許容電流は${formatNumber(allowableA, 0)}Aで、使用電流${formatNumber(currentA, 0)}Aは範囲内です（使用率${formatNumber(utilization, 0)}%）。`
      : `${base.label}（${reduction.label}）の許容電流${formatNumber(allowableA, 0)}Aに対し、使用電流${formatNumber(currentA, 0)}Aは超過しています。`,
    items: [
      { label: "許容電流（この施設条件）", value: `${formatNumber(allowableA, 0)}A`, tone: ok ? "safe" : "danger" },
      { label: "使用電流（負荷電流）", value: `${formatNumber(currentA, 0)}A`, tone: ok ? "safe" : "danger" },
      { label: "電線", value: base.label, note: `基準許容電流 ${base.amp}A（30℃・がいし引き）` },
      { label: "施設条件・電流減少係数", value: `${reduction.label}（×${formatNumber(reduction.factor, 2)}）` },
      { label: "許容電流に対する使用率", value: `${formatNumber(utilization, 0)}%`, tone: utilization > 80 ? "warning" : undefined },
    ],
    steps: [
      `基準許容電流（${base.label}・30℃・がいし引き）= ${base.amp}A`,
      `電流減少係数（${reduction.label}）= ${formatNumber(reduction.factor, 2)}`,
      `許容電流 = ${base.amp}A × ${formatNumber(reduction.factor, 2)} = ${formatNumber(allowableA, 0)}A`,
      `判定: 使用電流 ${formatNumber(currentA, 0)}A ${ok ? "≤" : ">"} 許容電流 ${formatNumber(allowableA, 0)}A → ${ok ? "許容電流内" : "許容超過"}`,
    ],
    warnings,
  };
}

export const cableAmpacityCalculator: ConstructionCalculator = {
  slug: "cable-ampacity",
  title: "電線（600V IV）の許容電流チェック（内線規程）",
  shortTitle: "電線許容電流",
  summary:
    "電線サイズと施設条件（同一管内の本数＝電流減少係数）から許容電流を求め、使用電流が範囲内かを判定します。許容電流は内線規程の代表値を出典明記で収録し、停電・近接作業の安衛則（339・349条）にも結線します。",
  fields: [
    {
      kind: "select",
      id: "size",
      label: "電線サイズ（600V IV）",
      options: Object.keys(IV_AMPACITY_A).map((k) => ({ value: k, label: IV_AMPACITY_A[k].label })),
      defaultValue: "5.5",
    },
    {
      kind: "select",
      id: "install",
      label: "施設条件（同一管・ダクト内の電線数）",
      options: Object.keys(CURRENT_REDUCTION).map((k) => ({ value: k, label: CURRENT_REDUCTION[k].label })),
      defaultValue: "3",
      help: "同一管に多く収めるほど許容電流は下がります",
    },
    {
      kind: "number",
      id: "currentA",
      label: "使用電流（負荷電流）",
      unit: "A",
      min: 0.1,
      max: 400,
      step: 1,
      defaultValue: 20,
      help: "この回路に流す想定の電流",
    },
  ],
  basis: [
    {
      label: "内線規程（JEAC 8001）絶縁電線の許容電流・電流減少係数",
      description:
        "600V ビニル絶縁電線（IV）の許容電流（周囲温度30℃以下・がいし引き基準値）と、同一管・ダクト内の電線数による電流減少係数（3本以下0.70・4本0.63・5〜6本0.56・7〜15本0.49）。内線規程は民間規程（技術資料）で、収録値は代表値です。",
    },
    {
      label: "労働安全衛生規則 第339条（停電作業を行なう場合の措置）",
      description: "検電・短絡接地・開路した開閉器の施錠等、停電作業の安全措置。",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000032#Mp-At_339",
    },
    {
      label: "労働安全衛生規則 第349条（工作物の建設等の作業を行なう場合の感電の防止）",
      description: "架空電線等の充電電路に近接する作業での離隔・絶縁用防具・監視人等の措置。",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000032#Mp-At_349",
    },
  ],
  cautions: [
    "許容電流は内線規程の代表値（周囲温度30℃以下）です。高温環境・直射日光・多条布設では低減が必要で、本計算は概算です。",
    "電圧降下・過電流保護（ブレーカ・ヒューズ定格）・地絡保護は本計算に含みません。別途検討してください。",
    "電気工事は電気工事士等の有資格者が施工してください。停電・近接作業は安衛則の措置（339・349条）を遵守してください。",
  ],
  examples: [
    { label: "5.5mm² 同一管3本・20A", values: { size: "5.5", install: "3", currentA: 20 } },
    { label: "14mm² 同一管6本・50A", values: { size: "14", install: "6", currentA: 50 } },
  ],
  keywords: [
    "電線",
    "許容電流",
    "電流",
    "アンペア",
    "IV",
    "ケーブル",
    "断面積",
    "スケア",
    "sq",
    "電流減少係数",
    "内線規程",
    "電気",
    "感電",
    "停電作業",
  ],
  compute: computeCableAmpacity,
};
