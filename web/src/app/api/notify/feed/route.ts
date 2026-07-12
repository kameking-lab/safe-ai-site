import { NextRequest, NextResponse } from "next/server";
import { PREFECTURE_CENTROIDS } from "@/data/jma/prefecture-centroids";
import { getJmaWarningsRuntime } from "@/lib/jma/fetch-jma-runtime";
import { buildNewsHubItems } from "@/lib/news-hub";
import { buildWeatherNotifications } from "@/lib/notifications/weather-notifications";
import type { NotificationFeedResponse, SiteNotification } from "@/lib/notifications/feed-types";

/**
 * 通知センター（ベル）・サイネージが表示中ポーリングする集約フィード。
 *
 * 集約源:
 *  1. 気象警報（気象庁 bosai JSON・runtime 30分キャッシュ）— ?pref=JP-13 の都道府県分
 *  2. 新着ハブ buildNewsHubItems()（法改正・通達・重大災害事例・事故速報・報道）
 *
 * 鍵なし通知ライトの方針: サーバーは購読情報を一切持たない（既読・設定は端末内）。
 * 将来の本Push（VAPID鍵発行後）は、このフィードの SiteNotification をそのまま
 * push payload に流用できる（docs/vapid-push-setup-guide-2026-07-11.md）。
 */
export const maxDuration = 60;

const PREF_NAME = new Map(PREFECTURE_CENTROIDS.map((p) => [p.iso, p.name]));
const MAX_NEWS_ITEMS = 30;

function isValidIso(pref: string | null): pref is string {
  return !!pref && PREF_NAME.has(pref);
}

export async function GET(req: NextRequest) {
  const prefParam = req.nextUrl.searchParams.get("pref");
  const prefectureIso = isValidIso(prefParam) ? prefParam : null;

  const items: SiteNotification[] = [];

  // 1) 気象警報（対象都道府県のみ。注意報以上を通知にする）。判定は閉端末Pushと共通。
  if (prefectureIso) {
    try {
      const warnings = await getJmaWarningsRuntime();
      items.push(...buildWeatherNotifications(prefectureIso, warnings));
    } catch {
      // 気象データ取得失敗時は気象分を欠いたフィードを返す（新着分は生きる）
    }
  }

  // 2) 新着ハブ（法改正・通達・重大災害・事故速報・報道）
  const news = buildNewsHubItems({ lawLimit: 20 }).slice(0, MAX_NEWS_ITEMS);
  for (const n of news) {
    items.push({
      id: `news-${n.id}`,
      category: n.category,
      title: n.title,
      body: n.summary || undefined,
      date: n.date,
      url: n.url,
      // CR2-H2: item固有の internalHref をそのまま通す（報道は internalHref 無し＝
      // 外部の元記事URLへ着地）。ベル側で internalHref ?? url ?? /whats-new を解決する。
      internalHref: n.internalHref,
      severity: n.category === "serious-case" ? "advisory" : "info",
    });
  }

  const body: NotificationFeedResponse = {
    generatedAt: new Date().toISOString(),
    prefectureIso,
    items,
  };

  return NextResponse.json(body, {
    status: 200,
    headers: {
      // 気象は runtime 側で30分キャッシュ・新着はビルド時データのため、CDN 5分で十分
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
    },
  });
}
