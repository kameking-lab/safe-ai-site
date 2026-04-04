import type { JmaMapLevel } from "@/lib/jma/parse-jma-warning";
import type { SignageHourlyPoint } from "@/lib/types/signage-weather";
import type { LaborRssItem } from "@/lib/signage/parse-labor-rss";

export type SignageDataApiResponse = {
  fetchedAt: string;
  /** iso_3166_2 → 気象庁注警報に基づくレベル */
  prefectureLevels: Record<string, JmaMapLevel>;
  laborTrend: LaborRssItem[];
  hourly: SignageHourlyPoint[];
  jmaHeadline: string | null;
  jmaReportTime: string | null;
  selectedWarnings: { code: string; status: string }[];
  locationLabel: string;
};
