import type { PageAnalyticsResponse, SearchConsoleResponse, StatsResponse } from "./types";

/**
 * 利用統計ダッシュボードの「実データ源が接続済みか」を判定する純関数。
 *
 * 捏造防止の中核ロジック: 各データ源が live のときだけ、その源から実測した指標を表示する。
 * いずれも live でない（= anyLive=false）ときは、モック（サンプル）数値を一切表示せず
 * 正直な空状態を出す、という分岐の判断材料になる。
 *
 * - GA4:  source === "ga4"  のとき live（実測のサマリ/ページ別/流入元）
 * - GSC:  source === "gsc"  のとき live（実測の検索パフォーマンス）
 * - Page Analytics: source === "ga4" のとき live
 *
 * 注意: GA4 が live でも前期間比(deltas)・機能別利用・離脱フロー・コンバージョン・
 * チャット指標はモック値で埋まるため、UI 側で別途非表示にしている（本関数の対象外）。
 */
export type StatsLiveness = {
  ga4Live: boolean;
  gscLive: boolean;
  paLive: boolean;
  /** いずれかの実データ源が接続済みなら true。false ならサンプルを出さず空状態にする。 */
  anyLive: boolean;
};

export function computeStatsLiveness(
  data: Pick<StatsResponse, "source"> | null | undefined,
  gsc: Pick<SearchConsoleResponse, "source"> | null | undefined,
  pa: Pick<PageAnalyticsResponse, "source"> | null | undefined,
): StatsLiveness {
  const ga4Live = data?.source === "ga4";
  const gscLive = gsc?.source === "gsc";
  const paLive = pa?.source === "ga4";
  return { ga4Live, gscLive, paLive, anyLive: Boolean(ga4Live || gscLive || paLive) };
}
