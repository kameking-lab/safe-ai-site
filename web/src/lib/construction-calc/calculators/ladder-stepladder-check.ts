/**
 * 移動はしご・脚立の基準チェック
 *
 * 【一次資料での訂正】量産元プロンプトは「移動はしご（安衛則527条）：幅30cm以上・上端60cm以上
 * 突出」としていたが、条文本文を確認すると第527条には上端突出の定めはない。上端を60cm以上
 * 突出させる基準は **第556条（はしご道）5号** の規定であり、はしご道（坑内等の固定はしご）が
 * 対象。移動はしごには直接の適用条文はないが、安全な昇降のための手がかり確保として広く準用
 * されているため、本機では556条5号の準用として明示のうえチェック項目に含める。
 *
 * 根拠（一次資料 e-Gov 労働安全衛生規則）:
 * - 第527条（移動はしご）: 丈夫な構造・材料に損傷腐食等がないこと・幅30cm以上・
 *   すべり止め装置の取付け等転位防止の措置。
 * - 第556条5号（はしご道）: はしごの上端を床から60cm以上突出させること
 *   （本来ははしご道の基準。移動はしごの安全な昇降のための目安として準用）。
 * - 第528条（脚立）: 丈夫な構造・材料に損傷腐食等がないこと・脚と水平面との角度75度以下
 *   （折りたたみ式は角度を確実に保つ金具等）・踏み面は安全な作業に必要な面積。
 * - 第526条（昇降するための設備の設置等）: 高さ又は深さが1.5メートルを超える箇所で作業する
 *   ときは、安全に昇降するための設備等を設けなければならない。
 *
 * 判定は決定論的なしきい値チェック（AIは使わない）。
 */

import type { CalcCheckItem, CalcOutcome, CalcValues, ConstructionCalculator } from "../schema";
import { formatNumber } from "../schema";

export type LadderEquipmentType = "ladder" | "stepladder";

/** 安衛則の基準値 */
export const LADDER_LIMITS = {
  /** 移動はしごの幅の最小値 [cm]（527条3号） */
  minWidthCm: 30,
  /** はしご上端の突出の最小値 [cm]（556条5号・移動はしごへの準用） */
  minTopProtrusionCm: 60,
  /** 脚立の開き角度（脚と水平面との角度）の最大値 [度]（528条3号） */
  maxStepladderAngleDeg: 75,
  /** 昇降設備が必要となる高さ/深さ [m]（526条・「超える」で厳密に判定） */
  descentEquipmentThresholdM: 1.5,
} as const;

function computeLadderStepladderCheck(values: CalcValues): CalcOutcome {
  const equipmentType = values.equipmentType as LadderEquipmentType;
  const workHeightM = values.workHeightM as number;
  const widthCm = values.widthCm as number;
  const topProtrusionCm = values.topProtrusionCm as number;
  const legAngleDeg = values.legAngleDeg as number;
  const topPlateWork = values.topPlateWork as string;

  const needsDescentEquipment = workHeightM > LADDER_LIMITS.descentEquipmentThresholdM + 1e-9;

  const items: CalcCheckItem[] = [];
  const warnings: string[] = [];
  let failures = 0;

  if (equipmentType === "ladder") {
    const widthOk = widthCm >= LADDER_LIMITS.minWidthCm - 1e-9;
    const protrusionOk = topProtrusionCm >= LADDER_LIMITS.minTopProtrusionCm - 1e-9;
    if (!widthOk) failures++;
    items.push({
      label: "はしごの幅（527条3号）",
      value: `${formatNumber(widthCm, 0)}cm（限度 ${LADDER_LIMITS.minWidthCm}cm以上）`,
      tone: widthOk ? "safe" : "danger",
    });
    items.push({
      label: "上端の突出（556条5号の準用・目安）",
      value: `${formatNumber(topProtrusionCm, 0)}cm（目安 ${LADDER_LIMITS.minTopProtrusionCm}cm以上）`,
      tone: protrusionOk ? "safe" : "warning",
      note: "本来ははしご道（固定はしご）の基準。移動はしごでは安全な昇降のための目安として準用（不適合カウントには含めない）",
    });
    warnings.push(
      "移動はしごは、丈夫な構造・材料に著しい損傷腐食等がないこと・すべり止め装置の取付け等転位防止の措置が必要です（安衛則527条）。",
    );
  } else {
    const angleOk = legAngleDeg <= LADDER_LIMITS.maxStepladderAngleDeg + 1e-9;
    if (!angleOk) failures++;
    items.push({
      label: "脚立の開き角度（528条3号）",
      value: `${formatNumber(legAngleDeg, 0)}°（限度 ${LADDER_LIMITS.maxStepladderAngleDeg}°以下）`,
      tone: angleOk ? "safe" : "danger",
    });
    items.push({
      label: "天板での作業",
      value: topPlateWork === "する" ? "あり" : "なし",
      tone: topPlateWork === "する" ? "danger" : "safe",
    });
    if (topPlateWork === "する") failures++;
    warnings.push(
      "脚立は、丈夫な構造・材料に著しい損傷腐食等がないこと・踏み面が安全な作業に必要な面積を有することが必要です（安衛則528条）。折りたたみ式は角度を確実に保つ金具等を備えてください。",
    );
    warnings.push(
      "脚立の天板に乗っての作業は転落の危険が高く、原則として避けてください（3点支持の確保・天板不使用が基本）。",
    );
  }

  items.push({
    label: "昇降設備の要否（526条）",
    value: needsDescentEquipment
      ? `作業高さ${formatNumber(workHeightM, 1)}mは1.5m超のため、安全に昇降するための設備等が必要`
      : `作業高さ${formatNumber(workHeightM, 1)}mは1.5m以下`,
    tone: needsDescentEquipment ? "warning" : "safe",
  });
  if (needsDescentEquipment) {
    warnings.push(
      "高さ又は深さが1.5メートルを超える箇所で作業するときは、安全に昇降するための設備等を設けなければなりません（安衛則526条）。移動はしご・脚立自体がこの設備を兼ねられるか、現場条件で確認してください。",
    );
  }

  const ok = failures === 0;
  const typeLabel = equipmentType === "ladder" ? "移動はしご" : "脚立";

  return {
    tone: ok ? "safe" : "danger",
    headline: ok ? "基準適合" : "基準不適合",
    summary: ok
      ? `${typeLabel}の入力条件は安衛則の基準の範囲内です。`
      : `${typeLabel}の入力条件が安衛則の基準を満たしていません。`,
    items,
    steps:
      equipmentType === "ladder"
        ? [
            `はしごの幅 ${formatNumber(widthCm, 0)}cm ${widthCm >= LADDER_LIMITS.minWidthCm ? "≥" : "<"} 30cm（527条3号）`,
            `上端の突出 ${formatNumber(topProtrusionCm, 0)}cm ${topProtrusionCm >= LADDER_LIMITS.minTopProtrusionCm ? "≥" : "<"} 60cm（556条5号の準用・目安）`,
            `作業高さ ${formatNumber(workHeightM, 1)}m ${needsDescentEquipment ? ">" : "≤"} 1.5m → 昇降設備${needsDescentEquipment ? "必要" : "不要"}（526条）`,
          ]
        : [
            `脚立の開き角度 ${formatNumber(legAngleDeg, 0)}° ${legAngleDeg <= LADDER_LIMITS.maxStepladderAngleDeg ? "≤" : ">"} 75°（528条3号）`,
            `天板での作業: ${topPlateWork}`,
            `作業高さ ${formatNumber(workHeightM, 1)}m ${needsDescentEquipment ? ">" : "≤"} 1.5m → 昇降設備${needsDescentEquipment ? "必要" : "不要"}（526条）`,
          ],
    warnings,
  };
}

export const ladderStepladderCheckCalculator: ConstructionCalculator = {
  slug: "ladder-stepladder-check",
  title: "移動はしご・脚立の基準チェック（安衛則526・527・528条）",
  shortTitle: "はしご・脚立チェック",
  summary:
    "移動はしごの幅・脚立の開き角度など、安衛則第527条・第528条の基準への適合と、高さ1.5m超で必要となる昇降設備（第526条）の要否をチェックします。",
  fields: [
    {
      kind: "select",
      id: "equipmentType",
      label: "種別",
      options: [
        { value: "ladder", label: "移動はしご" },
        { value: "stepladder", label: "脚立" },
      ],
      defaultValue: "ladder",
    },
    {
      kind: "number",
      id: "workHeightM",
      label: "作業の高さ・深さ",
      unit: "m",
      min: 0.1,
      max: 30,
      step: 0.1,
      defaultValue: 2,
      help: "昇降設備の要否（526条・1.5m超）の判定に使用",
    },
    {
      kind: "number",
      id: "widthCm",
      label: "はしごの幅（移動はしご用）",
      unit: "cm",
      min: 10,
      max: 100,
      step: 1,
      defaultValue: 35,
    },
    {
      kind: "number",
      id: "topProtrusionCm",
      label: "はしご上端の突出（移動はしご用）",
      unit: "cm",
      min: 0,
      max: 300,
      step: 5,
      defaultValue: 70,
    },
    {
      kind: "number",
      id: "legAngleDeg",
      label: "脚立の開き角度（脚と水平面のなす角）",
      unit: "°",
      min: 30,
      max: 90,
      step: 1,
      defaultValue: 70,
    },
    {
      kind: "select",
      id: "topPlateWork",
      label: "脚立の天板での作業",
      options: [
        { value: "しない", label: "しない" },
        { value: "する", label: "する" },
      ],
      defaultValue: "しない",
    },
  ],
  basis: [
    {
      label: "労働安全衛生規則 第527条（移動はしご）",
      description: "丈夫な構造・材料に著しい損傷腐食等がないこと・幅30cm以上・すべり止め装置の取付け等を定めています。",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000032#Mp-At_527",
    },
    {
      label: "労働安全衛生規則 第556条5号（はしご道・上端の突出）",
      description:
        "はしごの上端を床から60センチメートル以上突出させることを定めています。本来ははしご道（固定はしご）の基準で、移動はしごには安全な昇降のための目安として準用しています。",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000032#Mp-At_556",
    },
    {
      label: "労働安全衛生規則 第528条（脚立）",
      description: "丈夫な構造・材料に著しい損傷腐食等がないこと・脚と水平面との角度75度以下・踏み面の面積等を定めています。",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000032#Mp-At_528",
    },
    {
      label: "労働安全衛生規則 第526条（昇降するための設備の設置等）",
      description: "高さ又は深さが1.5メートルを超える箇所で作業するときは、安全に昇降するための設備等を設けなければならないことを定めています。",
      lawNaviPath: "/law-navi/347M50002000032/526",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000032#Mp-At_526",
    },
  ],
  cautions: [
    "上端の突出60cmは、本来ははしご道（固定はしご）の基準（556条5号）であり、移動はしご自体への直接適用条文ではありません。安全な昇降のための目安として扱ってください。",
    "脚立の天板での作業は、メーカー取扱説明書・現場ルールでも原則禁止とされることが多く、3点支持を保てる高さ・姿勢で作業してください。",
    "材料の著しい損傷・腐食・変形の有無は現地の目視点検が必要で、本計算には含まれません。",
  ],
  examples: [
    { label: "移動はしご（幅35cm・突出70cm・高さ2m）", values: { equipmentType: "ladder", workHeightM: 2, widthCm: 35, topProtrusionCm: 70, legAngleDeg: 70, topPlateWork: "しない" } },
    { label: "脚立（開き角度70°・高さ1.2m）", values: { equipmentType: "stepladder", workHeightM: 1.2, widthCm: 35, topProtrusionCm: 70, legAngleDeg: 70, topPlateWork: "しない" } },
  ],
  keywords: [
    "はしご",
    "脚立",
    "移動はしご",
    "昇降設備",
    "天板",
    "開き角度",
    "上端突出",
    "3点支持",
  ],
  compute: computeLadderStepladderCheck,
};
