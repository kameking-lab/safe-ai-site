/**
 * 足場荷重の集計（自重＋積載→建地1本負担）
 *
 * 根拠:
 * - 労働安全衛生規則 第562条（最大積載荷重）: 足場の構造・材料に応じた作業床の最大積載荷重を
 *   定め、これを超えて積載してはならない。
 * - 労働安全衛生規則 第571条1項4号（令別表第八第一号の部材等を用いる鋼管足場＝単管足場）:
 *   建地間の積載荷重は400キログラムを限度とする。
 * - 労働安全衛生規則 第570条（鋼管足場の脚部・敷板・根がらみ等）。
 *
 * 建地1本負担 = （足場自重合計 ＋ 作業床の積載荷重 w × 総作業床面積）／ 建地本数
 * （建地間で均等に負担すると仮定した概算。隅角部・妻側建地は負担が大きくなる場合がある）
 *
 * 1スパンあたりの積載荷重 = w × 1スパンの作業床面積 を、安衛則571条1項4号の400kg限度と比較する。
 * 部材自重・積載荷重wの数値は仮設工業会/製品資料・現場条件で確認する入力値（既定値は控えめの目安）。
 *
 * 判定は決定論的な集計・しきい値チェック（AIは使わない）。
 */

import type { CalcCheckItem, CalcOutcome, CalcValues, ConstructionCalculator } from "../schema";
import { formatNumber, STANDARD_GRAVITY } from "../schema";

/** 安衛則571条1項4号: 単管足場の建地間積載荷重の限度 [kg] */
export const BAY_LOAD_LIMIT_KG = 400;

/** N（積載荷重w×面積）→ kgf 換算 */
export function nToKgf(n: number): number {
  return n / STANDARD_GRAVITY;
}

/** 1スパンあたりの積載荷重 [kgf]（安衛則571条1項4号との比較に使う） */
export function bayLiveLoadKgf(spanM: number, bayDepthM: number, floorLoadWNpm2: number): number {
  return nToKgf(floorLoadWNpm2 * spanM * bayDepthM);
}

function computeScaffoldLoadSummary(values: CalcValues): CalcOutcome {
  const selfWeightTotalKg = values.selfWeightTotalKg as number;
  const postCount = values.postCount as number;
  const spanM = values.spanM as number;
  const bayDepthM = values.bayDepthM as number;
  const floorLoadW = values.floorLoadW as number;
  const totalFloorAreaM2 = values.totalFloorAreaM2 as number;

  const bayLoadKgf = bayLiveLoadKgf(spanM, bayDepthM, floorLoadW);
  const bayOk = bayLoadKgf <= BAY_LOAD_LIMIT_KG + 1e-9;

  const totalLiveLoadKgf = nToKgf(floorLoadW * totalFloorAreaM2);
  const totalLoadKgf = selfWeightTotalKg + totalLiveLoadKgf;
  const loadPerPostKgf = totalLoadKgf / postCount;

  const items: CalcCheckItem[] = [
    {
      label: "1スパンあたりの積載荷重（安衛則571条1項4号）",
      value: `${formatNumber(bayLoadKgf, 1)}kg（限度 ${BAY_LOAD_LIMIT_KG}kg）`,
      tone: bayOk ? "safe" : "danger",
      note: `1スパンの作業床面積 ${formatNumber(spanM * bayDepthM, 2)}m²（スパン長${formatNumber(spanM, 2)}m×奥行${formatNumber(bayDepthM, 2)}m）× w${formatNumber(floorLoadW, 0)}N/m²`,
    },
    {
      label: "足場自重合計（入力値）",
      value: `${formatNumber(selfWeightTotalKg, 0)}kg`,
      note: "枠組・単管・布板・ジャッキベース等の合計質量。仮設工業会/製品資料の値で確認すること。",
    },
    {
      label: "総作業床面積の積載荷重",
      value: `${formatNumber(totalLiveLoadKgf, 0)}kg（w${formatNumber(floorLoadW, 0)}N/m² × ${formatNumber(totalFloorAreaM2, 1)}m²）`,
    },
    {
      label: "建地1本負担（軸力の目安）",
      value: `${formatNumber(loadPerPostKgf, 1)}kg／本`,
      note: `（自重${formatNumber(selfWeightTotalKg, 0)}kg＋積載${formatNumber(totalLiveLoadKgf, 0)}kg）÷ 建地${formatNumber(postCount, 0)}本。建地間で均等に負担すると仮定した概算`,
    },
  ];

  const warnings: string[] = [];
  if (!bayOk) {
    warnings.push(
      `1スパンあたりの積載荷重が安衛則571条1項4号の限度400kgを超えています。積載を減らすか、スパン割・作業床面積を見直してください。`,
    );
  }
  warnings.push(
    "建地1本負担は、建地間で荷重が均等にかかると仮定した概算です。隅角部・妻側の建地、開口部周りなどは負担が大きくなる場合があるため、実際の割付・支点条件に応じて有資格者が確認してください。",
  );
  warnings.push(
    "ジャッキベース・敷板の地耐力照査は本計算の範囲外です。地盤の許容支持力と敷板の面積から別途確認してください。",
  );
  warnings.push(
    "壁つなぎの間隔（安衛則570条1項5号）・足場の組立て等作業主任者の選任（安衛則565条）も併せて確認してください。",
  );
  warnings.push(
    "部材自重・積載荷重wの数値は、仮設工業会の技術基準・製品資料または現場の実測値で必ず確認してください（既定値は控えめな目安です）。",
  );

  return {
    tone: bayOk ? "safe" : "danger",
    headline: bayOk ? "400kg限度内" : "400kg限度超過",
    value: formatNumber(loadPerPostKgf, 1),
    unit: "kg／本",
    summary: bayOk
      ? `1スパンあたりの積載荷重${formatNumber(bayLoadKgf, 1)}kgは安衛則571条1項4号の限度400kg以内です。建地1本負担は概算で${formatNumber(loadPerPostKgf, 1)}kgです。`
      : `1スパンあたりの積載荷重${formatNumber(bayLoadKgf, 1)}kgが安衛則571条1項4号の限度400kgを超えています。`,
    items,
    steps: [
      `1スパンの作業床面積 = スパン長${formatNumber(spanM, 2)}m × 奥行${formatNumber(bayDepthM, 2)}m = ${formatNumber(spanM * bayDepthM, 2)}m²`,
      `1スパンあたりの積載荷重 = w${formatNumber(floorLoadW, 0)}N/m² × ${formatNumber(spanM * bayDepthM, 2)}m² ÷ 9.80665 = ${formatNumber(bayLoadKgf, 1)}kg（限度400kgと比較・571条1項4号）`,
      `総積載荷重 = w${formatNumber(floorLoadW, 0)}N/m² × 総作業床面積${formatNumber(totalFloorAreaM2, 1)}m² ÷ 9.80665 = ${formatNumber(totalLiveLoadKgf, 0)}kg`,
      `建地1本負担 = （自重${formatNumber(selfWeightTotalKg, 0)}kg ＋ 積載${formatNumber(totalLiveLoadKgf, 0)}kg）÷ 建地${formatNumber(postCount, 0)}本 = ${formatNumber(loadPerPostKgf, 1)}kg／本`,
    ],
    warnings,
  };
}

export const scaffoldLoadSummaryCalculator: ConstructionCalculator = {
  slug: "scaffold-load-summary",
  title: "足場荷重の集計（自重＋積載→建地1本負担）",
  shortTitle: "足場荷重集計",
  summary:
    "足場の自重合計と作業床の積載荷重を入力すると、1スパンあたりの積載荷重（安衛則571条1項4号の400kg限度）と、建地1本あたりの負担荷重の目安を集計します。",
  fields: [
    {
      kind: "number",
      id: "selfWeightTotalKg",
      label: "足場自重合計",
      unit: "kg",
      min: 10,
      max: 50000,
      step: 10,
      defaultValue: 1200,
      help: "枠組・単管・布板・ジャッキベース等の合計質量（仮設工業会/製品資料の値を入力）",
    },
    {
      kind: "number",
      id: "postCount",
      label: "建地本数",
      unit: "本",
      min: 1,
      max: 1000,
      step: 1,
      defaultValue: 12,
    },
    {
      kind: "number",
      id: "spanM",
      label: "スパン長（けた行方向・1スパン分）",
      unit: "m",
      min: 0.5,
      max: 3,
      step: 0.05,
      defaultValue: 1.8,
      help: "400kg限度判定に使う1スパン（建地間）の長さ",
    },
    {
      kind: "number",
      id: "bayDepthM",
      label: "作業床の奥行き（1スパン分）",
      unit: "m",
      min: 0.2,
      max: 2,
      step: 0.05,
      defaultValue: 0.5,
    },
    {
      kind: "number",
      id: "floorLoadW",
      label: "作業床の積載荷重w",
      unit: "N/m²",
      min: 100,
      max: 5000,
      step: 50,
      defaultValue: 1500,
      help: "軽作業/一般作業等の用途に応じた設計積載荷重（既定値は暫定の目安。現場条件・仮設工業会基準で確認）",
    },
    {
      kind: "number",
      id: "totalFloorAreaM2",
      label: "総作業床面積（全段合計）",
      unit: "m²",
      min: 0.5,
      max: 5000,
      step: 1,
      defaultValue: 50,
      help: "建地1本負担の算定に用いる、全段合計の作業床の延べ面積",
    },
  ],
  basis: [
    {
      label: "労働安全衛生規則 第562条（最大積載荷重）",
      description: "足場の構造・材料に応じて作業床の最大積載荷重を定め、これを超えて積載してはならないことを定めています。",
      lawNaviPath: "/law-navi/347M50002000032/562",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000032#Mp-At_562",
    },
    {
      label: "労働安全衛生規則 第571条1項4号（単管足場の建地間積載荷重）",
      description: "令別表第八第一号の部材等を用いる鋼管足場（単管足場）の建地間の積載荷重は400キログラムを限度とすることを定めています。",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000032#Mp-At_571",
    },
    {
      label: "労働安全衛生規則 第570条（鋼管足場の脚部・敷板等）",
      description: "鋼管足場の脚部のベース金具・敷板・根がらみ等の措置を定めています（本計算は地耐力照査を含みません）。",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000032#Mp-At_570",
    },
  ],
  cautions: [
    "部材自重・積載荷重wの数値は、仮設工業会の技術基準・製品資料または現場の実測値で確認してください（既定値は控えめな代表値の目安であり、確定値ではありません）。",
    "建地1本負担は、建地間で荷重が均等にかかると仮定した概算です。実際の割付・隅角部の条件により負担は変わります。",
    "ジャッキベース・敷板の地耐力照査は本計算の範囲外です。",
  ],
  examples: [
    { label: "標準的な外部足場（1.8m×0.5m・自重1200kg・建地12本）", values: { selfWeightTotalKg: 1200, postCount: 12, spanM: 1.8, bayDepthM: 0.5, floorLoadW: 1500, totalFloorAreaM2: 50 } },
    { label: "積載超過の例（w2900N/m²・広い作業床）", values: { selfWeightTotalKg: 1200, postCount: 12, spanM: 1.8, bayDepthM: 0.8, floorLoadW: 2900, totalFloorAreaM2: 60 } },
  ],
  keywords: [
    "足場荷重",
    "建地",
    "積載",
    "自重",
    "軸力",
    "集計",
    "負担",
    "スパン",
    "足場 重さ",
    "400kg",
  ],
  compute: computeScaffoldLoadSummary,
};
