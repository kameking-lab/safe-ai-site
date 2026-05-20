import { NextResponse } from "next/server";
import warnings from "@/data/jma/warnings.json";
import weather from "@/data/jma/weather.json";
import earthquakes from "@/data/jma/earthquakes.json";
import indexMeta from "@/data/jma/index.json";
import type {
  JmaEarthquakesFile,
  JmaIndexFile,
  JmaWarningsFile,
  JmaWeatherFile,
} from "@/lib/jma/jma-data";

export const dynamic = "force-static";
// JMA データはバンドル import (build-time) で取り込んでいるため、再生成しても
// 結果は同じ。GH Actions の JMA cron は [skip ci] コミットで Vercel deploy
// skip されるため、データ反映は実 deploy 時のみ。revalidate=3600 (1h) で
// 他 signage API (signage-data / weather-forecast) と運用統一しつつ、無駄な
// 再生成を 12 倍削減する。
export const revalidate = 3600;

export async function GET() {
  const body = {
    fetchedAt: (indexMeta as JmaIndexFile).fetchedAt,
    source: (indexMeta as JmaIndexFile).source,
    sourceUrl: (indexMeta as JmaIndexFile).sourceUrl,
    license: (indexMeta as JmaIndexFile).license,
    warnings: warnings as JmaWarningsFile,
    weather: weather as JmaWeatherFile,
    earthquakes: earthquakes as JmaEarthquakesFile,
  };

  return NextResponse.json(body, {
    status: 200,
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
      "x-data-source": "jma-batch",
    },
  });
}
