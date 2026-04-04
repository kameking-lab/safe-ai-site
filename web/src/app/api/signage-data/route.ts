import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getSignageLocationById } from "@/data/signage-locations";
import { jmaWarningJsonCodesForIso2, jmaWarningJsonUrl } from "@/lib/jma/jma-warning-codes";
import {
  headlineFromPayload,
  maxLevelFromWarningPayload,
  mergeJmaLevels,
  warningsForCityCode,
  type JmaMapLevel,
  type JmaWarningPayload,
} from "@/lib/jma/parse-jma-warning";
import { fetchLaborTrendItems } from "@/lib/signage/parse-labor-rss";
import type { SignageDataApiResponse } from "@/lib/types/signage-data";
import { fetchSignageHourlySeries } from "@/lib/weather/open-meteo-hourly";

export const maxDuration = 60;

function iso3166List(): string[] {
  const out: string[] = [];
  for (let i = 1; i <= 47; i += 1) {
    out.push(`JP-${String(i).padStart(2, "0")}`);
  }
  return out;
}

async function fetchJson(url: string): Promise<JmaWarningPayload | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return (await res.json()) as JmaWarningPayload;
  } catch {
    return null;
  }
}

const getPrefectureLevelsCached = unstable_cache(
  async (): Promise<Record<string, JmaMapLevel>> => {
    const isos = iso3166List();
    const levels: Record<string, JmaMapLevel> = {};
    await Promise.all(
      isos.map(async (iso) => {
        const codes = jmaWarningJsonCodesForIso2(iso);
        const payloads = (await Promise.all(codes.map((c) => fetchJson(jmaWarningJsonUrl(c))))).filter(
          (p): p is JmaWarningPayload => p !== null
        );
        if (payloads.length === 0) {
          levels[iso] = "none";
          return;
        }
        levels[iso] = mergeJmaLevels(payloads.map(maxLevelFromWarningPayload));
      })
    );
    return levels;
  },
  ["signage-jma-prefecture-levels-v3"],
  { revalidate: 3600 }
);

export async function GET(request: NextRequest) {
  const locationId = request.nextUrl.searchParams.get("locationId") ?? "tokyo-shinjuku";
  const loc = getSignageLocationById(locationId) ?? getSignageLocationById("tokyo-shinjuku")!;

  try {
    const [prefectureLevels, laborTrend, hourly] = await Promise.all([
      getPrefectureLevelsCached(),
      fetchLaborTrendItems(10),
      fetchSignageHourlySeries(loc.latitude, loc.longitude, 48),
    ]);

    const prefCodes = jmaWarningJsonCodesForIso2(loc.prefectureIso);
    const prefPayloads = (
      await Promise.all(prefCodes.map((c) => fetchJson(jmaWarningJsonUrl(c))))
    ).filter((p): p is JmaWarningPayload => p !== null);

    let jmaHeadline: string | null = null;
    let jmaReportTime: string | null = null;
    for (const p of prefPayloads) {
      const h = headlineFromPayload(p);
      if (h) jmaHeadline = h;
      if (p.reportDatetime) jmaReportTime = p.reportDatetime;
    }

    const selectedWarnings: { code: string; status: string }[] = [];
    if (loc.jmaCityCode) {
      for (const p of prefPayloads) {
        for (const w of warningsForCityCode(p, loc.jmaCityCode)) {
          selectedWarnings.push({ code: w.code, status: w.status });
        }
      }
    }

    const body: SignageDataApiResponse = {
      fetchedAt: new Date().toISOString(),
      prefectureLevels,
      laborTrend,
      hourly,
      jmaHeadline,
      jmaReportTime,
      selectedWarnings,
      locationLabel: loc.label,
    };

    return NextResponse.json(body, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        "x-signage-data": "jma-openmeteo-rss",
      },
    });
  } catch {
    return NextResponse.json(
      { error: { code: "UNAVAILABLE", message: "サイネージデータの取得に失敗しました。" } },
      { status: 503 }
    );
  }
}
