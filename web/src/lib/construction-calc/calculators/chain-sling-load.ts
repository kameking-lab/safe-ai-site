/**
 * つりチェーン（チェーンスリング）の安全荷重・安全係数判定
 *
 * 根拠:
 * - クレーン等安全規則 第213条の2（玉掛け用つりチェーンの安全係数）:
 *   切断荷重 ÷ 安全係数 が使用荷重以上であること。安全係数は原則5以上。
 *   ただし次の①②両方を満たすものは4以上で可。
 *     ① 伸びが製造時の長さの0.5%を超えないこと
 *     ② 断面直径の減少が製造時の10%を超えないこと
 *   （キャプション出典: web/src/data/laws/egov-caption-snapshot.ts「第213条の2」。
 *    条文全文は本リポジトリの法令コーパスに未収録のため lawNaviPath は持たせず、
 *    e-Gov 原文リンクのみを basis に明記する＝出典未確認の内部深リンクを作らない。）
 * - クレーン等安全規則 第216条（不適格なつりチェーンの使用禁止）
 * - 掛け数・吊り角度による張力増加は玉掛けワイヤ（sling-wire-load）と同じモード係数方式
 *   （有効本数 × cos(θ/2)）を用いる。角度項の計算式（cos(θ/2)）はワイヤ計算機の関数を
 *   そのまま再利用し、係数の出典を一本化する。
 * - チェーンの等級別・径別の切断荷重は JIS B 8817（チェーンスリング）または製造者証明書の
 *   値によるが、本リポジトリで径ズレなく確認できる一次資料が無いため、切断荷重は
 *   製造者証明書の値を都度入力する方式にする（出典未確認の数値を載せない方針）。
 */

import type { CalcOutcome, CalcValues, ConstructionCalculator } from "../schema";
import { formatNumber, kgfToKn, STANDARD_GRAVITY } from "../schema";
import { angleCos } from "./sling-wire-load";

/** 掛け方（有効本数）。3点・4点吊りは荷重が均等にかからないため3本扱い（sling-wire-load 踏襲） */
export type ChainLegsMode = {
  value: string;
  label: string;
  legs: number;
  angleApplies: boolean;
  note: string;
};

export const CHAIN_LEGS_MODES: ChainLegsMode[] = [
  { value: "v1", label: "1本つり（垂直）", legs: 1, angleApplies: false, note: "垂直1本吊り" },
  { value: "s2", label: "2本つり（2点）", legs: 2, angleApplies: true, note: "標準的な2本2点吊り" },
  {
    value: "s34",
    label: "3点／4点つり（3本扱い）",
    legs: 3,
    angleApplies: true,
    note: "4本掛けでも荷重が均等にかからないため3本つりで算定（日本クレーン協会・玉掛けワイヤと同じ考え方）",
  },
];

const CHAIN_LEGS_BY_VALUE = new Map(CHAIN_LEGS_MODES.map((m) => [m.value, m]));

/** 安全係数の選択肢 */
export type ChainSafetyFactor = "5" | "4";

export const CHAIN_SAFETY_FACTORS: Record<ChainSafetyFactor, number> = {
  "5": 5,
  "4": 4,
};

function computeChainSlingLoad(values: CalcValues): CalcOutcome {
  const loadKg = values.loadKg as number;
  const mode = CHAIN_LEGS_BY_VALUE.get(String(values.legs)) ?? CHAIN_LEGS_MODES[1];
  const angleDeg = Number(values.angle);
  const breakingLoadKn = values.breakingLoadKn as number;
  const safety = String(values.safety) as ChainSafetyFactor;
  const requiredSf = CHAIN_SAFETY_FACTORS[safety] ?? 5;

  const cos = mode.angleApplies ? angleCos(angleDeg) : 1;
  const cosFactor = cos === 0 ? 1e-9 : cos;
  const tensionKgf = (loadKg / mode.legs) / cosFactor;
  const tensionKn = kgfToKn(tensionKgf);

  const warnings: string[] = [];
  if (safety === "4") {
    warnings.push(
      "安全係数4が使えるのは、①伸びが製造時の長さの0.5%を超えないこと、②断面直径の減少が製造時の10%を超えないこと、の両方を満たすチェーンに限られます（クレーン則第213条の2）。条件を満たさない場合は安全係数5で判定してください。",
    );
  }
  if (mode.value === "s34") {
    warnings.push(
      "3点・4点吊りは各チェーンに荷重が均等にかからないため、有効本数3本として安全側で算定しています。",
    );
  }
  if (mode.angleApplies && angleDeg > 60) {
    warnings.push("吊り角度が60°を超えると張力が急増します。可能な限り吊り角度は60°以内に収めてください。");
  }
  warnings.push(
    "使用前にチェーンの伸び・摩耗・変形・リンクの損傷の有無を点検し、不適格なつりチェーン（クレーン則第216条）は使用してはなりません。",
  );
  warnings.push(
    "つり上げ荷重1t以上の玉掛け作業には玉掛け技能講習の修了が必要です（安衛法第61条・安衛令第20条第16号）。作業主任者の選任が必要な作業か確認してください。",
  );
  warnings.push("切断荷重は必ずチェーンの製造者検査証明書の値を入力してください。");

  if (breakingLoadKn <= 0) {
    return {
      tone: "danger",
      headline: "切断荷重を入力してください",
      value: "—",
      summary:
        "チェーン1本の切断荷重（製造者証明書の値）が入力されていません。JIS B 8817または証明書記載の切断荷重をkN単位で入力してください。",
      items: [
        { label: "荷の質量", value: `${formatNumber(loadKg, 0)}kg` },
        { label: "掛け方", value: mode.label, note: mode.note },
        { label: "吊り角度", value: `${angleDeg}°` },
        { label: "切断荷重", value: "未入力", tone: "danger" },
      ],
      steps: ["切断荷重（kN）が0のため安全係数を算定できません。証明書の値を入力してください。"],
      warnings,
    };
  }

  const actualSafetyFactor = tensionKn > 0 ? breakingLoadKn / tensionKn : Infinity;
  const ok = actualSafetyFactor >= requiredSf - 1e-9;
  const sfDisplay = formatNumber(Math.floor(actualSafetyFactor * 100) / 100, 2);
  const maxLoadKg = (breakingLoadKn * 1000 * mode.legs * cos) / STANDARD_GRAVITY / requiredSf;

  if (!ok) {
    warnings.unshift(
      `この条件では安全係数${requiredSf}以上を確保できません。使用荷重を下げる、掛け数を増やす、吊り角度を小さくする、または切断荷重の大きいチェーンへの変更を検討してください。`,
    );
  }

  return {
    tone: ok ? "safe" : "danger",
    headline: ok ? "使用可" : "使用不可",
    value: sfDisplay,
    unit: "",
    summary: ok
      ? `${mode.label}・切断荷重${formatNumber(breakingLoadKn, 1)}kNでの安全係数は${sfDisplay}で、安全係数${requiredSf}以上（クレーン則第213条の2）を満たします。`
      : `${mode.label}・切断荷重${formatNumber(breakingLoadKn, 1)}kNでの安全係数は${sfDisplay}で、安全係数${requiredSf}以上（クレーン則第213条の2）を満たしません。`,
    items: [
      { label: `安全係数（${requiredSf}以上で使用可）`, value: sfDisplay, tone: ok ? "safe" : "danger" },
      { label: "掛け方", value: mode.label, note: mode.note },
      { label: "吊り角度", value: `${angleDeg}°` },
      { label: "チェーン1本あたりの張力", value: `${formatNumber(tensionKgf, 0)}kg（${formatNumber(tensionKn, 2)}kN）` },
      { label: "チェーン1本の切断荷重（証明書値）", value: `${formatNumber(breakingLoadKn, 1)}kN` },
      { label: "この掛け方で吊れる最大質量", value: `${formatNumber(Math.floor(maxLoadKg), 0)}kg` },
    ],
    steps: [
      `1本あたり張力 T = ${formatNumber(loadKg, 0)}kg ÷ 有効本数${mode.legs} ÷ cos(${angleDeg}°/2)${formatNumber(cos, 3)} = ${formatNumber(tensionKgf, 0)}kg（${formatNumber(tensionKn, 2)}kN）`,
      `安全係数 = 切断荷重 ${formatNumber(breakingLoadKn, 1)}kN ÷ 張力 ${formatNumber(tensionKn, 2)}kN = ${sfDisplay}`,
      `判定: ${sfDisplay} ${ok ? "≥" : "<"} ${requiredSf}（クレーン則第213条の2）→ ${ok ? "使用可" : "使用不可"}`,
    ],
    warnings,
  };
}

export const chainSlingLoadCalculator: ConstructionCalculator = {
  slug: "chain-sling-load",
  title: "つりチェーンの安全荷重・安全係数計算",
  shortTitle: "つりチェーン安全荷重",
  summary:
    "荷の質量・掛け方（1本／2点／3点4点）・吊り角度と、チェーン1本の切断荷重（製造者証明書の値）から、クレーン等安全規則第213条の2の安全係数（原則5以上、条件を満たせば4以上）を判定します。",
  fields: [
    {
      kind: "number",
      id: "loadKg",
      label: "荷の質量",
      unit: "kg",
      min: 100,
      max: 100000,
      step: 10,
      defaultValue: 1000,
      help: "吊り具・付属品の質量も含めた総質量",
    },
    {
      kind: "select",
      id: "legs",
      label: "掛け方",
      options: CHAIN_LEGS_MODES.map((m) => ({ value: m.value, label: m.label })),
      defaultValue: "s2",
      help: "3点・4点吊りは3本つり扱いで安全側に算定します",
    },
    {
      kind: "number",
      id: "angle",
      label: "吊り角度",
      unit: "°",
      min: 0,
      max: 120,
      step: 15,
      defaultValue: 60,
      help: "2点以上のとき有効（1本つりでは無視されます）",
      aiOptional: true,
    },
    {
      kind: "number",
      id: "breakingLoadKn",
      label: "チェーン1本の切断荷重",
      unit: "kN",
      min: 0,
      max: 1000,
      step: 0.1,
      defaultValue: 0,
      help: "JIS B 8817表または製造者検査証明書に記載の値を入力（未入力=0は判定できません）",
    },
    {
      kind: "select",
      id: "safety",
      label: "安全係数",
      options: [
        { value: "5", label: "5（原則）" },
        { value: "4", label: "4（伸び0.5%以下かつ径減少10%以下の条件を満たす場合のみ）" },
      ],
      defaultValue: "5",
      help: "4を選べるのは条文の2条件を両方満たすときだけです",
    },
  ],
  basis: [
    {
      label: "クレーン等安全規則 第213条の2（玉掛け用つりチェーンの安全係数）",
      description:
        "つりチェーンの安全係数は原則5以上。伸びが製造時の長さの0.5%を超えず、かつ断面直径の減少が製造時の10%を超えないものは4以上でよいとされています。",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000034#Mp-At_213_2",
    },
    {
      label: "クレーン等安全規則 第216条（不適格なつりチェーンの使用禁止）",
      description: "伸び・摩耗・変形・き裂等のある不適格なつりチェーンは玉掛けに使用できません。",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000034#Mp-At_216",
    },
    {
      label: "玉掛けワイヤロープの安全荷重・張力計算（sling-wire-load）と同じモード係数方式",
      description:
        "掛け数・吊り角度による張力増加の考え方（有効本数×cos(θ/2)）は、玉掛けワイヤの計算機と共通の式・出典を用いています。",
    },
  ],
  cautions: [
    "つり上げ荷重1t以上の玉掛け作業には玉掛け技能講習の修了が必要です（安衛法第61条・安衛令第20条第16号）。",
    "使用前にチェーンの伸び・摩耗・変形・リンクの損傷の有無を点検してください。不適格なつりチェーン（クレーン則第216条）は使用禁止です。",
    "切断荷重は必ずチェーンの製造者検査証明書の値を入力してください。等級（V/VL・8級・10級等）や径によって切断荷重は大きく異なります。",
    "玉掛けワイヤロープ（安全係数6・クレーン則第213条）やフック・シャックル（安全係数5・同第214条）は本計算機の対象外です。ワイヤは「玉掛けワイヤ安全荷重計算」、フック・シャックルは「玉掛用具の使用荷重チェック」をご利用ください。",
  ],
  examples: [
    { label: "1tを2本つり60°・切断荷重35kN・安全係数5", values: { loadKg: 1000, legs: "s2", angle: "60", breakingLoadKn: 35, safety: "5" } },
    { label: "2tを3点4点つり垂直・切断荷重40kN・安全係数4（条件適合品）", values: { loadKg: 2000, legs: "s34", angle: "0", breakingLoadKn: 40, safety: "4" } },
  ],
  keywords: [
    "つりチェーン",
    "チェーンスリング",
    "チェーン",
    "玉掛け",
    "玉掛",
    "安全係数",
    "クレーン",
    "揚重",
    "荷重",
    "切断荷重",
    "213条の2",
    "V級",
    "VL級",
    "8級",
    "10級",
  ],
  compute: computeChainSlingLoad,
};
