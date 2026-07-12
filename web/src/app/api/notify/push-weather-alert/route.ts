/**
 * 閉端末 Web Push の一斉送信エンドポイント（気象警報・第1弾）。
 * Vercel Cron または内部サービスから `Authorization: Bearer $CRON_SECRET` で呼ぶ想定。
 *
 * フロー:
 *  1. push_subscriptions を全件読み込み、prefecture でグルーピング。
 *  2. 気象庁 warnings ランタイム（既存JMA基盤・30分キャッシュ）を1回取得。
 *  3. 各都道府県について「警報級（warning/special）」の SiteNotification を組み立て
 *     （判定は /api/notify/feed と共通の buildWeatherNotifications）。
 *  4. その都道府県の購読へ push 送信。404/410（失効）endpoint は掃除。
 *
 * Resendメール（/api/notify/weather-alert）と並走する二重経路。既読・tag は
 * SiteNotification.id で共通化してあり、ベル/OS通知と表示が二重化しにくい。
 *
 * 【拡張ポイント（第2弾以降・設計のみ）】
 *  - 法改正: buildNewsHubItems() の "law-revision" を severity=warning 相当に判定して
 *    同じ送信ループへ流す。対象は「施行日接近」など別ルールになる想定。
 *  - KY承認: 承認イベント発火時に、対象現場の購読(prefecture一致 or 将来のsiteId)へ
 *    単発 payload を送る（本エンドポイントを payload受け取り型に分岐 or 別ルート）。
 *  どちらも sendPushToSubscription() と push_subscriptions をそのまま再利用できる。
 *
 * 正直な段階応答:
 *  - CRON_SECRET不一致 → 401
 *  - VAPID鍵未設定      → 501 not_configured
 *  - Supabase未設定     → 503 cloud_not_configured
 *  - テーブル未作成     → 501 table_not_ready（DDL実行後は自動で機能）
 */
import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/server";
import { getJmaWarningsRuntime } from "@/lib/jma/fetch-jma-runtime";
import {
  buildWeatherNotifications,
  isAlertLevel,
} from "@/lib/notifications/weather-notifications";
import {
  isMissingTableError,
  isWebPushConfigured,
  sendPushToSubscription,
  type PushSubscriptionRow,
} from "@/lib/notifications/push-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TABLE = "push_subscriptions";
const MAX_SUBSCRIPTIONS = 5000;

export async function POST(req: Request) {
  // 認証（Vercel Cron / 内部サービスのみ）。CRON_SECRET 未設定なら安全側で 401。
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  if (!isWebPushConfigured()) {
    return NextResponse.json(
      { ok: false, reason: "not_configured", message: "VAPID鍵が未設定です。" },
      { status: 501 }
    );
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, reason: "cloud_not_configured" }, { status: 503 });
  }

  // 送信せず対象件数・payloadだけ検算したいときのフラグ（curl実測・cronのドライラン用）
  let dryRun = false;
  try {
    const body = (await req.json()) as { dryRun?: unknown };
    dryRun = body?.dryRun === true;
  } catch {
    /* body 無しは通常送信 */
  }

  const { data, error } = await supabase
    .from(TABLE)
    .select("endpoint, p256dh, auth, prefecture")
    .limit(MAX_SUBSCRIPTIONS);
  if (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json(
        { ok: false, reason: "table_not_ready", message: "購読テーブルが未作成です。" },
        { status: 501 }
      );
    }
    return NextResponse.json({ ok: false, reason: "db_error", detail: error.message }, { status: 502 });
  }

  const rows = (Array.isArray(data) ? data : []) as PushSubscriptionRow[];
  if (rows.length === 0) {
    return NextResponse.json({ ok: true, subscriptions: 0, sent: 0, alerts: 0, dryRun });
  }

  // 都道府県ごとに購読をまとめる（prefecture 未設定の購読は気象警報の対象外）
  const byPref = new Map<string, PushSubscriptionRow[]>();
  for (const row of rows) {
    if (!row.prefecture) continue;
    const list = byPref.get(row.prefecture) ?? [];
    list.push(row);
    byPref.set(row.prefecture, list);
  }

  const warnings = await getJmaWarningsRuntime();

  let sent = 0;
  let failed = 0;
  let alerts = 0;
  const expiredEndpoints: string[] = [];
  const perPref: Array<{ prefecture: string; subscribers: number; alerts: number }> = [];

  for (const [prefecture, subs] of byPref) {
    // 「警報級のみ」= feed と同じ判定を通した上で severity で絞る
    const notifications = buildWeatherNotifications(prefecture, warnings).filter(isAlertLevel);
    perPref.push({ prefecture, subscribers: subs.length, alerts: notifications.length });
    if (notifications.length === 0) continue;
    alerts += notifications.length;

    if (dryRun) continue;

    for (const n of notifications) {
      for (const sub of subs) {
        const result = await sendPushToSubscription(sub, n);
        if (result.ok) {
          sent += 1;
        } else {
          failed += 1;
          if (result.expired) expiredEndpoints.push(sub.endpoint);
        }
      }
    }
  }

  // 失効した購読（404/410）を掃除。失敗しても送信結果は成功として返す。
  let cleaned = 0;
  if (expiredEndpoints.length > 0) {
    const unique = [...new Set(expiredEndpoints)];
    const { error: delErr } = await supabase.from(TABLE).delete().in("endpoint", unique);
    if (!delErr) cleaned = unique.length;
    else console.warn("[push-weather-alert] cleanup failed:", delErr.message);
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    subscriptions: rows.length,
    prefecturesWithSubscribers: byPref.size,
    alerts,
    sent,
    failed,
    cleaned,
    perPref,
  });
}
