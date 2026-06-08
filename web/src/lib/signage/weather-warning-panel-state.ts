/**
 * サイネージ「本日の気象警報」パネルの表示状態を決める純関数（軸2 / 無人運用の安全性）。
 *
 * 背景: 取得失敗時(bundleStatus==="error")は bundle=null になるため、ヘッドラインの有無だけで
 * 分岐すると「現在、発表中の警報はありません」と空表示してしまい、『警報が無い』のか
 * 『取得に失敗して確認できない』のか区別できない。無人サイネージでは後者を前者と誤認すると
 * 嵐の朝に誤った「全員OK」を出しかねないため、取得失敗・取得中・警報あり・警報なしを明確に分ける。
 */

export type WeatherWarningPanelKind = "loading" | "error" | "headline" | "none";

export interface WeatherWarningPanelState {
  kind: WeatherWarningPanelKind;
  /** kind==="headline" のときの気象庁ヘッドライン本文。 */
  headline: string | null;
}

export type WeatherBundleStatus = "idle" | "loading" | "success" | "error";

/**
 * 取得ステータスとヘッドラインから、警報パネルが取るべき状態を決める。
 *
 * - error: 取得に失敗（警報の有無を確認できない＝誤った安心を与えない）
 * - loading: 初回取得中（idle/loading）
 * - headline: 取得成功＋ヘッドラインあり（＝発表中の警報あり）
 * - none: 取得成功かつヘッドライン無し（＝本当に発表中の警報なし）
 */
export function resolveWeatherWarningPanelState(
  status: WeatherBundleStatus,
  jmaHeadline: string | null | undefined
): WeatherWarningPanelState {
  if (status === "error") return { kind: "error", headline: null };
  if (status === "idle" || status === "loading") return { kind: "loading", headline: null };
  const headline = typeof jmaHeadline === "string" ? jmaHeadline.trim() : "";
  if (headline.length > 0) return { kind: "headline", headline };
  return { kind: "none", headline: null };
}
