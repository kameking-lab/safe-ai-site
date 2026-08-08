import { NextRequest, NextResponse } from "next/server";
import { getSignageLocationById } from "@/data/signage-locations";
import { getJmaWarningsRuntime } from "@/lib/jma/fetch-jma-runtime";
import { buildSignageJmaSnapshot } from "@/lib/signage/signage-jma-snapshot";
import { fetchLaborTrendItems } from "@/lib/signage/parse-labor-rss";
import type { SignageDataApiResponse } from "@/lib/types/signage-data";
import { fetchSignageHourlySeries } from "@/lib/weather/open-meteo-hourly";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const locationId = request.nextUrl.searchParams.get("locationId") ?? "tokyo-shinjuku";
  const loc = getSignageLocationById(locationId) ?? getSignageLocationById("tokyo-shinjuku")!;

  // 各依存を独立に await し、片方が失敗してももう片方を表示できるようにする。
  // サイネージは現場の常時表示前提のため 5xx を絶対に返さない。
  const [jmaResult, laborTrendResult, hourlyResult] = await Promise.allSettled([
    getJmaWarningsRuntime(),
    fetchLaborTrendItems(10),
    fetchSignageHourlySeries(loc.latitude, loc.longitude, 48),
  ]);

  const laborTrend = laborTrendResult.status === "fulfilled" ? laborTrendResult.value : [];
  const hourly = hourlyResult.status === "fulfilled" ? hourlyResult.value : [];
  const openMeteoFetchedAt =
    hourlyResult.status === "fulfilled" && hourly.length > 0 ? new Date().toISOString() : null;

  const failures: Array<"jma" | "labor-rss" | "open-meteo"> = [];
  const jma = jmaResult.status === "fulfilled"
    ? buildSignageJmaSnapshot(jmaResult.value, loc.prefectureIso, loc.jmaCityCode)
    : null;
  if (!jma || jma.degraded) failures.push("jma");
  if (laborTrendResult.status === "rejected") failures.push("labor-rss");
  if (hourlyResult.status === "rejected" || hourly.length === 0) failures.push("open-meteo");

  if (failures.length > 0) {
    console.warn("[signage-data] degraded — failed deps:", failures.join(","));
  }

  const body: SignageDataApiResponse = {
    fetchedAt: new Date().toISOString(),
    degradedSources: failures,
    jmaSourceFetchedAt: jma?.sourceFetchedAt ?? null,
    jmaSelectedState: jma?.selectedWarningState ?? "unavailable",
    jmaVerifiedPrefectureCount: jma?.verifiedPrefectureCount ?? 0,
    openMeteoFetchedAt,
    openMeteoForecastFrom: hourly[0]?.time ?? null,
    openMeteoForecastThrough: hourly.at(-1)?.time ?? null,
    openMeteoTimezone: openMeteoFetchedAt ? "Asia/Tokyo" : null,
    prefectureLevels: jma?.prefectureLevels ?? {},
    laborTrend,
    hourly,
    jmaHeadline: jma?.jmaHeadline ?? null,
    jmaReportTime: jma?.jmaReportTime ?? null,
    selectedWarnings: jma?.selectedWarnings ?? [],
    locationLabel: loc.label,
  };

  return NextResponse.json(body, {
    status: 200,
    headers: {
      // JMA鮮度上限をCDN/SWRが越えないよう、集約レスポンス自体は保存しない。
      "Cache-Control": "no-store",
      "x-signage-data": failures.length > 0 ? `degraded:${failures.join(",")}` : "jma-openmeteo-rss",
    },
  });
}
