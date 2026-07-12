/**
 * 繊維スリング（ベルトスリング）の使用荷重判定
 *
 * 根拠:
 * - クレーン等安全規則 第218条（不適格な繊維ロープ等の使用禁止）: ストランドの切断・
 *   著しい損傷や腐食のある繊維ロープ・繊維スリングは玉掛けに使用してはならない。
 *   （キャプション出典: web/src/data/laws/egov-caption-snapshot.ts「第218条」。条文全文は
 *    本リポジトリの法令コーパスに未収録のため lawNaviPath は持たせず、e-Gov 原文リンクの
 *    みを basis に明記する＝出典未確認の内部深リンクを作らない。）
 * - 繊維スリングの基本使用荷重（WLL）は製品ラベル・使用荷重表（JIS B 8818 準拠品）の値に
 *   従う。等級（安全率）は製品規格に基づくため、本計算機では数値を断定せず、WLLは常に
 *   製品ラベル・証明書の値を入力する方式にする（出典未確認の数値を載せない方針）。
 * - 掛け方係数はスリング工学の基本（ストレート=1本の使用荷重そのまま、バスケット=均等に
 *   2本で支えるため最大2倍、チョーク（絞り）＝曲げ・締め付けで強度低下）に基づく。
 *   チョークの低減係数0.8は各社使用荷重表に見られる代表値（メーカー公表）。
 *   吊り角度係数 1/cos(θ/2) は玉掛けワイヤ（sling-wire-load）と同じ式・出典を用いる
 *   （バスケット吊りで2本のスリングが開く角度に適用。ストレート・チョークは角度無関係）。
 */

import type { CalcOutcome, CalcValues, ConstructionCalculator } from "../schema";
import { formatNumber } from "../schema";
import { angleCos } from "./sling-wire-load";

export type HitchMode = {
  value: string;
  label: string;
  /** WLL（ストレート単体）に対する掛け方係数 */
  factor: number;
  /** 吊り角度係数(cos(θ/2))を適用するか（バスケットのみ） */
  angleApplies: boolean;
  note: string;
};

export const HITCH_MODES: HitchMode[] = [
  { value: "straight", label: "ストレート吊り（1本掛け）", factor: 1, angleApplies: false, note: "基本使用荷重（WLL）をそのまま適用" },
  {
    value: "basket",
    label: "バスケット吊り（半掛け・2本支持）",
    factor: 2,
    angleApplies: true,
    note: "2本で均等に支えるため基本使用荷重の最大2倍。吊り角度が開くほど低下します",
  },
  {
    value: "choke",
    label: "チョーク吊り（絞り）",
    factor: 0.8,
    angleApplies: false,
    note: "曲げ・締め付けにより強度が約20%低下（メーカー公表の代表値）",
  },
];

const HITCH_BY_VALUE = new Map(HITCH_MODES.map((m) => [m.value, m]));

/** JIS表示色（参考・使用荷重の断定はしない） */
export const GRADE_LABELS: Record<string, string> = {
  unknown: "不明・ラベルで直接確認",
  green: "グリーン系",
  yellow: "イエロー系",
  gray: "グレー系",
  red: "レッド系",
  brown: "ブラウン系",
  orange: "オレンジ系",
};

function computeFiberSlingLoad(values: CalcValues): CalcOutcome {
  const hitch = HITCH_BY_VALUE.get(String(values.hitch)) ?? HITCH_MODES[0];
  const wllKg = values.wllKg as number;
  const angleDeg = Number(values.angle);
  const loadKg = values.loadKg as number;
  const grade = String(values.grade ?? "unknown");

  const cos = hitch.angleApplies ? angleCos(angleDeg) : 1;
  const capacityKg = wllKg * hitch.factor * cos;
  const ok = capacityKg >= loadKg;

  const warnings: string[] = [];
  if (hitch.value === "basket" && angleDeg > 60) {
    warnings.push("バスケット吊りで吊り角度が60°を超えると使用荷重が急減します。角度をできるだけ小さくしてください。");
  }
  if (hitch.value === "choke") {
    warnings.push("チョーク吊り（絞り）の低減係数0.8はメーカー公表の代表値です。実際の使用荷重は製品の使用荷重表で確認してください。");
  }
  warnings.push("スリングの角部にかかる箇所には必ず当て物（コーナーパッド等）を使用し、鋭角部での擦れ・切断を防いでください。");
  warnings.push("紫外線・薬品・高温による劣化、ラベル（使用荷重・製造年月）が判読できないスリングは廃棄してください。");
  warnings.push("不適格な繊維スリング（切断・著しい損傷・腐食のあるもの）は使用してはなりません（クレーン則第218条）。");
  warnings.push("色分けは製品・規格により異なります。使用荷重は必ずラベル記載のWLL数値で確認してください。");
  if (!ok) {
    warnings.unshift(
      "この条件では使用荷重が不足しています。掛け方の変更（バスケット化）・吊り角度を小さくする・より使用荷重の大きいスリングへの変更を検討してください。",
    );
  }

  return {
    tone: ok ? "safe" : "danger",
    headline: ok ? "使用可" : "使用不可",
    value: formatNumber(Math.floor(capacityKg), 0),
    unit: "kg",
    summary: ok
      ? `${hitch.label}での使用荷重は約${formatNumber(Math.floor(capacityKg), 0)}kgで、荷の質量${formatNumber(loadKg, 0)}kg以上を確保できます。`
      : `${hitch.label}での使用荷重は約${formatNumber(Math.floor(capacityKg), 0)}kgで、荷の質量${formatNumber(loadKg, 0)}kgに対し不足しています。`,
    items: [
      { label: "この条件での使用荷重", value: `${formatNumber(Math.floor(capacityKg), 0)}kg`, tone: ok ? "safe" : "danger" },
      { label: "基本使用荷重（WLL・ラベル値）", value: `${formatNumber(wllKg, 0)}kg` },
      { label: "掛け方", value: hitch.label, note: hitch.note },
      ...(hitch.angleApplies ? [{ label: "吊り角度", value: `${angleDeg}°` }] : []),
      { label: "荷の質量", value: `${formatNumber(loadKg, 0)}kg` },
      { label: "等級色（参考）", value: GRADE_LABELS[grade] ?? GRADE_LABELS.unknown },
    ],
    steps: [
      `使用荷重 = 基本使用荷重${formatNumber(wllKg, 0)}kg × 掛け方係数${formatNumber(hitch.factor, 2)}${hitch.angleApplies ? ` × cos(${angleDeg}°/2)${formatNumber(cos, 3)}` : ""} = ${formatNumber(capacityKg, 0)}kg`,
      `判定: 使用荷重${formatNumber(Math.floor(capacityKg), 0)}kg ${ok ? "≥" : "<"} 荷の質量${formatNumber(loadKg, 0)}kg → ${ok ? "使用可" : "使用不可"}`,
    ],
    warnings,
  };
}

export const fiberSlingLoadCalculator: ConstructionCalculator = {
  slug: "fiber-sling-load",
  title: "繊維スリング（ベルトスリング）の使用荷重判定",
  shortTitle: "繊維スリング使用荷重",
  summary:
    "ベルトスリングの基本使用荷重（WLL・製品ラベル値）に掛け方（ストレート／バスケット／チョーク）と吊り角度の係数を掛けて使用荷重を求め、荷の質量と比較します。",
  fields: [
    {
      kind: "select",
      id: "hitch",
      label: "掛け方",
      options: HITCH_MODES.map((m) => ({ value: m.value, label: m.label })),
      defaultValue: "straight",
      help: "バスケット吊りは最大2倍、チョーク吊りは約20%減",
    },
    {
      kind: "number",
      id: "wllKg",
      label: "基本使用荷重（WLL・ラベル値）",
      unit: "kg",
      min: 1,
      max: 50000,
      step: 10,
      defaultValue: 1000,
      help: "製品ラベル・使用荷重証明書に記載のストレート吊り基本使用荷重",
    },
    {
      kind: "number",
      id: "angle",
      label: "吊り角度",
      unit: "°",
      min: 0,
      max: 120,
      step: 15,
      defaultValue: 0,
      help: "バスケット吊りのみ有効（ストレート・チョークでは無視されます）",
      aiOptional: true,
    },
    {
      kind: "number",
      id: "loadKg",
      label: "荷の質量",
      unit: "kg",
      min: 1,
      max: 50000,
      step: 10,
      defaultValue: 500,
      help: "吊り具・付属品の質量も含めた総質量",
    },
    {
      kind: "select",
      id: "grade",
      label: "等級色（参考・任意）",
      options: Object.entries(GRADE_LABELS).map(([value, label]) => ({ value, label })),
      defaultValue: "unknown",
      help: "色分けは製品規格により異なります。判定には使用荷重（WLL）の数値を使ってください",
      aiOptional: true,
    },
  ],
  basis: [
    {
      label: "クレーン等安全規則 第218条（不適格な繊維ロープ等の使用禁止）",
      description: "ストランドの切断・著しい損傷や腐食のある繊維ロープ・繊維スリングは玉掛けに使用できません。",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000034#Mp-At_218",
    },
    {
      label: "JIS B 8818（繊維ベルトスリング）／製造者使用荷重表",
      description:
        "基本使用荷重（WLL）と安全率は製品規格・製造者証明書に基づきます。数値は必ず製品ラベル・証明書の値を入力してください。",
    },
    {
      label: "玉掛けワイヤロープの安全荷重・張力計算（sling-wire-load）と同じ吊り角度係数",
      description: "バスケット吊りの吊り角度係数（cos(θ/2)）は、玉掛けワイヤの計算機と共通の式を用いています。",
    },
  ],
  cautions: [
    "不適格な繊維スリング（切断・著しい損傷・腐食のあるもの）は使用してはなりません（クレーン則第218条）。",
    "角部には当て物（コーナーパッド）を使用し、鋭角部での擦れ・切断を防いでください。",
    "紫外線・薬品・高温による劣化、ラベル（使用荷重・製造年月）が判読できないスリングは廃棄してください。",
    "つり上げ荷重1t以上の玉掛け作業には玉掛け技能講習の修了が必要です（安衛法第61条・安衛令第20条第16号）。",
    "つりチェーン・ワイヤロープ・フック/シャックルは安全係数の考え方が異なります。本計算機は繊維スリング専用です。",
  ],
  examples: [
    { label: "500kgをストレート吊り・WLL1t", values: { hitch: "straight", wllKg: 1000, angle: "0", loadKg: 500, grade: "unknown" } },
    { label: "1.5tをバスケット吊り60°・WLL1t", values: { hitch: "basket", wllKg: 1000, angle: "60", loadKg: 1500, grade: "green" } },
    { label: "600kgをチョーク吊り・WLL1t", values: { hitch: "choke", wllKg: 1000, angle: "0", loadKg: 600, grade: "unknown" } },
  ],
  keywords: [
    "繊維スリング",
    "ベルトスリング",
    "スリング",
    "玉掛け",
    "玉掛",
    "バスケット吊り",
    "バスケットづり",
    "チョーク吊り",
    "ちょーくづり",
    "絞り",
    "ストレート吊り",
    "WLL",
    "使用荷重",
    "クレーン",
    "揚重",
    "218条",
  ],
  compute: computeFiberSlingLoad,
};
