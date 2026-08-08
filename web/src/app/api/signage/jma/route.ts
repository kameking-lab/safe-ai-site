import { NextResponse } from "next/server";
import { getJmaEarthquakesRuntime, getJmaWarningsRuntime, getJmaWeatherRuntime } from "@/lib/jma/fetch-jma-runtime";
import { assessJmaDataTrust } from "@/lib/jma/jma-data-trust";

// 気象庁 bosai JSON をリクエスト時に直接 fetch（30分キャッシュ）。旧実装は
// @/data/jma/*.json を静的 import(force-static) していたため、Vercel が
// 再デプロイされない限り fetchedAt が更新されず本番で18日凍結した
// (docs/fable-diagnosis-2026-07-02/01-signage.md T1)。デプロイ有無に依存しない
// よう、この route はダイナミック実行のまま getJma*Runtime 内の unstable_cache
// に鮮度を委譲する（/api/signage-data と同じ構え）。
export const maxDuration = 60;

const JMA_SOURCE = "気象庁 (Japan Meteorological Agency)";
const JMA_SOURCE_URL = "https://www.jma.go.jp/bosai/";
const JMA_LICENSE = "気象庁ホームページ コンテンツ利用ルール（出典明記）";

export async function GET() {
  const [warnings, weather, earthquakes] = await Promise.all([
    getJmaWarningsRuntime(),
    getJmaWeatherRuntime(),
    getJmaEarthquakesRuntime(),
  ]);

  const now = new Date();
  const assessments = [
    assessJmaDataTrust({ fetchedAt: warnings.fetchedAt, quality: warnings.quality, actualCoverage: Object.keys(warnings.byIso).length, expectedCoverage: 47, now }),
    assessJmaDataTrust({ fetchedAt: weather.fetchedAt, quality: weather.quality, actualCoverage: Object.keys(weather.byIso).length, expectedCoverage: 7, now }),
    assessJmaDataTrust({ fetchedAt: earthquakes.fetchedAt, quality: earthquakes.quality, now }),
  ];
  const timestamps = [warnings.fetchedAt, weather.fetchedAt, earthquakes.fetchedAt]
    .map((value) => Date.parse(value))
    .filter(Number.isFinite);
  // 一部が欠落・不正ならnull。全件有効でも最古時刻を採用し、新鮮に見せかけない。
  const fetchedAt = timestamps.length === 3
    ? new Date(Math.min(...timestamps)).toISOString()
    : null;
  const degraded = assessments.some((assessment) => assessment.status !== "live");

  const body = {
    fetchedAt,
    source: JMA_SOURCE,
    sourceUrl: JMA_SOURCE_URL,
    license: JMA_LICENSE,
    warnings,
    weather,
    earthquakes,
    trust: {
      warnings: assessments[0],
      weather: assessments[1],
      earthquakes: assessments[2],
    },
    degraded,
  };

  return NextResponse.json(body, {
    status: 200,
    headers: {
      // upstream の10分キャッシュだけを使う。CDN SWRで15分上限を越えさせない。
      "Cache-Control": "no-store",
      "x-data-source": degraded ? "jma-runtime-degraded" : "jma-runtime",
    },
  });
}
