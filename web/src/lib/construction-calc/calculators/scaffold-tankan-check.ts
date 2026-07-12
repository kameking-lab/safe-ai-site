/**
 * 単管足場の基準チェック（建地間隔・積載荷重・壁つなぎ）
 *
 * 根拠:
 * - 労働安全衛生規則 第571条（鋼管足場のうち単管足場）:
 *     建地の間隔: けた行方向 1.85m以下・はり間方向 1.5m以下（第1項第1号）
 *     地上第一の布: 2m以下の位置（第1項第2号）
 *     建地の最高部から測って31mを超える部分の建地は鋼管を2本組とする（第1項第3号）
 *     建地間の積載荷重: 400kgを限度（第1項第4号）
 * - 労働安全衛生規則 第570条第1項第5号: 壁つなぎの間隔
 *     単管足場: 垂直方向 5m以下・水平方向 5.5m以下
 *
 * 判定は決定論的なしきい値チェック（AIは使わない）。
 */

import type { CalcCheckItem, CalcOutcome, CalcValues, ConstructionCalculator } from "../schema";
import { formatNumber } from "../schema";

/** 安衛則571条・570条の基準値（単管足場） */
export const TANKAN_LIMITS = {
  /** けた行方向の建地間隔 [m]（571条1項1号） */
  spanKetaMax: 1.85,
  /** はり間方向の建地間隔 [m]（571条1項1号） */
  spanHariMax: 1.5,
  /** 建地間の積載荷重 [kg]（571条1項4号） */
  loadPerBayMax: 400,
  /** 壁つなぎ垂直間隔 [m]（570条1項5号） */
  wallTieVerticalMax: 5,
  /** 壁つなぎ水平間隔 [m]（570条1項5号） */
  wallTieHorizontalMax: 5.5,
  /** 建地を2本組にすべき高さ [m]（571条1項3号: 最高部から31mを超える部分） */
  doublePostThreshold: 31,
} as const;

function check(label: string, value: number, limit: number, unit: string, basisNote: string): CalcCheckItem {
  const ok = value <= limit + 1e-9;
  return {
    label,
    value: `${formatNumber(value, 2)}${unit}（限度 ${formatNumber(limit, 2)}${unit}）`,
    tone: ok ? "safe" : "danger",
    note: basisNote,
  };
}

function computeScaffoldTankanCheck(values: CalcValues): CalcOutcome {
  const spanKeta = values.spanKeta as number;
  const spanHari = values.spanHari as number;
  const height = values.height as number;
  const loadPerBay = values.loadPerBay as number;
  const wallTieV = values.wallTieV as number;
  const wallTieH = values.wallTieH as number;

  const items: CalcCheckItem[] = [
    check("建地間隔（けた行方向）", spanKeta, TANKAN_LIMITS.spanKetaMax, "m", "安衛則571条1項1号"),
    check("建地間隔（はり間方向）", spanHari, TANKAN_LIMITS.spanHariMax, "m", "安衛則571条1項1号"),
    check("建地間の積載荷重", loadPerBay, TANKAN_LIMITS.loadPerBayMax, "kg", "安衛則571条1項4号"),
    check("壁つなぎ間隔（垂直方向）", wallTieV, TANKAN_LIMITS.wallTieVerticalMax, "m", "安衛則570条1項5号"),
    check("壁つなぎ間隔（水平方向）", wallTieH, TANKAN_LIMITS.wallTieHorizontalMax, "m", "安衛則570条1項5号"),
  ];

  const needsDoublePost = height > TANKAN_LIMITS.doublePostThreshold;
  if (needsDoublePost) {
    items.push({
      label: "建地の2本組（高さ31m超の部分）",
      value: `足場高さ ${formatNumber(height, 1)}m → 最高部から31mを超える部分は2本組が必要`,
      tone: "warning",
      note: "安衛則571条1項3号（設計荷重によるただし書あり）",
    });
  }

  const failures = items.filter((i) => i.tone === "danger");
  const ok = failures.length === 0;

  const warnings: string[] = [];
  if (!ok) {
    warnings.push(
      `${failures.length}項目が基準を超えています。間隔を狭める・積載を減らす等の是正が必要です。`,
    );
  }
  if (needsDoublePost) {
    warnings.push(
      "高さ31mを超える部分の建地は鋼管を2本組とする必要があります（設計荷重が最大使用荷重を超えない場合のただし書あり・安衛則571条1項3号）。",
    );
  }
  warnings.push(
    "本チェックは単管足場の主要基準の抜粋です。地上第一の布（2m以下）・脚部の敷板/ベース金具（570条1項1号）・筋かい・作業床（幅40cm以上等、563条）など、その他の基準は別途確認してください。",
  );
  warnings.push(
    "つり足場・張出し足場又は高さ5m以上の構造の足場の組立て・解体・変更には、足場の組立て等作業主任者の選任が必要です（安衛則565条）。",
  );

  return {
    tone: ok ? "safe" : "danger",
    headline: ok ? "基準適合" : "基準不適合",
    value: ok ? undefined : String(failures.length),
    unit: ok ? undefined : "項目",
    summary: ok
      ? "入力した建地間隔・積載荷重・壁つなぎ間隔は、安衛則第570条・第571条の基準の範囲内です。"
      : `${failures.map((f) => f.label).join("・")}が基準を超えています。`,
    items,
    steps: [
      `建地間隔: けた行 ${formatNumber(spanKeta, 2)}m ≤ 1.85m / はり間 ${formatNumber(spanHari, 2)}m ≤ 1.5m を確認（571条1項1号）`,
      `建地間の積載荷重: ${formatNumber(loadPerBay, 0)}kg ≤ 400kg を確認（571条1項4号）`,
      `壁つなぎ: 垂直 ${formatNumber(wallTieV, 1)}m ≤ 5m / 水平 ${formatNumber(wallTieH, 1)}m ≤ 5.5m を確認（570条1項5号）`,
      `足場高さ ${formatNumber(height, 1)}m → 31m超の部分の2本組${needsDoublePost ? "が必要" : "は不要"}（571条1項3号）`,
    ],
    warnings,
  };
}

export const scaffoldTankanCheckCalculator: ConstructionCalculator = {
  slug: "scaffold-tankan-check",
  title: "単管足場の基準チェック（安衛則570・571条）",
  shortTitle: "単管足場チェック",
  summary:
    "建地間隔・建地間の積載荷重・壁つなぎ間隔を入力すると、労働安全衛生規則第570条・第571条の基準に適合するかを一括チェックします。",
  fields: [
    {
      kind: "number",
      id: "spanKeta",
      label: "建地間隔（けた行方向）",
      unit: "m",
      min: 0.3,
      max: 5,
      step: 0.05,
      defaultValue: 1.8,
      help: "建物と平行方向の建地の間隔",
    },
    {
      kind: "number",
      id: "spanHari",
      label: "建地間隔（はり間方向）",
      unit: "m",
      min: 0.3,
      max: 5,
      step: 0.05,
      defaultValue: 1.2,
      help: "建物と直角方向の建地の間隔",
    },
    {
      kind: "number",
      id: "height",
      label: "足場の高さ",
      unit: "m",
      min: 2,
      max: 60,
      step: 0.5,
      defaultValue: 10,
    },
    {
      kind: "number",
      id: "loadPerBay",
      label: "建地間の積載荷重（予定）",
      unit: "kg",
      min: 0,
      max: 2000,
      step: 10,
      defaultValue: 300,
      help: "1スパンに載せる資材・人の合計質量",
    },
    {
      kind: "number",
      id: "wallTieV",
      label: "壁つなぎ間隔（垂直方向）",
      unit: "m",
      min: 0.5,
      max: 20,
      step: 0.1,
      defaultValue: 5,
    },
    {
      kind: "number",
      id: "wallTieH",
      label: "壁つなぎ間隔（水平方向）",
      unit: "m",
      min: 0.5,
      max: 20,
      step: 0.1,
      defaultValue: 5.5,
    },
  ],
  basis: [
    {
      label: "労働安全衛生規則 第571条（鋼管足場・単管足場の基準）",
      description:
        "建地間隔（けた行1.85m以下・はり間1.5m以下）、建地間の積載荷重400kg限度、31m超部分の2本組等を定めています。",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000032#Mp-At_571",
    },
    {
      label: "労働安全衛生規則 第570条（鋼管足場・壁つなぎ等）",
      description: "単管足場の壁つなぎ間隔（垂直5m以下・水平5.5m以下）、脚部の措置等を定めています。",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000032#Mp-At_570",
    },
    {
      label: "足場先行工法に関するガイドライン・仮設工業会基準",
      description: "部材強度・構造計算の詳細は仮設工業会の認定基準・技術基準によります。",
    },
  ],
  cautions: [
    "本チェックは法令基準への適合確認であり、足場全体の構造計算（風荷重・座屈・基礎反力等）に代わるものではありません。",
    "軒高が高い場合・シート養生がある場合は風荷重の検討が別途必要です。",
    "くさび緊結式足場・枠組足場は基準が異なります（本計算機は単管足場専用）。",
  ],
  examples: [
    { label: "標準的な外部足場（1.8m×1.2m・高さ10m）", values: { spanKeta: 1.8, spanHari: 1.2, height: 10, loadPerBay: 300, wallTieV: 5, wallTieH: 5.5 } },
    { label: "間隔オーバーの例（2.0m×1.6m）", values: { spanKeta: 2.0, spanHari: 1.6, height: 8, loadPerBay: 450, wallTieV: 6, wallTieH: 6 } },
  ],
  keywords: [
    "足場",
    "単管",
    "建地",
    "壁つなぎ",
    "積載",
    "スパン",
    "パイプ",
    "仮設",
    "組立",
  ],
  compute: computeScaffoldTankanCheck,
};
