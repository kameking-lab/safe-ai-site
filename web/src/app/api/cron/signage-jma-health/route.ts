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
import { bearerAuthError, verifyBearerSecret } from "@/lib/server/bearer-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const STALE_THRESHOLD_HOURS = 24;

export async function GET(request: Request) {
  const auth = verifyBearerSecret(request, process.env.CRON_SECRET);
  if (!auth.ok) return bearerAuthError(auth);

  const now = new Date();
  const [warnings, weather, earthquakes] = await Promise.all([
    getJmaWarningsRuntime(),
    getJmaWeatherRuntime(),
    getJmaEarthquakesRuntime(),
  ]);

  const sources = [
    { name: "warnings", fetchedAt: warnings.fetchedAt, quality: warnings.quality },
    { name: "weather", fetchedAt: weather.fetchedAt, quality: weather.quality },
    { name: "earthquakes", fetchedAt: earthquakes.fetchedAt, quality: earthquakes.quality },
  ];

  const report = sources.map((s) => ({
    ...s,
    ageHours: ageHours(s.fetchedAt, now),
    stale: isDataStale(s.fetchedAt, STALE_THRESHOLD_HOURS, now),
    degraded: s.quality?.status !== "live",
  }));

  const unhealthySources = report.filter((r) => r.stale || r.degraded);
  if (unhealthySources.length > 0) {
    console.error(
      "[signage-jma-health] unhealthy data detected",
      unhealthySources.map((s) => ({ name: s.name, stale: s.stale, quality: s.quality?.status ?? "unknown" })),
    );
  }

  return NextResponse.json(
    { checkedAt: now.toISOString(), thresholdHours: STALE_THRESHOLD_HOURS, sources: report },
    {
      status: unhealthySources.length > 0 ? 503 : 200,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
