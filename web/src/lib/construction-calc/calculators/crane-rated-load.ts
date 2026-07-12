/**
 * 移動式クレーンの必要定格（総）荷重の逆引きチェック（クレーン則66条の2）
 *
 * 根拠:
 * - クレーン等安全規則 第2条（定義）: 「定格荷重」はフック等の吊り具の質量を含まない荷重、
 *   「定格総荷重」は吊り具の質量を含む最大の荷重。作業半径が大きいほど定格は小さくなる。
 * - クレーン等安全規則 第69条: 定格荷重をこえる荷重をかけて使用してはならない。
 * - クレーン等安全規則 第66条の2: 移動式クレーンを用いる作業の作業計画
 *   （転倒等の防止、作業方法、労働者の配置・指揮）。
 *
 * 方針（重要）: メーカーの定格荷重表（作業半径別の代表値）は載せない。
 *   「必要な定格（総）荷重」を計算し、「作業半径での可否はメーカーの定格総荷重表で確認」と
 *   正直に誘導する（代表値のみで実務判定させる誤りを再生産しない）。
 */

import type { CalcOutcome, CalcValues, ConstructionCalculator } from "../schema";
import { formatNumber } from "../schema";

/** 推奨する最小の余裕率（%）。安全側の目安 */
export const CRANE_RECOMMENDED_MARGIN_PCT = 10;

function computeCraneRatedLoad(values: CalcValues): CalcOutcome {
  const loadKg = values.loadKg as number; // 吊り荷の質量
  const rigKg = values.rigKg as number; // 吊り具（フック・玉掛用具等）の質量
  const marginPct = values.marginPct as number; // 余裕率

  const requiredTotalKg = loadKg + rigKg; // 必要定格総荷重
  const recommendedTotalKg = requiredTotalKg * (1 + marginPct / 100);

  const toT = (kg: number) => formatNumber(kg / 1000, 2);

  const warnings: string[] = [];
  warnings.push(
    "移動式クレーンの定格総荷重は作業半径（ジブの角度・長さ）が大きいほど小さくなります。実際の可否は、使用する機種の定格総荷重表で「その作業半径での定格総荷重 ≥ 必要定格総荷重」を必ず確認してください。",
  );
  if (marginPct < CRANE_RECOMMENDED_MARGIN_PCT) {
    warnings.push(
      `余裕率が${marginPct}%です。荷重の見積り誤差・動荷重・地盤の傾き等を考慮し、少なくとも${CRANE_RECOMMENDED_MARGIN_PCT}%程度の余裕を見込むことを推奨します。`,
    );
  }
  warnings.push(
    "移動式クレーンを用いる作業は、あらかじめ作業方法・転倒等の防止措置・労働者の配置及び指揮の系統を定めた作業計画が必要です（クレーン則66条の2）。",
  );
  warnings.push(
    "定格荷重をこえる荷重をかけて使用してはなりません（クレーン則69条）。アウトリガーは最大限に張り出し、地盤の支持力・敷鉄板を確認してください。",
  );

  return {
    tone: "info",
    headline: "必要定格総荷重",
    value: toT(recommendedTotalKg),
    unit: "t",
    summary: `吊り荷${toT(loadKg)}t＋吊り具${toT(rigKg)}t＝必要定格総荷重${toT(requiredTotalKg)}t（余裕率${marginPct}%込みで${toT(recommendedTotalKg)}t）。この値以上の定格総荷重を、実際の作業半径でメーカー定格総荷重表により確認してください。`,
    items: [
      { label: "必要定格総荷重（余裕込み・推奨）", value: `${toT(recommendedTotalKg)}t`, tone: "info" },
      { label: "必要定格総荷重（吊り荷＋吊り具）", value: `${toT(requiredTotalKg)}t` },
      { label: "吊り荷の質量", value: `${toT(loadKg)}t（${formatNumber(loadKg, 0)}kg）` },
      { label: "吊り具の質量（フック・玉掛用具等）", value: `${toT(rigKg)}t（${formatNumber(rigKg, 0)}kg）` },
      { label: "余裕率", value: `${marginPct}%` },
      {
        label: "作業半径での定格総荷重",
        value: "メーカー定格総荷重表で要確認",
        tone: "warning",
        note: "作業半径が大きいほど定格総荷重は小さくなる",
      },
    ],
    steps: [
      `必要定格総荷重 = 吊り荷 ${formatNumber(loadKg, 0)}kg + 吊り具 ${formatNumber(rigKg, 0)}kg = ${formatNumber(requiredTotalKg, 0)}kg（${toT(requiredTotalKg)}t）`,
      `余裕率${marginPct}%込み = ${formatNumber(requiredTotalKg, 0)}kg × ${formatNumber(1 + marginPct / 100, 2)} = ${formatNumber(recommendedTotalKg, 0)}kg（${toT(recommendedTotalKg)}t）`,
      `判定: 実作業半径での定格総荷重 ≥ ${toT(recommendedTotalKg)}t となる機種・据付を選定（クレーン則69条）`,
    ],
    warnings,
  };
}

export const craneRatedLoadCalculator: ConstructionCalculator = {
  slug: "crane-rated-load",
  title: "移動式クレーンの必要定格総荷重の逆引き（クレーン則66条の2）",
  shortTitle: "クレーン必要定格荷重",
  summary:
    "吊り荷の質量に吊り具（フック・玉掛用具）の質量を加えた「必要定格総荷重」を計算します。メーカーの定格表は載せず、作業半径での可否は定格総荷重表で確認する運用に誘導します（クレーン則66条の2の作業計画つき）。",
  fields: [
    {
      kind: "number",
      id: "loadKg",
      label: "吊り荷の質量",
      unit: "kg",
      min: 1,
      max: 500000,
      step: 10,
      defaultValue: 3000,
      help: "吊り上げる荷そのものの質量",
    },
    {
      kind: "number",
      id: "rigKg",
      label: "吊り具の質量（フック・玉掛用具等）",
      unit: "kg",
      min: 0,
      max: 50000,
      step: 5,
      defaultValue: 200,
      help: "フックブロック・玉掛けワイヤ・天秤等の合計",
    },
    {
      kind: "number",
      id: "marginPct",
      label: "余裕率",
      unit: "%",
      min: 0,
      max: 100,
      step: 5,
      defaultValue: 10,
      help: "見積り誤差・動荷重への余裕（推奨10%以上）",
    },
  ],
  basis: [
    {
      label: "クレーン等安全規則 第66条の2（移動式クレーンの作業計画）",
      description: "作業方法・転倒等の防止措置・労働者の配置及び指揮の系統を定めた作業計画が必要です。",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000034#Mp-At_66_2",
    },
    {
      label: "クレーン等安全規則 第69条（定格荷重の制限）",
      description: "移動式クレーンにその定格荷重をこえる荷重をかけて使用してはなりません。",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000034#Mp-At_69",
    },
    {
      label: "クレーン等安全規則 第2条（定義: 定格荷重・定格総荷重）",
      description: "定格総荷重は吊り具の質量を含む最大の荷重。作業半径が大きいほど小さくなります。",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000034#Mp-At_2",
    },
  ],
  cautions: [
    "本計算は「必要な定格総荷重」を求めるものです。実際に吊れるかは、使用機種の定格総荷重表で作業半径ごとに確認してください（メーカー性能表が正）。",
    "つり上げ荷重により、移動式クレーン運転士免許・技能講習・特別教育の区分が異なります（安衛法61条等）。",
    "強風時の作業中止（クレーン則74条の3）、旋回範囲の立入禁止（同74条の2）、合図（同71条）を遵守してください。",
  ],
  examples: [
    { label: "吊り荷3t・吊り具200kg", values: { loadKg: 3000, rigKg: 200, marginPct: 10 } },
    { label: "吊り荷8t・天秤500kg・余裕20%", values: { loadKg: 8000, rigKg: 500, marginPct: 20 } },
  ],
  keywords: [
    "クレーン",
    "移動式クレーン",
    "ラフター",
    "定格荷重",
    "定格総荷重",
    "吊り荷",
    "揚重",
    "作業半径",
    "アウトリガー",
    "つり上げ荷重",
    "必要能力",
  ],
  compute: computeCraneRatedLoad,
};
