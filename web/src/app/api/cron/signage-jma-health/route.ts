/**
 * サイネージ JMA データの鮮度ウォッチ（Vercel Cron 想定）。
 *
 * 背景: docs/fable-diagnosis-2026-07-02/01-signage.md T2。旧実装は
 * /api/signage/jma がビルド時に焼き込まれ、デプロイが止まると気づかず
 * 18日間データが凍結した。ランタイム取得化（T1）で常時対応の依存は無くしたが、
 * 気象庁側の広範な障害が REVALIDATE_SECONDS を超えて続いた場合の検知として、
 * データ齢が24hを超えたら非2xxを返し Vercel Cron の失敗検知に乗せる。
 *
 * 新規の通知チャネル（メール/Slack等）は導入しない — Deploy Hook 同様、
 * 環境変数を伴う意思決定はオーナー確認事項（診断書 付記）。
 */

import { NextResponse } from "next/server";
import { getJmaEarthquakesRuntime, getJmaWarningsRuntime, getJmaWeatherRuntime } from "@/lib/jma/fetch-jma-runtime";
import { ageHours, isDataStale } from "@/lib/jma/data-freshness";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const STALE_THRESHOLD_HOURS = 24;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const [warnings, weather, earthquakes] = await Promise.all([
    getJmaWarningsRuntime(),
    getJmaWeatherRuntime(),
    getJmaEarthquakesRuntime(),
  ]);

  const sources = [
    { name: "warnings", fetchedAt: warnings.fetchedAt },
    { name: "weather", fetchedAt: weather.fetchedAt },
    { name: "earthquakes", fetchedAt: earthquakes.fetchedAt },
  ];

  const report = sources.map((s) => ({
    ...s,
    ageHours: ageHours(s.fetchedAt, now),
    stale: isDataStale(s.fetchedAt, STALE_THRESHOLD_HOURS, now),
  }));

  const staleSources = report.filter((r) => r.stale);
  if (staleSources.length > 0) {
    console.error(
      `[signage-jma-health] stale data detected (>${STALE_THRESHOLD_HOURS}h):`,
      staleSources.map((s) => `${s.name}=${s.fetchedAt}`).join(", ")
    );
  }

  return NextResponse.json(
    { checkedAt: now.toISOString(), thresholdHours: STALE_THRESHOLD_HOURS, sources: report },
    {
      status: staleSources.length > 0 ? 503 : 200,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
