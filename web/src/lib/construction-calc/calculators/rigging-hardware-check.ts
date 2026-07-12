/**
 * シャックル・アイボルト・フック等 玉掛用具の使用荷重チェック
 *
 * 根拠:
 * - クレーン等安全規則 第214条（玉掛け用フック等の安全係数）: クレーン・移動式クレーン・
 *   デリックの玉掛用具であるフック又はシャックルの安全係数は5以上でなければならない
 *   （切断荷重 ÷ 使用最大荷重で算定）。安全係数を折り込んだ使用荷重（WLL）は製品カタログ・
 *   証明書に記載されているため、本計算機ではWLLを直接入力する方式にする
 *   （web/src/data/laws/crane-kisoku.ts 第214条の原文で確認。切断荷重からの再計算はしない）。
 * - クレーン等安全規則 第217条（不適格なフック、シャックル等の使用禁止）。
 * - シャックルはJIS B 2801（シャックル）、使用荷重は製品カタログ・証明書の値による。
 * - アイボルトは軸方向（垂直吊り）専用に設計されており、斜め引きは製造者の許容荷重表が
 *   なければ許容荷重を計算できない（低減曲線はメーカー・型式で大きく異なり、一次資料を
 *   一本化できない＝出典未確認の数値を載せない）。このため本計算機は斜め引き
 *   （引張角度>0°）を許容荷重の計算対象とせず、常に「使用不可・メーカー確認」と判定する。
 */

import type { CalcOutcome, CalcValues, ConstructionCalculator } from "../schema";
import { formatNumber } from "../schema";

export type HardwareKind = "shackle" | "eyebolt" | "hook";

export const HARDWARE_LABELS: Record<HardwareKind, string> = {
  shackle: "シャックル",
  eyebolt: "アイボルト",
  hook: "フック",
};

function computeRiggingHardwareCheck(values: CalcValues): CalcOutcome {
  const kind = String(values.kind) as HardwareKind;
  const wllKg = values.wllKg as number;
  const loadKg = values.loadKg as number;
  const angleDeg = values.angleDeg as number;
  const label = HARDWARE_LABELS[kind] ?? HARDWARE_LABELS.shackle;

  const warnings: string[] = [];
  warnings.push("使用荷重（WLL）は必ず製品カタログ・検査証明書の値を入力してください。刻印の呼び・型式だけで代表値を推測しないでください。");
  warnings.push("変形・摩耗・き裂・腐食のあるフック・シャックル等は使用してはなりません（クレーン則第217条）。");

  if (kind === "eyebolt" && angleDeg > 0) {
    warnings.unshift(
      `アイボルトへの斜め引き（引張角度${angleDeg}°）は原則禁止です。角度による許容荷重の低減は製造者・型式ごとに大きく異なり、本計算機では安全側に算定できません。軸方向（垂直吊り）で使用するか、斜め引きに対応した専用金具（スイベルアイボルト等）に変更し、メーカーの許容荷重表で確認してください。`,
    );
    return {
      tone: "danger",
      headline: "斜め引き・使用不可",
      value: "—",
      summary: `アイボルトに引張角度${angleDeg}°の斜め引きがかかる条件です。アイボルトは原則軸方向専用のため、この条件での許容荷重は算定できません。`,
      items: [
        { label: "器具種別", value: label },
        { label: "引張角度", value: `${angleDeg}°`, tone: "danger" },
        { label: "使用荷重（WLL・軸方向）", value: `${formatNumber(wllKg, 0)}kg` },
        { label: "作用荷重", value: `${formatNumber(loadKg, 0)}kg` },
      ],
      steps: [
        `引張角度${angleDeg}°（軸方向以外）が入力されたため、軸方向専用のアイボルトでは許容荷重を算定しません。`,
        "斜め引きが避けられない場合は、専用金具への変更またはメーカーの許容荷重表による確認が必要です。",
      ],
      warnings,
    };
  }

  const ok = wllKg >= loadKg;
  if (!ok) {
    warnings.unshift(
      `作用荷重が使用荷重（WLL）を超えています。より使用荷重の大きい${label}への変更、または作用荷重を下げることを検討してください。`,
    );
  }
  if (kind === "eyebolt") {
    warnings.push("アイボルトは軸方向（垂直吊り）でのみ計算しています。斜め引きが生じないよう、リングの向きと吊り位置を確認してください。");
  }

  return {
    tone: ok ? "safe" : "danger",
    headline: ok ? "使用可" : "使用不可",
    value: formatNumber(wllKg, 0),
    unit: "kg",
    summary: ok
      ? `${label}の使用荷重${formatNumber(wllKg, 0)}kgは、作用荷重${formatNumber(loadKg, 0)}kg以上を確保できます。`
      : `${label}の使用荷重${formatNumber(wllKg, 0)}kgは、作用荷重${formatNumber(loadKg, 0)}kgに対し不足しています。`,
    items: [
      { label: "器具種別", value: label },
      { label: "使用荷重（WLL・製品値）", value: `${formatNumber(wllKg, 0)}kg`, tone: ok ? "safe" : "danger" },
      { label: "作用荷重", value: `${formatNumber(loadKg, 0)}kg` },
      ...(kind === "eyebolt" ? [{ label: "引張角度", value: "0°（軸方向）" }] : []),
      { label: "余裕", value: `${formatNumber(wllKg - loadKg, 0)}kg`, tone: ok ? "safe" : "danger" },
    ],
    steps: [
      `判定: 使用荷重${formatNumber(wllKg, 0)}kg ${ok ? "≥" : "<"} 作用荷重${formatNumber(loadKg, 0)}kg → ${ok ? "使用可" : "使用不可"}`,
      "使用荷重（WLL）には安全係数（クレーン則第214条＝フック・シャックル5以上）が製造者側で織り込まれているため、切断荷重からの再計算はしていません。",
    ],
    warnings,
  };
}

export const riggingHardwareCheckCalculator: ConstructionCalculator = {
  slug: "rigging-hardware-check",
  title: "シャックル・アイボルト・フック等 玉掛用具の使用荷重チェック",
  shortTitle: "玉掛用具の使用荷重チェック",
  summary:
    "シャックル・アイボルト・フックの使用荷重（WLL・製品値）と作用荷重を比較して使用可否を判定します。アイボルトへの斜め引きは原則禁止として扱います。",
  fields: [
    {
      kind: "select",
      id: "kind",
      label: "器具種別",
      options: (Object.keys(HARDWARE_LABELS) as HardwareKind[]).map((k) => ({ value: k, label: HARDWARE_LABELS[k] })),
      defaultValue: "shackle",
    },
    {
      kind: "number",
      id: "wllKg",
      label: "使用荷重（WLL・製品カタログ/証明書の値）",
      unit: "kg",
      min: 1,
      max: 100000,
      step: 10,
      defaultValue: 1000,
      help: "型式・呼びの代表値ではなく、実際に使用する製品の値を入力してください",
    },
    {
      kind: "number",
      id: "loadKg",
      label: "作用荷重",
      unit: "kg",
      min: 1,
      max: 100000,
      step: 10,
      defaultValue: 500,
      help: "この器具1個にかかる荷重",
    },
    {
      kind: "number",
      id: "angleDeg",
      label: "引張角度（アイボルトのみ）",
      unit: "°",
      min: 0,
      max: 90,
      step: 15,
      defaultValue: 0,
      help: "アイボルト以外では無視されます。0°=軸方向（垂直）",
      aiOptional: true,
    },
  ],
  basis: [
    {
      label: "クレーン等安全規則 第214条（玉掛け用フック等の安全係数）",
      description: "フック又はシャックルの安全係数は5以上でなければ使用できません（切断荷重÷使用最大荷重）。",
      lawNaviPath: "/law-navi/347M50002000034/214",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000034#Mp-At_214",
    },
    {
      label: "クレーン等安全規則 第217条（不適格なフック、シャックル等の使用禁止）",
      description: "変形・摩耗・き裂・著しい腐食のあるフック・シャックル等は玉掛けに使用できません。",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000034#Mp-At_217",
    },
    {
      label: "JIS B 2801（シャックル）／製造者使用荷重表",
      description: "シャックル・アイボルトの使用荷重（WLL）は製品規格・カタログ・証明書の値によります。",
    },
  ],
  cautions: [
    "使用荷重（WLL）は必ず製品カタログ・検査証明書の値を入力してください。刻印の呼びだけで代表値を推測しないでください。",
    "アイボルトへの斜め引きは原則禁止です（軸方向専用）。斜めに引く必要がある場合は専用金具（スイベルアイボルト等）に変更するか、メーカーの許容荷重表で確認してください。",
    "変形・摩耗・き裂・腐食のあるフック・シャックル・アイボルトは使用してはなりません（クレーン則第217条）。ピン・ナットは確実に取り付けてください。",
    "つりチェーン（クレーン則第213条の2・安全係数4〜5）やワイヤロープ（同第213条・安全係数6）は本計算機の対象外です。",
  ],
  examples: [
    { label: "500kgをシャックル（WLL1t）で玉掛け", values: { kind: "shackle", wllKg: 1000, loadKg: 500, angleDeg: 0 } },
    { label: "800kgをアイボルト（WLL1t）で垂直吊り", values: { kind: "eyebolt", wllKg: 1000, loadKg: 800, angleDeg: 0 } },
    { label: "アイボルトに45°の斜め引きがかかる場合", values: { kind: "eyebolt", wllKg: 1000, loadKg: 500, angleDeg: 45 } },
  ],
  keywords: [
    "シャックル",
    "アイボルト",
    "フック",
    "玉掛用具",
    "玉掛け",
    "玉掛",
    "使用荷重",
    "WLL",
    "斜め引き",
    "クレーン",
    "揚重",
    "214条",
    "217条",
  ],
  compute: computeRiggingHardwareCheck,
};
