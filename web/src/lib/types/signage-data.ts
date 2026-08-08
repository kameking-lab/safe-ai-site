import type { JmaMapLevel } from "@/lib/jma/parse-jma-warning";
import type { SignageHourlyPoint } from "@/lib/types/signage-weather";
import type { LaborRssItem } from "@/lib/signage/parse-labor-rss";

export type SignageDataApiResponse = {
  fetchedAt: string;
  /** upstream障害・last-known-good利用中のデータ源。空配列のみ完全live。 */
  degradedSources: Array<"jma" | "labor-rss" | "open-meteo">;
  /** JMA警報データそのものの取得時刻。応答生成時刻とは区別する。 */
  jmaSourceFetchedAt: string | null;
  /** 選択地域の警報取得状態。全体degradedとは独立して判定する。 */
  jmaSelectedState: "live" | "degraded" | "unavailable";
  /** 現在の取得元を地域単位で確認できた都道府県数。 */
  jmaVerifiedPrefectureCount: number;
  /** Open-Meteo取得完了時刻。予報対象時刻とは区別して表示する。 */
  openMeteoFetchedAt: string | null;
  openMeteoForecastFrom: string | null;
  openMeteoForecastThrough: string | null;
  openMeteoTimezone: "Asia/Tokyo" | null;
  /** iso_3166_2 → 地域単位でlive確認できた気象庁注警報レベル */
  prefectureLevels: Record<string, JmaMapLevel>;
  laborTrend: LaborRssItem[];
  hourly: SignageHourlyPoint[];
  jmaHeadline: string | null;
  jmaReportTime: string | null;
  selectedWarnings: { code: string; status: string }[];
  locationLabel: string;
};
