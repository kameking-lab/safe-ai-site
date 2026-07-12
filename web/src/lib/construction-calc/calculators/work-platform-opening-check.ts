/**
 * 作業床・開口部の基準チェック
 *
 * 根拠（一次資料 e-Gov 労働安全衛生規則）:
 * - 第563条1項2号: つり足場の場合を除き、作業床の幅・床材間の隙間・床材と建地との隙間は
 *     イ 幅40センチメートル以上
 *     ロ 床材間の隙間3センチメートル以下
 *     ハ 床材と建地との隙間12センチメートル未満
 * - 第552条1項4号（架設通路。「手すり等」「中桟等」の高さの定義として準用）:
 *     イ 高さ85センチメートル以上の手すり等
 *     ロ 高さ35センチメートル以上50センチメートル以下の中桟等
 * - 第519条: 高さ2メートル以上の作業床の端・開口部等には囲い・手すり・覆い等を設けなければ
 *   ならない（具体の高さ・寸法の定めはなく、設置の有無を確認する規定）。
 * - 第518条: 高さ2メートル以上の箇所で作業を行う場合、作業床を設けなければならない。
 *
 * 判定は決定論的なしきい値チェック（AIは使わない）。単管足場チェック（scaffold-tankan-check）
 * と相互リンクする。
 */

import type { CalcCheckItem, CalcOutcome, CalcValues, ConstructionCalculator } from "../schema";
import { formatNumber } from "../schema";

/** 安衛則563条・552条の基準値 */
export const PLATFORM_LIMITS = {
  /** 作業床の幅の最小値 [cm]（563条1項2号イ） */
  minWidthCm: 40,
  /** 床材間の隙間の最大値 [cm]（563条1項2号ロ） */
  maxBoardGapCm: 3,
  /** 床材と建地との隙間の上限 [cm]（563条1項2号ハ・「未満」で厳密に） */
  maxPostGapCm: 12,
  /** 手すり等の高さの最小値 [cm]（552条1項4号イの定義を準用） */
  minHandrailHeightCm: 85,
  /** 中桟等の高さの下限 [cm]（552条1項4号ロ） */
  midRailMinCm: 35,
  /** 中桟等の高さの上限 [cm]（552条1項4号ロ） */
  midRailMaxCm: 50,
} as const;

function computeWorkPlatformOpeningCheck(values: CalcValues): CalcOutcome {
  const platformWidthCm = values.platformWidthCm as number;
  const boardGapCm = values.boardGapCm as number;
  const postGapCm = values.postGapCm as number;
  const handrailHeightCm = values.handrailHeightCm as number;
  const midRailHeightCm = values.midRailHeightCm as number;
  const openingGuardInstalled = values.openingGuardInstalled as string;

  const widthOk = platformWidthCm >= PLATFORM_LIMITS.minWidthCm - 1e-9;
  const boardGapOk = boardGapCm <= PLATFORM_LIMITS.maxBoardGapCm + 1e-9;
  const postGapOk = postGapCm < PLATFORM_LIMITS.maxPostGapCm - 1e-9;
  const handrailOk = handrailHeightCm >= PLATFORM_LIMITS.minHandrailHeightCm - 1e-9;
  const midRailOk =
    midRailHeightCm >= PLATFORM_LIMITS.midRailMinCm - 1e-9 && midRailHeightCm <= PLATFORM_LIMITS.midRailMaxCm + 1e-9;
  const guardOk = openingGuardInstalled === "installed";

  const items: CalcCheckItem[] = [
    {
      label: "作業床の幅（563条1項2号イ）",
      value: `${formatNumber(platformWidthCm, 0)}cm（限度 ${PLATFORM_LIMITS.minWidthCm}cm以上）`,
      tone: widthOk ? "safe" : "danger",
    },
    {
      label: "床材間の隙間（563条1項2号ロ）",
      value: `${formatNumber(boardGapCm, 1)}cm（限度 ${PLATFORM_LIMITS.maxBoardGapCm}cm以下）`,
      tone: boardGapOk ? "safe" : "danger",
    },
    {
      label: "床材と建地との隙間（563条1項2号ハ）",
      value: `${formatNumber(postGapCm, 1)}cm（限度 ${PLATFORM_LIMITS.maxPostGapCm}cm未満）`,
      tone: postGapOk ? "safe" : "danger",
    },
    {
      label: "手すり等の高さ（552条1項4号イの定義を準用）",
      value: `${formatNumber(handrailHeightCm, 0)}cm（限度 ${PLATFORM_LIMITS.minHandrailHeightCm}cm以上）`,
      tone: handrailOk ? "safe" : "danger",
    },
    {
      label: "中桟等の高さ（552条1項4号ロの定義を準用）",
      value: `${formatNumber(midRailHeightCm, 0)}cm（範囲 ${PLATFORM_LIMITS.midRailMinCm}〜${PLATFORM_LIMITS.midRailMaxCm}cm）`,
      tone: midRailOk ? "safe" : "danger",
    },
    {
      label: "開口部の囲い・手すり・覆い等（519条）",
      value: guardOk ? "設置あり" : "未設置",
      tone: guardOk ? "safe" : "danger",
    },
  ];

  const failures = items.filter((i) => i.tone === "danger");
  const ok = failures.length === 0;

  const warnings: string[] = [];
  if (!ok) {
    warnings.push(`${failures.map((f) => f.label).join("・")}が基準を満たしていません。是正が必要です。`);
  }
  warnings.push(
    "高さ2メートル以上の箇所で作業を行う場合は作業床の設置が必要です（安衛則518条）。作業床の設置が困難なときは、防網の設置・要求性能墜落制止用器具の使用等の措置が必要です。",
  );
  warnings.push(
    "作業のため物体が落下するおそれがあるときは、高さ10センチメートル以上の幅木・メッシュシート・防網等の設置が必要です（安衛則563条1項6号）。",
  );
  warnings.push("本チェックは単管足場チェック（安衛則570・571条）と併用してください。");

  return {
    tone: ok ? "safe" : "danger",
    headline: ok ? "基準適合" : "基準不適合",
    value: ok ? undefined : String(failures.length),
    unit: ok ? undefined : "項目",
    summary: ok
      ? "入力した作業床の幅・隙間・手すり・中桟・開口部の囲いは、安衛則第563条・第552条・第519条の基準の範囲内です。"
      : `${failures.map((f) => f.label).join("・")}が基準を超えています。`,
    items,
    steps: [
      `作業床の幅 ${formatNumber(platformWidthCm, 0)}cm ${widthOk ? "≥" : "<"} 40cm（563条1項2号イ）`,
      `床材間の隙間 ${formatNumber(boardGapCm, 1)}cm ${boardGapOk ? "≤" : ">"} 3cm（563条1項2号ロ）`,
      `床材と建地との隙間 ${formatNumber(postGapCm, 1)}cm ${postGapOk ? "<" : "≥"} 12cm（563条1項2号ハ）`,
      `手すり等の高さ ${formatNumber(handrailHeightCm, 0)}cm ${handrailOk ? "≥" : "<"} 85cm（552条1項4号イの定義を準用）`,
      `中桟等の高さ ${formatNumber(midRailHeightCm, 0)}cm が 35〜50cm の範囲内${midRailOk ? "" : "外"}（552条1項4号ロの定義を準用）`,
      `開口部の囲い等: ${guardOk ? "設置あり → 適合" : "未設置 → 不適合"}（519条）`,
    ],
    warnings,
  };
}

export const workPlatformOpeningCheckCalculator: ConstructionCalculator = {
  slug: "work-platform-opening-check",
  title: "作業床・開口部の基準チェック（安衛則563・552・519・518条）",
  shortTitle: "作業床・開口部チェック",
  summary:
    "足場の作業床の幅・隙間、手すり・中桟の高さ、開口部の囲いの設置状況を入力すると、安衛則第563条・第519条・第518条の基準に適合するかを一括チェックします。",
  fields: [
    {
      kind: "number",
      id: "platformWidthCm",
      label: "作業床の幅",
      unit: "cm",
      min: 10,
      max: 200,
      step: 1,
      defaultValue: 45,
    },
    {
      kind: "number",
      id: "boardGapCm",
      label: "床材間の隙間",
      unit: "cm",
      min: 0,
      max: 30,
      step: 0.5,
      defaultValue: 2,
    },
    {
      kind: "number",
      id: "postGapCm",
      label: "床材と建地との隙間",
      unit: "cm",
      min: 0,
      max: 30,
      step: 0.5,
      defaultValue: 8,
    },
    {
      kind: "number",
      id: "handrailHeightCm",
      label: "手すり等の高さ",
      unit: "cm",
      min: 0,
      max: 150,
      step: 1,
      defaultValue: 90,
    },
    {
      kind: "number",
      id: "midRailHeightCm",
      label: "中桟等の高さ",
      unit: "cm",
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 40,
    },
    {
      kind: "select",
      id: "openingGuardInstalled",
      label: "開口部の囲い・手すり・覆い等",
      options: [
        { value: "installed", label: "設置あり" },
        { value: "none", label: "未設置" },
      ],
      defaultValue: "installed",
    },
  ],
  basis: [
    {
      label: "労働安全衛生規則 第563条（作業床）",
      description: "足場の作業床の幅40cm以上・床材間の隙間3cm以下・床材と建地との隙間12cm未満等を定めています。",
      lawNaviPath: "/law-navi/347M50002000032/563",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000032#Mp-At_563",
    },
    {
      label: "労働安全衛生規則 第552条1項4号（手すり等・中桟等の定義）",
      description: "手すり等は高さ85cm以上、中桟等は高さ35〜50cmとする定義を、架設通路の規定から準用しています。",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000032#Mp-At_552",
    },
    {
      label: "労働安全衛生規則 第519条（開口部等の囲い等）",
      description: "高さ2メートル以上の作業床の端・開口部等には、囲い・手すり・覆い等を設けなければならないことを定めています。",
      lawNaviPath: "/law-navi/347M50002000032/519",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000032#Mp-At_519",
    },
    {
      label: "労働安全衛生規則 第518条（作業床の設置等）",
      description: "高さ2メートル以上の箇所で作業を行う場合は、足場を組み立てる等の方法により作業床を設けなければならないことを定めています。",
      lawNaviPath: "/law-navi/347M50002000032/518",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000032#Mp-At_518",
    },
  ],
  cautions: [
    "本チェックはつり足場を除く一般的な足場の作業床を対象とします（つり足場は574条で別に定められています）。",
    "手すり等・中桟等の高さは第552条（架設通路）の定義を準用したものです。現場の仕様書・図面で個別基準がある場合はそちらを優先してください。",
    "単管足場の建地間隔・積載荷重・壁つなぎは、単管足場チェック（scaffold-tankan-check）で別途確認してください。",
  ],
  examples: [
    { label: "標準的な作業床（幅45cm・手すり90cm・中桟40cm）", values: { platformWidthCm: 45, boardGapCm: 2, postGapCm: 8, handrailHeightCm: 90, midRailHeightCm: 40, openingGuardInstalled: "installed" } },
    { label: "幅・隙間が基準外の例", values: { platformWidthCm: 30, boardGapCm: 5, postGapCm: 15, handrailHeightCm: 70, midRailHeightCm: 25, openingGuardInstalled: "none" } },
  ],
  keywords: [
    "作業床",
    "開口部",
    "手すり",
    "中桟",
    "床材",
    "隙間",
    "幅木",
    "墜落防止",
    "足場 幅",
  ],
  relatedSlugs: ["scaffold-tankan-check", "safety-net-check"],
  compute: computeWorkPlatformOpeningCheck,
};
