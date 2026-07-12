/**
 * 型枠の側圧（フレッシュコンクリート打込み時）— 液圧近似（安全側の上限）
 *
 * 根拠・出典:
 * - 日本建築学会「型枠の設計・施工指針」／JASS5 の側圧算定式のうち、一次資料で確定できる
 *   液圧近似（下限＝安全側の上限値）を採用する:
 *     P = W・H （W=フレッシュコンクリートの単位体積重量 ≒23.5kN/m³、H=打込み高さ）
 *   打上り速度・コンクリート温度・打込み方法による低減（H1・最大側圧の低減表）は、
 *   JASS5／土木学会「コンクリート標準示方書」の版により係数・表が異なり、本サイトで
 *   一次資料まで確度高く確定できていない。**そのため本計算は液圧近似のみを提供し、
 *   速度・温度による低減は行わない（＝常に安全側＝上限側の値を返す）**。低減を見込む設計は
 *   採用する指針の最新版の表で必ず確認すること（BACKLOG-construction-calc.md 運用メモ）。
 * - 土木工事は土木学会「コンクリート標準示方書」の側圧算定式が適用される（建築/土木で
 *   参照する指針が異なるため select で分ける）。液圧近似の考え方・上限としての位置づけは共通。
 *
 * 判定は決定論（AIは使わない）。セパレータ・端太・支保工の断面照査は含まない
 * （型枠支保工の基準チェック `formwork-shoring-check` を参照）。
 */

import type { CalcCheckItem, CalcOutcome, CalcValues, ConstructionCalculator } from "../schema";
import { formatNumber } from "../schema";

export type FormworkBuildType = "building" | "civil";

export const FORMWORK_BUILD_TYPE_LABELS: Record<FormworkBuildType, string> = {
  building: "建築（JASS5 / 型枠の設計・施工指針）",
  civil: "土木（コンクリート標準示方書）",
};

/** 液圧近似（上限）: P = W・H [kN/m²]（打込み高さH位置＝型枠下端の最大側圧） */
export function liquidPressureApprox(W: number, H: number): number {
  return W * H;
}

/** 液圧近似の合力（三角形分布を仮定した参考値）[kN/m] */
export function liquidPressureResultant(W: number, H: number): number {
  return 0.5 * W * H * H;
}

function computeFormworkLateralPressure(values: CalcValues): CalcOutcome {
  const buildType = values.buildType as FormworkBuildType;
  const W = values.unitWeight as number;
  const H = values.pourHeight as number;
  const R = values.pourRate as number;
  const T = values.concreteTemp as number;

  const P = liquidPressureApprox(W, H);
  const resultant = liquidPressureResultant(W, H);
  const guideName =
    buildType === "building" ? "JASS5 / 型枠の設計・施工指針" : "土木学会 コンクリート標準示方書";

  const items: CalcCheckItem[] = [
    { label: "適用区分", value: FORMWORK_BUILD_TYPE_LABELS[buildType] },
    { label: "単位体積重量 W", value: `${formatNumber(W, 1)} kN/m³` },
    { label: "打込み高さ H", value: `${formatNumber(H, 2)} m` },
    {
      label: "最大側圧 P（液圧近似・上限）",
      value: `${formatNumber(P, 1)} kN/m²`,
      tone: "warning",
      note: "P = W・H（打込み高さ位置＝型枠下端）",
    },
    {
      label: "側圧の合力（三角形分布・参考）",
      value: `${formatNumber(resultant, 1)} kN/m`,
      note: "セパレータ・端太の配置間隔検討の参考値（三角形分布を仮定）",
    },
    { label: "打上り速度 R（参考・低減は未計算）", value: `${formatNumber(R, 1)} m/h` },
    { label: "コンクリート温度（参考・低減は未計算）", value: `${formatNumber(T, 0)} ℃` },
  ];

  const warnings: string[] = [
    `本計算は液圧近似（安全側の上限値）のみを提供します。打上り速度${formatNumber(R, 1)}m/h・コンクリート温度${formatNumber(T, 0)}℃による側圧の低減は行っていません。低減を見込む設計は${guideName}の最新版にある打上り速度・温度別の側圧表（H1等）で必ず確認してください（版により係数・表が異なるため、確度未確認の数値は掲載していません）。`,
    "急速な打込み・低温（コンクリートの凝結が遅い）ほど実際の側圧は液圧近似に近づきます。打上り速度が速い、または気温が低い条件では特に安全側（本計算値）で検討してください。",
    "セパレータ・端太・パイプサポート等の支保工の断面照査は本計算に含みません。型枠支保工の基準チェックと合わせて確認してください。",
    "締固め（棒形振動機）の使用は局部的に側圧を増大させます。バイブレータの挿入間隔・深さに応じた割増を別途考慮してください。",
  ];

  return {
    tone: "warning",
    headline: "最大側圧（液圧近似）を算定",
    value: formatNumber(P, 1),
    unit: "kN/m²",
    summary: `${FORMWORK_BUILD_TYPE_LABELS[buildType]}区分・打込み高さ${formatNumber(H, 2)}mで、液圧近似による最大側圧は約 ${formatNumber(P, 1)} kN/m²（合力 約${formatNumber(resultant, 1)}kN/m）です。速度・温度による低減は行っていません（常に安全側の上限）。`,
    items,
    steps: [
      `最大側圧 P = W・H = ${formatNumber(W, 1)} × ${formatNumber(H, 2)} = ${formatNumber(P, 2)} kN/m²`,
      `合力（三角形分布・参考） = ½・W・H² = ½ × ${formatNumber(W, 1)} × ${formatNumber(H, 2)}² = ${formatNumber(resultant, 2)} kN/m`,
      `打上り速度・温度による低減は${guideName}の速度・温度別表で個別に確認（本計算は未適用＝上限側）`,
    ],
    warnings,
  };
}

export const formworkLateralPressureCalculator: ConstructionCalculator = {
  slug: "formwork-lateral-pressure",
  title: "型枠の側圧（コンクリート打込み・液圧近似）",
  shortTitle: "型枠側圧",
  summary:
    "フレッシュコンクリートの単位体積重量と打込み高さから、型枠側圧の液圧近似（安全側の上限値）P=W・Hを算定します。打上り速度・温度による低減はJASS5／コンクリート標準示方書の最新版で個別確認が必要なため、本計算では見込みません（常に上限側）。",
  fields: [
    {
      kind: "select",
      id: "buildType",
      label: "適用区分",
      options: [
        { value: "building", label: "建築（JASS5）" },
        { value: "civil", label: "土木（コンクリート標準示方書）" },
      ],
      defaultValue: "building",
      help: "参照する指針が異なります。液圧近似の考え方は共通",
    },
    {
      kind: "number",
      id: "unitWeight",
      label: "フレッシュコンクリートの単位体積重量 W",
      unit: "kN/m³",
      min: 20,
      max: 26,
      step: 0.1,
      defaultValue: 23.5,
      help: "一般的な普通コンクリートで概ね23.5kN/m³（配合・骨材で変動）",
    },
    {
      kind: "number",
      id: "pourHeight",
      label: "打込み高さ H",
      unit: "m",
      min: 0.5,
      max: 10,
      step: 0.1,
      defaultValue: 3,
      help: "型枠の高さ、または一回に連続して打ち込む高さ",
    },
    {
      kind: "number",
      id: "pourRate",
      label: "打上り速度 R（参考）",
      unit: "m/h",
      min: 1,
      max: 30,
      step: 0.5,
      defaultValue: 8,
      help: "指針の速度別表を確認する際の参考値。本計算の側圧低減には使用しません",
      aiOptional: true,
    },
    {
      kind: "number",
      id: "concreteTemp",
      label: "コンクリート温度（参考）",
      unit: "℃",
      min: 0,
      max: 35,
      step: 1,
      defaultValue: 20,
      help: "低温ほど凝結が遅く側圧が大きくなる傾向。本計算の側圧低減には使用しません",
      aiOptional: true,
    },
  ],
  basis: [
    {
      label: "液圧近似 P = W・H（日本建築学会「型枠の設計・施工指針」／JASS5）",
      description:
        "フレッシュコンクリートを液体とみなした側圧の上限値。打上り速度・温度による低減は指針の版により係数・表が異なるため、本計算には含めていません（低減を見込む場合は指針の最新版で確認）。",
    },
    {
      label: "土木学会「コンクリート標準示方書」（土木工事の側圧算定基準）",
      description: "土木工事の型枠側圧は本示方書の算定式に従います。液圧近似の考え方・上限としての位置づけは建築と共通です。",
    },
    {
      label: "労働安全衛生規則 第237条〜第242条（型枠支保工についての措置）",
      description: "型枠支保工の材料・構造・組立図・部材の措置等。断面照査は型枠支保工の基準チェックと合わせて確認してください。",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000032#Mp-At_242",
    },
  ],
  cautions: [
    "本計算は側圧の液圧近似（安全側の上限値）のみを提供します。打上り速度・コンクリート温度・打込み方法による低減は含まれません（指針の最新版の表で個別に確認してください）。",
    "セパレータ・端太・パイプサポート等の支保工の断面照査、締固めによる局部的な側圧増大の検討は含みません。",
    "配合（スランプ・骨材）・添加剤（凝結遅延剤等）により実際の側圧は変動します。特殊な配合の場合は専門技術者に確認してください。",
  ],
  examples: [
    { label: "建築・打込み高さ3m（標準）", values: { buildType: "building", unitWeight: 23.5, pourHeight: 3, pourRate: 8, concreteTemp: 20 } },
    { label: "建築・打込み高さ4m・急速打込み(15m/h)", values: { buildType: "building", unitWeight: 23.5, pourHeight: 4, pourRate: 15, concreteTemp: 10 } },
    { label: "土木・打込み高さ5m", values: { buildType: "civil", unitWeight: 23.5, pourHeight: 5, pourRate: 8, concreteTemp: 20 } },
  ],
  keywords: [
    "型枠",
    "側圧",
    "型枠側圧",
    "打込み",
    "打設",
    "打上り速度",
    "JASS5",
    "コンクリート標準示方書",
    "セパレータ",
    "端太",
    "支保工",
    "フレッシュコンクリート",
    "液圧",
  ],
  relatedSlugs: ["formwork-shoring-check"],
  compute: computeFormworkLateralPressure,
};
