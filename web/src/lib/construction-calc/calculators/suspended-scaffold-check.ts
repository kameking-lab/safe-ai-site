/**
 * 吊り足場の基準チェック（安全係数・作業床の幅）
 *
 * 【一次資料での訂正】量産元プロンプトは安全係数（10/5/2.5）の根拠を安衛則574条としていたが、
 * 条文本文を確認すると、つり足場の安全係数（つりワイヤロープ・つり鋼線10以上／つり鎖・つり
 * フック5以上／つり鋼帯並びに上部下部支点の安全係数〈鋼材2.5以上・木材5以上〉）は
 * **第562条2項**（最大積載荷重）に定められている。第574条は、つりワイヤロープ等の使用禁止
 * 条件（素線切断・径減少・キンク・腐食等）と作業床の幅40cm以上・隙間なし等の物理基準を、
 * 第575条はつり足場上での脚立・はしご使用の作業禁止を定める。本機は正しい条文に基づいて実装する。
 *
 * 根拠（一次資料 e-Gov 労働安全衛生規則）:
 * - 第562条2項: つり足場の安全係数 =
 *     つりワイヤロープ及びつり鋼線: 10以上
 *     つり鎖及びつりフック: 5以上
 *     つり鋼帯並びにつり足場の下部及び上部の支点: 鋼材2.5以上・木材5以上
 *   安全係数 = 破断荷重（又は最大使用荷重）÷ 実際にかかる荷重
 * - 第574条1項6号: 作業床は幅40センチメートル以上とし、かつ、隙間がないようにすること。
 * - 第574条1〜5号: つりワイヤロープ・つり鎖・つり鋼線/鋼帯・つり繊維索の使用禁止条件
 *   （素線10%以上切断・径減少7%超・キンク・著しい腐食等）は現地点検が必要（本計算は範囲外）。
 * - 第575条: つり足場の上で、脚立・はしご等を用いて労働者に作業させてはならない。
 * - 第565条: つり足場（ゴンドラのつり足場を除く）の組立て・解体・変更の作業には、
 *   高さにかかわらず足場の組立て等作業主任者の選任が必要。
 *
 * 判定は決定論的なしきい値チェック（AIは使わない）。
 */

import type { CalcCheckItem, CalcOutcome, CalcValues, ConstructionCalculator } from "../schema";
import { formatNumber } from "../schema";

export type SuspensionMemberType = "wire" | "chain_hook" | "support_steel" | "support_wood";

/** 第562条2項の部材別 安全係数 */
export const REQUIRED_SAFETY_FACTOR: Record<SuspensionMemberType, number> = {
  wire: 10,
  chain_hook: 5,
  support_steel: 2.5,
  support_wood: 5,
};

export const MEMBER_LABELS: Record<SuspensionMemberType, string> = {
  wire: "つりワイヤロープ・つり鋼線",
  chain_hook: "つり鎖・つりフック",
  support_steel: "つり鋼帯・上部/下部支点（鋼材）",
  support_wood: "つり足場の上部/下部支点（木材）",
};

/** 574条1項6号の作業床の幅の最小値 [cm] */
export const MIN_WORK_FLOOR_WIDTH_CM = 40;

/** 安全係数 = 破断荷重(最大使用荷重) ÷ 実荷重 */
export function safetyFactor(breakingLoadKN: number, actualLoadKN: number): number {
  return breakingLoadKN / actualLoadKN;
}

function computeSuspendedScaffoldCheck(values: CalcValues): CalcOutcome {
  const memberType = values.memberType as SuspensionMemberType;
  const breakingLoadKN = values.breakingLoadKN as number;
  const actualLoadKN = values.actualLoadKN as number;
  const workFloorWidthCm = values.workFloorWidthCm as number;
  const gapStatus = values.gapStatus as string;

  const required = REQUIRED_SAFETY_FACTOR[memberType];
  const actual = safetyFactor(breakingLoadKN, actualLoadKN);
  const factorOk = actual >= required - 1e-9;
  const widthOk = workFloorWidthCm >= MIN_WORK_FLOOR_WIDTH_CM - 1e-9;
  const gapOk = gapStatus === "none";

  const items: CalcCheckItem[] = [
    {
      label: `安全係数（${MEMBER_LABELS[memberType]}）`,
      value: `${formatNumber(actual, 2)}（必要 ${formatNumber(required, 1)}以上）`,
      tone: factorOk ? "safe" : "danger",
      note: "安衛則562条2項",
    },
    {
      label: "作業床の幅",
      value: `${formatNumber(workFloorWidthCm, 0)}cm（限度 ${MIN_WORK_FLOOR_WIDTH_CM}cm以上）`,
      tone: widthOk ? "safe" : "danger",
      note: "安衛則574条1項6号",
    },
    {
      label: "作業床の隙間",
      value: gapOk ? "隙間なし" : "隙間あり",
      tone: gapOk ? "safe" : "danger",
      note: "安衛則574条1項6号（隙間がないこと）",
    },
  ];

  const failures = items.filter((i) => i.tone === "danger");
  const ok = failures.length === 0;

  const warnings: string[] = [];
  if (!ok) {
    warnings.push(`${failures.map((f) => f.label).join("・")}が基準を満たしていません。是正が必要です。`);
  }
  warnings.push(
    "つりワイヤロープ・つり鎖等の使用禁止条件（安衛則574条1〜4号：素線10%以上切断・径の減少7%超・キンク・伸び5%超・リンク断面径減少10%超・亀裂・著しい損傷/変形/腐食等）に該当しないか、必ず現地で点検してください（本計算は数値算定のみで現物点検を代替しません）。",
  );
  warnings.push("つり足場の上で、脚立・はしご等を用いて作業させることは禁止されています（安衛則575条）。");
  warnings.push(
    "つり足場（ゴンドラのつり足場を除く）の組立て・解体・変更の作業には、高さにかかわらず足場の組立て等作業主任者の選任が必要です（安衛則565条）。",
  );

  return {
    tone: ok ? "safe" : "danger",
    headline: ok ? "基準適合" : "基準不適合",
    value: formatNumber(actual, 2),
    unit: "（安全係数）",
    summary: ok
      ? `安全係数${formatNumber(actual, 2)}は${MEMBER_LABELS[memberType]}の必要係数${formatNumber(required, 1)}以上を満たし、作業床の幅・隙間も安衛則574条の基準内です。`
      : `${failures.map((f) => f.label).join("・")}が基準を満たしていません。`,
    items,
    steps: [
      `安全係数 = 破断荷重（最大使用荷重）${formatNumber(breakingLoadKN, 1)}kN ÷ 実荷重${formatNumber(actualLoadKN, 2)}kN = ${formatNumber(actual, 2)}`,
      `${MEMBER_LABELS[memberType]}の必要安全係数 ${formatNumber(required, 1)}以上（安衛則562条2項）と比較 → ${factorOk ? "適合" : "不適合"}`,
      `作業床の幅 ${formatNumber(workFloorWidthCm, 0)}cm ${widthOk ? "≥" : "<"} 40cm（574条1項6号） → ${widthOk ? "適合" : "不適合"}`,
      `作業床の隙間: ${gapOk ? "なし → 適合" : "あり → 不適合"}（574条1項6号）`,
    ],
    warnings,
  };
}

export const suspendedScaffoldCheckCalculator: ConstructionCalculator = {
  slug: "suspended-scaffold-check",
  title: "吊り足場の基準チェック（安衛則562・574・575条）",
  shortTitle: "吊り足場チェック",
  summary:
    "つりワイヤロープ・つり鎖・つりフック・支点等の破断荷重と実荷重から安全係数（第562条2項）を判定し、作業床の幅・隙間（第574条）も併せてチェックします。",
  fields: [
    {
      kind: "select",
      id: "memberType",
      label: "点検対象の部材",
      options: [
        { value: "wire", label: "つりワイヤロープ・つり鋼線（安全係数10以上）" },
        { value: "chain_hook", label: "つり鎖・つりフック（安全係数5以上）" },
        { value: "support_steel", label: "上部/下部支点・つり鋼帯（鋼材、安全係数2.5以上）" },
        { value: "support_wood", label: "上部/下部支点（木材、安全係数5以上）" },
      ],
      defaultValue: "wire",
    },
    {
      kind: "number",
      id: "breakingLoadKN",
      label: "破断荷重（又は最大使用荷重）",
      unit: "kN",
      min: 0.1,
      max: 10000,
      step: 0.1,
      defaultValue: 100,
      help: "製造者の証明書・仕様書の値を入力",
    },
    {
      kind: "number",
      id: "actualLoadKN",
      label: "実荷重（この部材に実際にかかる荷重）",
      unit: "kN",
      min: 0.01,
      max: 10000,
      step: 0.1,
      defaultValue: 8,
    },
    {
      kind: "number",
      id: "workFloorWidthCm",
      label: "作業床の幅",
      unit: "cm",
      min: 10,
      max: 200,
      step: 1,
      defaultValue: 45,
    },
    {
      kind: "select",
      id: "gapStatus",
      label: "作業床の隙間",
      options: [
        { value: "none", label: "隙間なし" },
        { value: "exists", label: "隙間あり" },
      ],
      defaultValue: "none",
    },
  ],
  basis: [
    {
      label: "労働安全衛生規則 第562条2項（つり足場の安全係数）",
      description:
        "つり足場の安全係数を、つりワイヤロープ及びつり鋼線10以上、つり鎖及びつりフック5以上、つり鋼帯並びにつり足場の下部及び上部の支点は鋼材2.5以上・木材5以上と定めています。",
      lawNaviPath: "/law-navi/347M50002000032/562",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000032#Mp-At_562",
    },
    {
      label: "労働安全衛生規則 第574条（つり足場）",
      description:
        "つりワイヤロープ・つり鎖等の使用禁止条件（素線切断・径の減少・キンク・腐食等）と、作業床の幅40cm以上・隙間なし等を定めています。",
      lawNaviPath: "/law-navi/347M50002000032/574",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000032#Mp-At_574",
    },
    {
      label: "労働安全衛生規則 第575条（作業禁止）",
      description: "つり足場の上で、脚立・はしご等を用いて労働者に作業させてはならないことを定めています。",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000032#Mp-At_575",
    },
    {
      label: "労働安全衛生規則 第565条（足場の組立て等作業主任者）",
      description: "つり足場（ゴンドラのつり足場を除く）の組立て・解体・変更の作業には作業主任者の選任が必要です。",
      lawNaviPath: "/law-navi/347M50002000032/565",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000032#Mp-At_565",
    },
  ],
  cautions: [
    "破断荷重（最大使用荷重）は、必ず製造者の検査証明書・仕様書の値を入力してください。",
    "つりワイヤロープ・つり鎖等の使用禁止条件（素線切断・キンク・腐食等）は現地の目視・寸法点検が必要で、本計算には含まれません。",
    "つり足場の上での脚立・はしご使用は禁止されています（575条）。天井走行クレーンのゴンドラつり足場は対象が異なります。",
  ],
  examples: [
    { label: "つりワイヤロープ（破断100kN・実荷重8kN・幅45cm）", values: { memberType: "wire", breakingLoadKN: 100, actualLoadKN: 8, workFloorWidthCm: 45, gapStatus: "none" } },
    { label: "つり鎖・実荷重超過の例（破断30kN・実荷重8kN）", values: { memberType: "chain_hook", breakingLoadKN: 30, actualLoadKN: 8, workFloorWidthCm: 45, gapStatus: "none" } },
  ],
  keywords: [
    "吊り足場",
    "つり足場",
    "つりワイヤロープ",
    "つり鎖",
    "つりフック",
    "安全係数",
    "ゴンドラ",
    "棚足場",
  ],
  compute: computeSuspendedScaffoldCheck,
};
