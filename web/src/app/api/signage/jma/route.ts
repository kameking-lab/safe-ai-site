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
export const revalidate = 300;

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
