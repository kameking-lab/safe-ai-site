/**
 * 防護棚（朝顔）の設置基準チェック
 *
 * 「吊り防護」の対象確定: 建設現場で「吊り防護」といえば、足場から張り出して落下物を
 * 受ける防護棚（通称「朝顔」）を指すのが通例のため、本機は防護棚（朝顔）を扱う
 * （電線防護管を指す場合は別機 cable-guard として切り出す）。
 *
 * 根拠（一次資料）:
 * - 建設工事公衆災害防止対策要綱（建築工事等編）第28条（防護棚）
 *   国土交通省 令和元年9月改訂版（https://www.mlit.go.jp/common/001221756.pdf）の条文から
 *   数値を確認して固定している。
 *   施工者は、建築工事を行う部分から、ふ角75度を超える範囲又は水平距離5メートル以内の範囲に
 *   隣家・一般の交通その他の用に供せられている場所がある場合には、次により防護棚を設けなければ
 *   ならない。
 *     一 建築工事を行う部分が、地盤面からの高さ10m以上の場合は1段以上、20m以上の場合は2段以上。
 *     二 最下段の防護棚は、建築工事を行う部分の下10m以内の位置に設けること
 *       （外部足場の外側より水平距離2m以上の出のある歩道防護構台がある場合は最下段を省略可）。
 *     三 防護棚はすき間がないもので、十分な耐力を有する適正な厚さであること。
 *     四 骨組の外側から水平距離2m以上突出させ、水平面となす角度を20度以上とすること。
 * - 労働安全衛生規則 第537条（物体の落下による危険の防止）・第538条（物体の飛来による危険の防止）。
 *
 * 要綱の数値（10m/20m・10m以内・2m・20度・75度・5m）は上記一次資料で確認できた値のみを判定に使う。
 * 三号（すき間・耐力・厚さ）・最下段位置の実測は本計算の範囲外（現地確認・注意喚起に留める）。
 * 自治体条例・発注者特記で要綱より厳しい基準が定められる場合があるため、必ず現地の上乗せ基準を
 * 確認すること。
 *
 * 判定は決定論的な幾何計算としきい値チェック（AIは使わない）。
 */

import type { CalcCheckItem, CalcOutcome, CalcValues, ConstructionCalculator } from "../schema";
import { formatNumber } from "../schema";

/** 要綱第28条の基準値 */
export const CANOPY_LIMITS = {
  /** 設置要否の判定角度（ふ角）[度]。これを超えると該当（「超える」＝厳密に超過） */
  triggerAngleDeg: 75,
  /** 設置要否の判定水平距離 [m]。これ以下だと該当 */
  triggerDistanceM: 5,
  /** 1段以上必要となる高さ [m] */
  stage1HeightM: 10,
  /** 2段以上必要となる高さ [m] */
  stage2HeightM: 20,
  /** 突出し幅の最小値 [m] */
  minWidthM: 2,
  /** 水平面となす角度の最小値 [度] */
  minAngleDeg: 20,
} as const;

/** ふ角（地盤面の境界点から見た、建築工事を行う部分頂部への仰角）[度] */
export function elevationAngleDeg(heightM: number, roadDistanceM: number): number {
  return (Math.atan2(heightM, roadDistanceM) * 180) / Math.PI;
}

/** 要綱28条本文の設置要否トリガー（ふ角75度超 又は 水平距離5m以内） */
export function canopyRequired(heightM: number, roadDistanceM: number): boolean {
  return (
    elevationAngleDeg(heightM, roadDistanceM) > CANOPY_LIMITS.triggerAngleDeg + 1e-9 ||
    roadDistanceM <= CANOPY_LIMITS.triggerDistanceM + 1e-9
  );
}

/** 要綱28条1号の必要段数（トリガー非該当なら0） */
export function requiredStages(heightM: number, triggered: boolean): 0 | 1 | 2 {
  if (!triggered) return 0;
  if (heightM >= CANOPY_LIMITS.stage2HeightM - 1e-9) return 2;
  if (heightM >= CANOPY_LIMITS.stage1HeightM - 1e-9) return 1;
  return 0;
}

function computeProtectiveCanopyCheck(values: CalcValues): CalcOutcome {
  const height = values.height as number;
  const roadDistanceM = values.roadDistanceM as number;
  const canopyWidthM = values.canopyWidthM as number;
  const canopyAngleDeg = values.canopyAngleDeg as number;

  const angle = elevationAngleDeg(height, roadDistanceM);
  const triggered = canopyRequired(height, roadDistanceM);
  const stages = requiredStages(height, triggered);
  const widthOk = canopyWidthM >= CANOPY_LIMITS.minWidthM - 1e-9;
  const angleOk = canopyAngleDeg >= CANOPY_LIMITS.minAngleDeg - 1e-9;

  const items: CalcCheckItem[] = [
    {
      label: "ふ角（境界点から見た仰角）",
      value: `${formatNumber(angle, 1)}°（水平距離${formatNumber(roadDistanceM, 1)}m）`,
      tone: triggered ? "warning" : "safe",
      note: "ふ角75度超 又は 水平距離5m以内で該当（要綱28条本文）",
    },
    {
      label: "設置要否（要綱28条本文）",
      value: triggered ? "該当（防護措置が必要）" : "非該当",
      tone: triggered ? "warning" : "safe",
    },
  ];

  if (triggered) {
    items.push({
      label: "必要段数（要綱28条1号）",
      value: stages === 0 ? "高さ10m未満のため段数の定めなし（27条3項の網等養生で対応）" : `${stages}段以上`,
      tone: stages > 0 ? "warning" : "safe",
      note: "高さ10m以上→1段以上・20m以上→2段以上",
    });
    items.push({
      label: "突出し幅（要綱28条4号）",
      value: `${formatNumber(canopyWidthM, 2)}m（最小 ${CANOPY_LIMITS.minWidthM}m）`,
      tone: widthOk ? "safe" : "danger",
    });
    items.push({
      label: "水平面となす角度（要綱28条4号）",
      value: `${formatNumber(canopyAngleDeg, 1)}°（最小 ${CANOPY_LIMITS.minAngleDeg}°）`,
      tone: angleOk ? "safe" : "danger",
    });
  }

  const compliant = triggered && stages > 0 && widthOk && angleOk;
  const nonCompliant = triggered && stages > 0 && (!widthOk || !angleOk);

  const warnings: string[] = [];
  if (!triggered) {
    warnings.push(
      "入力条件では要綱28条本文の設置トリガー（ふ角75度超又は水平距離5m以内）に該当しないため、防護棚の設置は要綱上必須ではありません。ただし、隣地・通路の状況が変わる場合は再判定してください。",
    );
  } else if (stages === 0) {
    warnings.push(
      "設置トリガーには該当しますが、高さが10m未満のため要綱28条1号の段数の定めはありません。この場合も本章第27条3項に基づき、鉄網・帆布等による落下物養生が必要です。",
    );
  } else if (nonCompliant) {
    warnings.push("突出し幅・角度のいずれかが要綱28条4号の基準（2m以上・20度以上）を満たしていません。");
  }
  if (triggered && stages > 0) {
    warnings.push(
      "最下段の防護棚は、建築工事を行う部分の下10m以内に設置してください（要綱28条2号。歩道防護構台がある場合は省略可）。",
    );
    warnings.push(
      "防護棚はすき間がなく、風圧・振動・衝撃・雪荷重等で脱落しないよう十分な耐力・厚さで骨組に堅固に取り付けてください（要綱28条3号・4号）。この現地確認は本計算の範囲外です。",
    );
  }
  warnings.push(
    "自治体条例・発注者の特記仕様で要綱より厳しい基準（上乗せ）が定められている場合があります。必ず現地の条例・特記を確認してください。",
  );
  warnings.push(
    "防護棚を道路上空に設ける場合は、道路管理者及び所轄警察署長の許可が必要です（要綱28条2項）。",
  );
  warnings.push(
    "落下物・飛来物による危険防止の基本措置（安衛則537条・538条）も併せて確認してください。",
  );

  const tone = !triggered || compliant ? "safe" : stages === 0 ? "warning" : "danger";
  const headline = !triggered ? "設置基準 非該当" : compliant ? "基準適合" : stages === 0 ? "段数の定めなし（要注意）" : "基準不適合";

  return {
    tone,
    headline,
    value: triggered ? String(stages) : "—",
    unit: triggered ? "段以上" : "",
    summary: !triggered
      ? `ふ角${formatNumber(angle, 1)}°・水平距離${formatNumber(roadDistanceM, 1)}mは要綱28条本文のトリガーに該当しないため、防護棚の設置は必須ではありません。`
      : compliant
        ? `高さ${formatNumber(height, 1)}mでは防護棚${stages}段以上が必要で、計画中の突出し幅${formatNumber(canopyWidthM, 2)}m・角度${formatNumber(canopyAngleDeg, 1)}°は要綱28条4号の基準を満たしています。`
        : stages === 0
          ? `設置トリガーに該当しますが高さ10m未満のため要綱28条1号の段数の定めはありません。27条3項の養生措置を確認してください。`
          : `突出し幅・角度が要綱28条4号の基準（2m以上・20度以上）を満たしていません。`,
    items,
    steps: [
      `ふ角 = atan(高さ${formatNumber(height, 1)}m ÷ 水平距離${formatNumber(roadDistanceM, 1)}m) = ${formatNumber(angle, 1)}°`,
      `設置要否 = ふ角>75° 又は 水平距離≤5m → ${triggered ? "該当" : "非該当"}（要綱28条本文）`,
      triggered
        ? `必要段数 = 高さ${formatNumber(height, 1)}m → ${stages === 0 ? "段数の定めなし" : `${stages}段以上`}（要綱28条1号）`
        : `非該当のため段数判定なし`,
      triggered && stages > 0
        ? `突出し幅${formatNumber(canopyWidthM, 2)}m${widthOk ? "≥" : "<"}2m・角度${formatNumber(canopyAngleDeg, 1)}°${angleOk ? "≥" : "<"}20° → ${widthOk && angleOk ? "基準適合" : "基準不適合"}（要綱28条4号）`
        : "",
    ].filter(Boolean),
    warnings,
  };
}

export const protectiveCanopyCheckCalculator: ConstructionCalculator = {
  slug: "protective-canopy-check",
  title: "防護棚（朝顔）の設置基準チェック",
  shortTitle: "防護棚（朝顔）チェック",
  summary:
    "建築工事を行う部分の高さと前面道路・隣地までの水平距離から、建設工事公衆災害防止対策要綱（建築工事等編）第28条の防護棚（朝顔）の設置要否・必要段数・突出し幅・角度の基準適合をチェックします。",
  fields: [
    {
      kind: "number",
      id: "height",
      label: "建築工事を行う部分の高さ（地盤面から）",
      unit: "m",
      min: 1,
      max: 200,
      step: 0.5,
      defaultValue: 15,
    },
    {
      kind: "number",
      id: "roadDistanceM",
      label: "前面道路・隣地境界までの水平距離",
      unit: "m",
      min: 0.5,
      max: 50,
      step: 0.5,
      defaultValue: 3,
    },
    {
      kind: "number",
      id: "canopyWidthM",
      label: "防護棚の計画突出し幅",
      unit: "m",
      min: 0,
      max: 10,
      step: 0.1,
      defaultValue: 2.5,
    },
    {
      kind: "number",
      id: "canopyAngleDeg",
      label: "防護棚の計画角度（水平面からの傾き）",
      unit: "°",
      min: 0,
      max: 60,
      step: 1,
      defaultValue: 20,
    },
  ],
  basis: [
    {
      label: "建設工事公衆災害防止対策要綱（建築工事等編）第28条（防護棚）",
      description:
        "ふ角75度超又は水平距離5m以内に隣家・一般交通の場所がある場合の防護棚設置義務、高さ10m/20mによる段数（1段/2段以上）、最下段位置（10m以内）、突出し幅2m以上・角度20度以上を定めています（国土交通省、令和元年9月改訂版で確認）。",
    },
    {
      label: "労働安全衛生規則 第537条（物体の落下による危険の防止）",
      description: "作業のため物体が落下し労働者に危険を及ぼすおそれのあるときの防止措置を定めています。",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000032#Mp-At_537",
    },
    {
      label: "労働安全衛生規則 第538条（物体の飛来による危険の防止）",
      description: "作業のため物体が飛来し労働者に危険を及ぼすおそれのあるときの防止措置を定めています。",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000032#Mp-At_538",
    },
  ],
  cautions: [
    "本チェックは要綱第28条の設置トリガー・段数・突出し幅・角度の基準のみを判定します。すき間がないこと・十分な耐力等（3号）、最下段の実際の設置位置（2号）は現地で別途確認してください。",
    "自治体条例・発注者の特記仕様で要綱より厳しい基準が定められている場合があります。必ず現地の上乗せ基準を確認してください。",
    "本機は防護棚（朝顔）専用です。電線防護管等の「吊り防護」を意図する場合は対象外です。",
  ],
  examples: [
    { label: "高さ25m・隣地3m・計画2.5m/20°（2段以上・適合）", values: { height: 25, roadDistanceM: 3, canopyWidthM: 2.5, canopyAngleDeg: 20 } },
    { label: "高さ8m・隣地2m（トリガー該当だが段数の定めなし）", values: { height: 8, roadDistanceM: 2, canopyWidthM: 2, canopyAngleDeg: 20 } },
    { label: "高さ15m・隣地20m（非該当）", values: { height: 15, roadDistanceM: 20, canopyWidthM: 2, canopyAngleDeg: 20 } },
  ],
  keywords: [
    "防護棚",
    "朝顔",
    "落下物養生",
    "公衆災害防止",
    "要綱",
    "足場 張り出し",
    "吊り防護",
    "歩道防護構台",
  ],
  compute: computeProtectiveCanopyCheck,
};
