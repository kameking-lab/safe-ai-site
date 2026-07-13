/**
 * つり上げ装置（巻上ワイヤ・フック）の安全係数チェック
 *
 * 根拠:
 * - クレーン等安全規則 第213条（玉掛け用ワイヤロープの安全係数）: 安全係数6以上
 *   （切断荷重 ÷ 実荷重）。
 * - クレーン等安全規則 第214条（玉掛け用フック等の安全係数）: フック又はシャックルの
 *   安全係数は5以上（切断荷重 ÷ 実荷重）。
 *
 * ※ 数値の訂正について（重要）: 本機の元プロンプト（calc-squad-1.md）には
 *   「フックの安全係数4」という記載があったが、本リポジトリの法令コーパス
 *   （web/src/data/laws/crane-kisoku.ts 第214条＝「フック又はシャックルの安全係数は
 *   5以上でなければならない」）で確認したところ、第214条の安全係数は5であり4ではない。
 *   出典未確認・誤った数値を載せない方針（絶対原則）に従い、本計算機は一次資料で
 *   確認できる正しい値（ワイヤ6・フック5）を採用する。1-C（rigging-hardware-check）と
 *   同じ第214条を根拠に持つが、本機は「切断荷重からの安全係数そのもの」を確認する用途、
 *   1-Cは「証明書のWLL値と作用荷重の比較」用途で役割が異なる（重複ではない）。
 * - `crane-rated-load`（必要定格総荷重の逆引き）と相互リンク:
 *   本機は玉掛用具（ワイヤ・フック）側の安全係数、crane-rated-load はクレーン本体側の
 *   定格総荷重を扱う。
 */

import type { CalcOutcome, CalcValues, ConstructionCalculator } from "../schema";
import { formatNumber, kgfToKn } from "../schema";

/** クレーン則第213条: ワイヤロープの安全係数 */
export const WIRE_REQUIRED_SAFETY_FACTOR = 6;
/** クレーン則第214条: フック又はシャックルの安全係数 */
export const HOOK_REQUIRED_SAFETY_FACTOR = 5;

function computeHoistRatedCheck(values: CalcValues): CalcOutcome {
  const loadKg = values.loadKg as number;
  const wireBreakingKn = values.wireBreakingKn as number;
  const hookBreakingKn = values.hookBreakingKn as number;

  const loadKn = kgfToKn(loadKg);
  const wireSf = loadKn > 0 ? wireBreakingKn / loadKn : Infinity;
  const hookSf = loadKn > 0 ? hookBreakingKn / loadKn : Infinity;

  const warnings: string[] = [];
  warnings.push("切断荷重・破断荷重は必ずJIS表または製造者検査証明書の値を入力してください。");
  warnings.push("巻上ワイヤ・フックは定期自主検査（クレーン則）の対象です。素線切れ・キンク・変形のあるものは使用してはなりません。");
  warnings.push("ワイヤロープの端末処理（アイスプライス・圧縮止め等）による強度低下は本計算では考慮していません。");

  if (wireBreakingKn <= 0 || hookBreakingKn <= 0) {
    return {
      tone: "danger",
      headline: "切断荷重を入力してください",
      value: "—",
      summary: "巻上ワイヤの切断荷重・フックの破断荷重のいずれか（または両方）が未入力です。証明書の値を入力してください。",
      items: [
        { label: "実荷重", value: `${formatNumber(loadKg, 0)}kg` },
        { label: "巻上ワイヤ切断荷重", value: wireBreakingKn > 0 ? `${formatNumber(wireBreakingKn, 1)}kN` : "未入力", tone: wireBreakingKn > 0 ? undefined : "danger" },
        { label: "フック破断荷重", value: hookBreakingKn > 0 ? `${formatNumber(hookBreakingKn, 1)}kN` : "未入力", tone: hookBreakingKn > 0 ? undefined : "danger" },
      ],
      steps: ["切断荷重・破断荷重のいずれかが0のため安全係数を算定できません。証明書の値を入力してください。"],
      warnings,
    };
  }

  const wireOk = wireSf >= WIRE_REQUIRED_SAFETY_FACTOR - 1e-9;
  const hookOk = hookSf >= HOOK_REQUIRED_SAFETY_FACTOR - 1e-9;
  const ok = wireOk && hookOk;
  const wireSfDisplay = formatNumber(Math.floor(wireSf * 100) / 100, 2);
  const hookSfDisplay = formatNumber(Math.floor(hookSf * 100) / 100, 2);

  if (!wireOk) {
    warnings.unshift(`巻上ワイヤの安全係数が${WIRE_REQUIRED_SAFETY_FACTOR}未満です（クレーン則第213条）。より切断荷重の大きいワイヤへの交換、または実荷重の見直しが必要です。`);
  }
  if (!hookOk) {
    warnings.unshift(`フックの安全係数が${HOOK_REQUIRED_SAFETY_FACTOR}未満です（クレーン則第214条）。より破断荷重の大きいフックへの交換、または実荷重の見直しが必要です。`);
  }

  return {
    tone: ok ? "safe" : "danger",
    headline: ok ? "使用可" : "使用不可",
    value: `ワイヤ${wireSfDisplay} / フック${hookSfDisplay}`,
    summary: ok
      ? `巻上ワイヤの安全係数${wireSfDisplay}（≥${WIRE_REQUIRED_SAFETY_FACTOR}）、フックの安全係数${hookSfDisplay}（≥${HOOK_REQUIRED_SAFETY_FACTOR}）とも基準を満たします。`
      : `巻上ワイヤ安全係数${wireSfDisplay}（要${WIRE_REQUIRED_SAFETY_FACTOR}以上）・フック安全係数${hookSfDisplay}（要${HOOK_REQUIRED_SAFETY_FACTOR}以上）のうち、基準を満たさない項目があります。`,
    items: [
      { label: `巻上ワイヤの安全係数（${WIRE_REQUIRED_SAFETY_FACTOR}以上）`, value: wireSfDisplay, tone: wireOk ? "safe" : "danger" },
      { label: `フックの安全係数（${HOOK_REQUIRED_SAFETY_FACTOR}以上）`, value: hookSfDisplay, tone: hookOk ? "safe" : "danger" },
      { label: "実荷重", value: `${formatNumber(loadKg, 0)}kg（${formatNumber(loadKn, 2)}kN）` },
      { label: "巻上ワイヤ切断荷重", value: `${formatNumber(wireBreakingKn, 1)}kN` },
      { label: "フック破断荷重", value: `${formatNumber(hookBreakingKn, 1)}kN` },
    ],
    steps: [
      `実荷重 = ${formatNumber(loadKg, 0)}kg = ${formatNumber(loadKn, 2)}kN`,
      `巻上ワイヤの安全係数 = 切断荷重${formatNumber(wireBreakingKn, 1)}kN ÷ 実荷重${formatNumber(loadKn, 2)}kN = ${wireSfDisplay}（クレーン則第213条: ${WIRE_REQUIRED_SAFETY_FACTOR}以上）`,
      `フックの安全係数 = 破断荷重${formatNumber(hookBreakingKn, 1)}kN ÷ 実荷重${formatNumber(loadKn, 2)}kN = ${hookSfDisplay}（クレーン則第214条: ${HOOK_REQUIRED_SAFETY_FACTOR}以上）`,
      `判定: ${ok ? "両方とも基準を満たす→使用可" : "いずれかが基準未満→使用不可"}`,
    ],
    warnings,
  };
}

export const hoistRatedCheckCalculator: ConstructionCalculator = {
  slug: "hoist-rated-check",
  title: "つり上げ装置（巻上ワイヤ・フック）の安全係数チェック",
  shortTitle: "つり上げ装置の安全係数",
  summary:
    "実荷重に対して、巻上ワイヤの安全係数6以上（クレーン則第213条）・フックの安全係数5以上（同第214条）を同時に満たすかを、切断荷重・破断荷重の入力から判定します。",
  fields: [
    {
      kind: "number",
      id: "loadKg",
      label: "実荷重",
      unit: "kg",
      min: 1,
      max: 500000,
      step: 10,
      defaultValue: 3000,
      help: "巻上ワイヤ・フックにかかる実際の荷重",
    },
    {
      kind: "number",
      id: "wireBreakingKn",
      label: "巻上ワイヤの切断荷重",
      unit: "kN",
      min: 0,
      max: 10000,
      step: 1,
      defaultValue: 0,
      help: "JIS表または製造者検査証明書の値（未入力=0は判定できません）",
    },
    {
      kind: "number",
      id: "hookBreakingKn",
      label: "フックの破断荷重",
      unit: "kN",
      min: 0,
      max: 10000,
      step: 1,
      defaultValue: 0,
      help: "製造者検査証明書の値（未入力=0は判定できません）",
    },
  ],
  basis: [
    {
      label: "クレーン等安全規則 第213条（玉掛け用ワイヤロープの安全係数）",
      description: "ワイヤロープの安全係数（切断荷重÷実荷重）は6以上でなければ使用してはなりません。",
      lawNaviPath: "/law-navi/347M50002000034/213",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000034#Mp-At_213",
    },
    {
      label: "クレーン等安全規則 第214条（玉掛け用フック等の安全係数）",
      description: "フック又はシャックルの安全係数（破断荷重÷実荷重）は5以上でなければ使用してはなりません。",
      lawNaviPath: "/law-navi/347M50002000034/214",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000034#Mp-At_214",
    },
  ],
  cautions: [
    "切断荷重・破断荷重は必ずJIS表または製造者検査証明書の値を入力してください。",
    "巻上ワイヤ・フックは定期自主検査（クレーン則）の対象です。素線切れ・キンク・変形・著しい摩耗のあるものは使用してはなりません。",
    "本計算は玉掛用具側の安全係数チェックです。クレーン本体の定格総荷重（作業半径での可否）は「クレーン必要定格総荷重の逆引き」をご利用ください。",
    "ワイヤロープの端末処理（アイスプライス・圧縮止め等）による強度低下は考慮していません。実機の証明書値で確認してください。",
  ],
  examples: [
    { label: "実荷重3t・ワイヤ切断荷重220kN・フック破断荷重160kN", values: { loadKg: 3000, wireBreakingKn: 220, hookBreakingKn: 160 } },
    { label: "実荷重5t・ワイヤ切断荷重350kN・フック破断荷重200kN（フック側が不足）", values: { loadKg: 5000, wireBreakingKn: 350, hookBreakingKn: 200 } },
  ],
  keywords: [
    "つり上げ装置",
    "巻上ワイヤ",
    "巻上げワイヤ",
    "フック",
    "安全係数",
    "クレーン",
    "揚重",
    "切断荷重",
    "破断荷重",
    "213条",
    "214条",
    "定期自主検査",
  ],
  compute: computeHoistRatedCheck,
};
