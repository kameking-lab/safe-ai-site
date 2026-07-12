/**
 * 安全ネット（防網）の基準チェック（落下高さ・ネットの垂れ・ネット下部の空き）
 *
 * 根拠（一次資料: 労働省告示。数値は告示原文の式のみ採用し、確定できない項目は判定に用いない）:
 * - 墜落による危険を防止するためのネットの構造等の安全基準に関する技術上の指針
 *   （労働安全衛生法第28条第1項に基づき公表。中央労働災害防止協会 安全衛生情報センター収録）
 *   ４−１−１ 落下高さ H1（作業床等とネット取付け位置の垂直距離の上限）:
 *     単体ネット: L<Aのとき H1=0.25(L+2A) ／ L≥Aのとき H1=0.75L
 *     複合ネット: L<Aのとき H1=0.20(L+2A) ／ L≥Aのとき H1=0.60L
 *   ４−１−２ ネットの垂れ S（上限。単体・複合とも同じ式）:
 *     L<Aのとき S=0.25(L+2A)/3 ／ L≥Aのとき S=0.75L/3
 *   ４−１−３ ネット下部の空き H2（下限）:
 *     10cm網目: L<Aのとき H2=0.85(L+3A)/4 ／ L≥Aのとき H2=0.85L
 *     5cm網目 : L<Aのとき H2=0.95(L+3A)/4 ／ L≥Aのとき H2=0.95L
 *   （L=ネットの短辺の長さ[m]、A=支持点の間隔[m]）
 *   ４−２−１ 支持点の強度: 600kgの外力に耐えること。ただし連続的な架構物の支持点は
 *     F=200B（B=支持点間隔[m]、単位kg）に耐えるものであれば足りる。
 * - 労働安全衛生規則 第518条第2項・第519条第2項（作業床・囲い等の設置が困難なときの防網代替措置）。
 * - 上記以外の数値（使用期間の判定基準・網目以外の寸法の補間値等）は本計算機の判定には用いない。
 *
 * 判定は決定論的なしきい値チェック（AIは使わない）。
 */

import type { CalcOutcome, CalcValues, ConstructionCalculator } from "../schema";
import { formatNumber } from "../schema";

export type NetType = "single" | "composite";
export type MeshSize = "10" | "5";

export const NET_TYPE_LABELS: Record<NetType, string> = {
  single: "単体ネット",
  composite: "複合ネット",
};

export const MESH_SIZE_LABELS: Record<MeshSize, string> = {
  "10": "10cm網目",
  "5": "5cm網目",
};

export type NetLimits = {
  fallHeightMaxM: number;
  slackMaxM: number;
  clearanceMinM: number;
};

/** 告示の式により、落下高さ上限H1・ネットの垂れ上限S・ネット下部の空き下限H2を求める */
export function netLimits(params: { netType: NetType; meshSize: MeshSize; shortSideL: number; supportSpacingA: number }): NetLimits {
  const { netType, meshSize, shortSideL: L, supportSpacingA: A } = params;
  const lLtA = L < A;

  const fallHeightMaxM =
    netType === "single"
      ? lLtA
        ? 0.25 * (L + 2 * A)
        : 0.75 * L
      : lLtA
        ? 0.2 * (L + 2 * A)
        : 0.6 * L;

  // ネットの垂れは単体・複合を区別せず、告示の式（0.25/0.75の係数）をそのまま用いる
  const slackMaxM = (lLtA ? 0.25 * (L + 2 * A) : 0.75 * L) / 3;

  const meshCoefficient = meshSize === "10" ? 0.85 : 0.95;
  const clearanceMinM = lLtA ? (meshCoefficient * (L + 3 * A)) / 4 : meshCoefficient * L;

  return { fallHeightMaxM, slackMaxM, clearanceMinM };
}

function computeSafetyNetCheck(values: CalcValues): CalcOutcome {
  const netType = String(values.netType) as NetType;
  const meshSize = String(values.meshSize) as MeshSize;
  const shortSideL = values.shortSideL as number;
  const supportSpacingA = values.supportSpacingA as number;
  const plannedFallHeightM = values.plannedFallHeightM as number;
  const clearanceBelowM = values.clearanceBelowM as number;

  const { fallHeightMaxM, slackMaxM, clearanceMinM } = netLimits({
    netType,
    meshSize,
    shortSideL,
    supportSpacingA,
  });

  const fallHeightOk = plannedFallHeightM <= fallHeightMaxM + 1e-9;
  const clearanceOk = clearanceBelowM >= clearanceMinM - 1e-9;
  const ok = fallHeightOk && clearanceOk;

  const supportForceGeneralKg = 600;
  const supportForceContinuousKg = 200 * supportSpacingA;

  const warnings: string[] = [];
  if (!fallHeightOk) {
    warnings.push(
      `落下高さ${formatNumber(plannedFallHeightM, 2)}mが上限${formatNumber(fallHeightMaxM, 2)}mを超えています。ネット取付け位置を高くする、支持点間隔Aを詰める等の見直しが必要です。`,
    );
  }
  if (!clearanceOk) {
    warnings.push(
      `ネット下部の空き${formatNumber(clearanceBelowM, 2)}mが下限${formatNumber(clearanceMinM, 2)}mを下回っています。取付け位置を上げる、下方の障害物を除く等の措置が必要です。`,
    );
  }
  warnings.push(
    `ネットの垂れは${formatNumber(slackMaxM, 2)}m以下となるように張ってください（告示４−１−２）。垂れが大きすぎる場合は落下高さ・下部の空きの計算が成立しません。`,
  );
  warnings.push(
    `支持点は原則600kgの外力に耐える強度が必要です（連続的な架構物の場合は F=200×支持点間隔=${formatNumber(supportForceContinuousKg, 0)}kg に耐えるものでも可）。`,
  );
  warnings.push(
    "網目の大きさ（10cm以下）・縁綱/仕立て・使用期間ごとの等速引張試験・墜落制止用器具との併用は本計算の範囲外です。告示の該当項目・仮設工業会の認定品仕様で確認してください。",
  );
  warnings.push(
    "作業床の設置が困難な場合の代替措置（安衛則第518条第2項・第519条第2項）として防網を使用する場合も、可能な限り作業床の設置を優先してください。",
  );

  return {
    tone: ok ? "safe" : "danger",
    headline: ok ? "基準適合" : "基準超過",
    value: formatNumber(fallHeightMaxM, 2),
    unit: "m",
    summary: ok
      ? `${NET_TYPE_LABELS[netType]}・${MESH_SIZE_LABELS[meshSize]}（L=${formatNumber(shortSideL, 1)}m・A=${formatNumber(supportSpacingA, 1)}m）で、落下高さ${formatNumber(plannedFallHeightM, 2)}m（上限${formatNumber(fallHeightMaxM, 2)}m）・ネット下部の空き${formatNumber(clearanceBelowM, 2)}m（下限${formatNumber(clearanceMinM, 2)}m）はいずれも基準に適合します。`
      : `落下高さ・ネット下部の空きのいずれかが告示の基準を超えています。`,
    items: [
      { label: "落下高さ（実際）", value: `${formatNumber(plannedFallHeightM, 2)}m`, tone: fallHeightOk ? "safe" : "danger", note: `上限 ${formatNumber(fallHeightMaxM, 2)}m` },
      { label: "ネット下部の空き（実際）", value: `${formatNumber(clearanceBelowM, 2)}m`, tone: clearanceOk ? "safe" : "danger", note: `下限 ${formatNumber(clearanceMinM, 2)}m` },
      { label: "ネットの垂れ（上限）", value: `${formatNumber(slackMaxM, 2)}m以下` },
      { label: "ネット種別・網目", value: `${NET_TYPE_LABELS[netType]}・${MESH_SIZE_LABELS[meshSize]}` },
      { label: "L（短辺長さ）・A（支持点間隔）", value: `L=${formatNumber(shortSideL, 1)}m・A=${formatNumber(supportSpacingA, 1)}m` },
      { label: "支持点強度（原則／連続架構物の特例）", value: `${supportForceGeneralKg}kg／${formatNumber(supportForceContinuousKg, 0)}kg` },
    ],
    steps: [
      `L${formatNumber(shortSideL, 1)}m ${shortSideL < supportSpacingA ? "<" : "≥"} A${formatNumber(supportSpacingA, 1)}m の区分で告示の式を適用`,
      `落下高さ上限 H1 = ${formatNumber(fallHeightMaxM, 2)}m（${NET_TYPE_LABELS[netType]}）`,
      `ネットの垂れ上限 S = ${formatNumber(slackMaxM, 2)}m`,
      `ネット下部の空き下限 H2 = ${formatNumber(clearanceMinM, 2)}m（${MESH_SIZE_LABELS[meshSize]}）`,
      `判定: 落下高さ ${formatNumber(plannedFallHeightM, 2)}m ${fallHeightOk ? "≤" : ">"} ${formatNumber(fallHeightMaxM, 2)}m ／ 下部の空き ${formatNumber(clearanceBelowM, 2)}m ${clearanceOk ? "≥" : "<"} ${formatNumber(clearanceMinM, 2)}m → ${ok ? "基準適合" : "基準超過"}`,
    ],
    warnings,
  };
}

export const safetyNetCheckCalculator: ConstructionCalculator = {
  slug: "safety-net-check",
  title: "安全ネット（防網）の基準チェック",
  shortTitle: "安全ネット基準チェック",
  summary:
    "墜落防止用の安全ネット（防網）について、告示の式から落下高さの上限・ネット下部の空きの下限を求め、実際の設置条件が基準に適合するかチェックします。",
  fields: [
    {
      kind: "select",
      id: "netType",
      label: "ネットの種類",
      options: [
        { value: "single", label: "単体ネット" },
        { value: "composite", label: "複合ネット（複数枚を組み合わせ）" },
      ],
      defaultValue: "single",
    },
    {
      kind: "select",
      id: "meshSize",
      label: "網目の大きさ",
      options: [
        { value: "10", label: "10cm網目" },
        { value: "5", label: "5cm網目" },
      ],
      defaultValue: "10",
    },
    {
      kind: "number",
      id: "shortSideL",
      label: "L（ネットの短辺の長さ）",
      unit: "m",
      min: 0.5,
      max: 20,
      step: 0.1,
      defaultValue: 3,
      help: "複合ネットは構成する各ネットの短辺のうち最小のもの",
    },
    {
      kind: "number",
      id: "supportSpacingA",
      label: "A（ネット周辺の支持点の間隔）",
      unit: "m",
      min: 0.5,
      max: 20,
      step: 0.1,
      defaultValue: 3,
    },
    {
      kind: "number",
      id: "plannedFallHeightM",
      label: "落下高さ（作業床とネット取付け位置の垂直距離・実際）",
      unit: "m",
      min: 0.1,
      max: 30,
      step: 0.1,
      defaultValue: 2,
    },
    {
      kind: "number",
      id: "clearanceBelowM",
      label: "ネット下部の空き（実際）",
      unit: "m",
      min: 0,
      max: 30,
      step: 0.1,
      defaultValue: 3,
      help: "ネット取付け位置から下方の床面・機械設備までの垂直距離",
    },
  ],
  basis: [
    {
      label: "墜落による危険を防止するためのネットの構造等の安全基準に関する技術上の指針（労働省告示・労働安全衛生法第28条第1項）",
      description:
        "落下高さH1（上限）・ネットの垂れS（上限）・ネット下部の空きH2（下限）を、L（ネットの短辺の長さ）・A（支持点の間隔）から計算する式を定めています。網目・縁綱・強度試験・支持点の強度（600kg）等の基準も含みますが、本計算機は式が明確な落下高さ・下部の空きの判定のみ行います。",
    },
    {
      label: "労働安全衛生規則 第518条（作業床の設置等・防網による代替措置）",
      description: "高さ2m以上の箇所で作業床の設置が困難なとき、防網を張り墜落制止用器具を使用させる等の措置を定めています。",
      lawNaviPath: "/law-navi/347M50002000032/518",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000032#Mp-At_518",
    },
    {
      label: "労働安全衛生規則 第519条（作業床の端・開口部等の囲い等・防網による代替措置）",
      description: "作業床の端・開口部等で囲い等の設置が著しく困難なとき、防網を張る等の措置を定めています。",
      lawNaviPath: "/law-navi/347M50002000032/519",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000032#Mp-At_519",
    },
  ],
  cautions: [
    "本計算機は告示の式が明確な「落下高さ」「ネット下部の空き」「ネットの垂れ」のみを判定します。網目の大きさ・縁綱や仕立ての基準・定期試験（等速引張試験）・支持点の応力の詳細は告示原文・製品の仕様書で確認してください。",
    "安全ネットは作業床の設置が困難な場合の代替措置です。可能な限り作業床の設置を優先し、要求性能墜落制止用器具の併用も検討してください。",
    "使用期限・損傷・有毒ガスへの暴露があったネットは使用できません（告示４−６）。使用前に必ず点検してください。",
  ],
  examples: [
    { label: "単体ネット・10cm網目・L=A=3m", values: { netType: "single", meshSize: "10", shortSideL: 3, supportSpacingA: 3, plannedFallHeightM: 2.0, clearanceBelowM: 2.6 } },
    { label: "単体ネット・10cm網目・L=2m<A=4m（基準超過の例）", values: { netType: "single", meshSize: "10", shortSideL: 2, supportSpacingA: 4, plannedFallHeightM: 3.0, clearanceBelowM: 2.5 } },
    { label: "複合ネット・5cm網目・L=A=3m", values: { netType: "composite", meshSize: "5", shortSideL: 3, supportSpacingA: 3, plannedFallHeightM: 1.5, clearanceBelowM: 3.0 } },
  ],
  keywords: [
    "安全ネット",
    "防網",
    "落下高さ",
    "ネットの垂れ",
    "墜落防止",
    "墜落制止用器具",
    "開口部",
    "作業床",
    "たるみ",
  ],
  compute: computeSafetyNetCheck,
};
