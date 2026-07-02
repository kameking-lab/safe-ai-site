import { NextResponse } from "next/server";
import { getJmaEarthquakesRuntime, getJmaWarningsRuntime, getJmaWeatherRuntime } from "@/lib/jma/fetch-jma-runtime";

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

  const fetchedAt = [warnings.fetchedAt, weather.fetchedAt, earthquakes.fetchedAt].sort().at(-1) ?? new Date().toISOString();

  const body = {
    fetchedAt,
    source: JMA_SOURCE,
    sourceUrl: JMA_SOURCE_URL,
    license: JMA_LICENSE,
    warnings,
    weather,
    earthquakes,
  };

  return NextResponse.json(body, {
    status: 200,
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
      "x-data-source": "jma-runtime",
    },
  });
}
