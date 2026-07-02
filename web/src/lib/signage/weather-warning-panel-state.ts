/**
 * サイネージ「本日の気象警報」パネルの表示状態を決める純関数（軸2 / 無人運用の安全性）。
 *
 * 背景: 取得失敗時(bundleStatus==="error")は bundle=null になるため、ヘッドラインの有無だけで
 * 分岐すると「現在、発表中の警報はありません」と空表示してしまい、『警報が無い』のか
 * 『取得に失敗して確認できない』のか区別できない。無人サイネージでは後者を前者と誤認すると
 * 嵐の朝に誤った「全員OK」を出しかねないため、取得失敗・取得中・警報あり・警報なしを明確に分ける。
 *
 * 判定軸は県単位の headlineText ではなく市区町村コード一致の selectedWarnings（コード区分）を
 * 主軸にする。県ヘッドラインだけを見ると、無関係な離島の注意報で選択地点の警報を誤検知する
 * （例: 東京都headlineが伊豆諸島の注意報でも新宿区のselectedWarningsは空）。
 */

import { maxLevelFromSelectedWarnings, type JmaMapLevel } from "@/lib/jma/parse-jma-warning";

export type WeatherWarningPanelKind = "loading" | "error" | JmaMapLevel;

export interface WeatherWarningPanelState {
  kind: WeatherWarningPanelKind;
  /** kind==="special"|"warning"|"advisory" のときの気象庁ヘッドライン本文（あれば補足として）。 */
  headline: string | null;
}

export type WeatherBundleStatus = "idle" | "loading" | "success" | "error";

/**
 * 取得ステータス・選択地点の市区町村別警報・県ヘッドラインから、警報パネルが取るべき状態を決める。
 *
 * - error: 取得に失敗（警報の有無を確認できない＝誤った安心を与えない）
 * - loading: 初回取得中（idle/loading）
 * - special/warning/advisory: 選択地点(市区町村)の selectedWarnings から算出した最大区分
 * - none: 取得成功かつ選択地点に該当する注警報が無い（＝本当に発表中の警報なし）
 */
export function resolveWeatherWarningPanelState(
  status: WeatherBundleStatus,
  selectedWarnings: ReadonlyArray<{ code: string; status: string }> | null | undefined,
  jmaHeadline: string | null | undefined
): WeatherWarningPanelState {
  if (status === "error") return { kind: "error", headline: null };
  if (status === "idle" || status === "loading") return { kind: "loading", headline: null };

  const level = maxLevelFromSelectedWarnings(selectedWarnings ?? []);
  if (level === "none") return { kind: "none", headline: null };

  const headline = typeof jmaHeadline === "string" ? jmaHeadline.trim() : "";
  return { kind: level, headline: headline.length > 0 ? headline : null };
}
