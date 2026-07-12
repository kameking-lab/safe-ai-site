/**
 * 掘削面の勾配チェック（明り掘削・手掘り）
 *
 * 根拠:
 * - 労働安全衛生規則 第356条: 手掘り掘削の掘削面の勾配の基準
 *     岩盤又は堅い粘土からなる地山: 高さ5m未満→90°以下 / 5m以上→75°以下
 *     その他の地山: 高さ2m未満→90°以下 / 2m以上5m未満→75°以下 / 5m以上→60°以下
 * - 労働安全衛生規則 第357条: 砂からなる地山・発破等により崩壊しやすい状態になっている地山
 *     砂: 勾配35°以下 又は 高さ5m未満
 *     崩壊しやすい状態: 勾配45°以下 又は 高さ2m未満
 * - 労働安全衛生規則 第359条: 掘削面の高さが2m以上となる地山の掘削は作業主任者の選任が必要
 *
 * 判定は決定論的なルール表で行う（AIは使わない）。
 */

import type { CalcCheckItem, CalcOutcome, CalcValues, ConstructionCalculator } from "../schema";
import { formatNumber } from "../schema";

export type SoilType = "rock_hard_clay" | "other" | "sand" | "collapse_prone";

export const SOIL_LABELS: Record<SoilType, string> = {
  rock_hard_clay: "岩盤又は堅い粘土からなる地山",
  other: "その他の地山（一般的な土質）",
  sand: "砂からなる地山",
  collapse_prone: "発破等により崩壊しやすい状態の地山",
};

/**
 * 安衛則第356条・第357条による勾配の上限 [度]。
 * 上限が「高さ制限との選択」の場合はその旨を alternative に返す。
 */
export function slopeLimit(
  soil: SoilType,
  heightM: number,
): { limitDeg: number | null; basisArticle: "第356条" | "第357条"; alternative?: string } {
  switch (soil) {
    case "rock_hard_clay":
      return heightM < 5
        ? { limitDeg: 90, basisArticle: "第356条" }
        : { limitDeg: 75, basisArticle: "第356条" };
    case "other":
      if (heightM < 2) return { limitDeg: 90, basisArticle: "第356条" };
      if (heightM < 5) return { limitDeg: 75, basisArticle: "第356条" };
      return { limitDeg: 60, basisArticle: "第356条" };
    case "sand":
      // 勾配35°以下 又は 高さ5m未満
      return heightM < 5
        ? { limitDeg: null, basisArticle: "第357条", alternative: "高さ5m未満のため勾配の制限なし（又は勾配35°以下）" }
        : { limitDeg: 35, basisArticle: "第357条" };
    case "collapse_prone":
      // 勾配45°以下 又は 高さ2m未満
      return heightM < 2
        ? { limitDeg: null, basisArticle: "第357条", alternative: "高さ2m未満のため勾配の制限なし（又は勾配45°以下）" }
        : { limitDeg: 45, basisArticle: "第357条" };
  }
}

/** 勾配角度 → 「1:x」の法面勾配表記（90°は垂直） */
export function slopeRatioLabel(angleDeg: number): string {
  if (angleDeg >= 90) return "垂直";
  if (angleDeg <= 0) return "水平";
  const x = 1 / Math.tan((angleDeg * Math.PI) / 180);
  return `1:${formatNumber(x, 2)}`;
}

function computeExcavationSlope(values: CalcValues): CalcOutcome {
  const soil = values.soil as SoilType;
  const heightM = values.height as number;
  const slopeDeg = values.slope as number;

  const { limitDeg, basisArticle, alternative } = slopeLimit(soil, heightM);
  const ok = limitDeg === null ? true : slopeDeg <= limitDeg + 1e-9;

  const items: CalcCheckItem[] = [
    { label: "地山の種類", value: SOIL_LABELS[soil] },
    { label: "掘削面の高さ", value: `${formatNumber(heightM, 1)}m` },
    {
      label: `法定上限勾配（安衛則${basisArticle}）`,
      value: limitDeg === null ? "制限なし" : `${limitDeg}°以下`,
      note: alternative,
    },
    {
      label: "予定勾配",
      value: `${formatNumber(slopeDeg, 1)}°（${slopeRatioLabel(slopeDeg)}）`,
      tone: ok ? "safe" : "danger",
    },
  ];

  const warnings: string[] = [];
  if (limitDeg === null && alternative) {
    warnings.push(
      `${SOIL_LABELS[soil]}は「${alternative}」という基準です。高さが増える場合は勾配制限（砂35°・崩壊しやすい状態45°）がかかります。`,
    );
  }
  if (heightM >= 2) {
    warnings.push(
      "掘削面の高さが2m以上となるため、地山の掘削作業主任者の選任が必要です（安衛則第359条）。",
    );
  }
  warnings.push(
    "本基準は「手掘り」による明り掘削に適用されます（安衛則第356条）。湧水・亀裂・埋設物がある場合や、基準勾配を確保できない場合は、土止め支保工等の崩壊防止措置が必要です（安衛則第361条）。",
  );
  warnings.push(
    "大雨・発破の後は地山の点検を行ってください（安衛則第358条）。",
  );

  const limitLabel = limitDeg === null ? "制限なし" : `${limitDeg}°`;
  return {
    tone: ok ? "safe" : "danger",
    headline: ok ? "基準適合" : "勾配超過",
    value: limitDeg === null ? "—" : String(limitDeg),
    unit: limitDeg === null ? "" : "°",
    summary: ok
      ? `予定勾配${formatNumber(slopeDeg, 1)}°は、この地山・高さの法定上限（${limitLabel}）の範囲内です。`
      : `予定勾配${formatNumber(slopeDeg, 1)}°は法定上限${limitLabel}を超えています。勾配を緩くするか、土止め支保工等の措置が必要です。`,
    items,
    steps: [
      `地山の種類「${SOIL_LABELS[soil]}」・掘削面の高さ${formatNumber(heightM, 1)}m → 安衛則${basisArticle}の区分を適用`,
      `法定上限勾配 = ${limitLabel}${alternative ? `（${alternative}）` : ""}`,
      limitDeg === null
        ? `判定: 高さ条件により勾配制限なし → 基準適合`
        : `判定: 予定勾配 ${formatNumber(slopeDeg, 1)}° ${ok ? "≤" : ">"} ${limitDeg}° → ${ok ? "基準適合" : "勾配超過"}`,
    ],
    warnings,
  };
}

export const excavationSlopeCalculator: ConstructionCalculator = {
  slug: "excavation-slope",
  title: "掘削面の勾配チェック（安衛則356・357条）",
  shortTitle: "掘削勾配チェック",
  summary:
    "地山の種類と掘削面の高さから、労働安全衛生規則第356条・第357条の法定上限勾配を判定し、予定勾配が基準に適合するかチェックします。",
  fields: [
    {
      kind: "select",
      id: "soil",
      label: "地山の種類",
      options: [
        { value: "rock_hard_clay", label: "岩盤又は堅い粘土" },
        { value: "other", label: "その他の地山（一般的な土質）" },
        { value: "sand", label: "砂からなる地山" },
        { value: "collapse_prone", label: "発破等により崩壊しやすい状態" },
      ],
      defaultValue: "other",
      help: "判断に迷う場合は安全側（その他の地山）を選択",
    },
    {
      kind: "number",
      id: "height",
      label: "掘削面の高さ",
      unit: "m",
      min: 0.1,
      max: 30,
      step: 0.1,
      defaultValue: 3,
      help: "のり肩からのり尻までの垂直距離",
    },
    {
      kind: "number",
      id: "slope",
      label: "予定勾配（水平からの角度）",
      unit: "°",
      min: 1,
      max: 90,
      step: 1,
      defaultValue: 60,
      help: "90°=垂直掘り",
    },
  ],
  basis: [
    {
      label: "労働安全衛生規則 第356条（掘削面の勾配の基準）",
      description: "手掘り掘削における地山の種類・高さごとの勾配上限を定めています。",
      lawNaviPath: "/law-navi/347M50002000032/356",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000032#Mp-At_356",
    },
    {
      label: "労働安全衛生規則 第357条（砂・崩壊しやすい地山）",
      description: "砂からなる地山・発破等で崩壊しやすい状態の地山の特則。",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000032#Mp-At_357",
    },
    {
      label: "労働安全衛生規則 第359条（地山の掘削作業主任者の選任）",
      description: "掘削面の高さ2m以上の地山の掘削には作業主任者の選任が必要です。",
      lawNaviPath: "/law-navi/347M50002000032/359",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000032#Mp-At_359",
    },
  ],
  cautions: [
    "地山の種類の判定（岩盤・堅い粘土・砂等）は現地の土質確認が前提です。判断に迷う場合は安全側の区分を使用してください。",
    "機械掘削・土止め支保工を用いる掘削・深い掘削（土止め先行工法等）は別の基準・検討が必要です。",
    "地下水位が高い場合・地表に重機や資材の載荷がある場合は、基準勾配でも崩壊のおそれがあります。",
  ],
  examples: [
    { label: "一般的な土で深さ3m・勾配60°", values: { soil: "other", height: 3, slope: 60 } },
    { label: "砂地盤で深さ6m・勾配40°", values: { soil: "sand", height: 6, slope: 40 } },
  ],
  keywords: [
    "掘削",
    "掘る",
    "溝",
    "根切り",
    "床掘",
    "勾配",
    "法面",
    "のり面",
    "地山",
    "崩壊",
    "土砂",
    "トレンチ",
  ],
  relatedSlugs: ["shoring-member-check", "slope-ratio-convert"],
  compute: computeExcavationSlope,
};
