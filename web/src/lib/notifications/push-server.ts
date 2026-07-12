/**
 * 閉端末 Web Push のサーバー側ヘルパー（VAPID）。
 *
 * 【方針・互換性】
 *  - 送信payloadは通知センターの `SiteNotification`（feed-types.ts）をそのまま
 *    `public/sw.js` の `showNotification(title, {body, tag, data:{url}})` に流せる形にする。
 *  - env（VAPID鍵）や `push_subscriptions` テーブルが未整備の環境では「壊れない」。
 *    設定不備は呼び出し側 API Route が 501/503 の正直な応答を返し、鍵・テーブルが
 *    揃えば追加コードなしで自動的に機能する（Path A: スキーマ変更はオーナー実施）。
 *
 * 必要な環境変数（本番Vercelへ投入済み。手順: docs/vapid-push-setup-guide-2026-07-11.md）:
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY - 公開鍵（クライアントの applicationServerKey と共通）
 *   VAPID_PRIVATE_KEY            - 秘密鍵（サーバー専用・ブラウザへ渡さない）
 *   VAPID_SUBJECT               - 連絡先（mailto:... または https://...）
 */
import webpush from "web-push";
import type { SiteNotification } from "@/lib/notifications/feed-types";

/** `push_subscriptions` の1行（service_role で読み書きするサーバー内部表現）。 */
export type PushSubscriptionRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
  prefecture: string | null;
};

let vapidConfigured: boolean | undefined;

/** VAPID鍵の3点が揃っているか（クライアント公開鍵は別途 NEXT_PUBLIC_ で参照）。 */
export function isWebPushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() &&
      process.env.VAPID_PRIVATE_KEY?.trim() &&
      process.env.VAPID_SUBJECT?.trim()
  );
}

/**
 * web-push に VAPID 詳細を1度だけ設定する。未設定なら false を返す（呼び出し側で 501）。
 */
function ensureVapid(): boolean {
  if (vapidConfigured !== undefined) return vapidConfigured;
  if (!isWebPushConfigured()) {
    vapidConfigured = false;
    return false;
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!.trim(),
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!.trim(),
    process.env.VAPID_PRIVATE_KEY!.trim()
  );
  vapidConfigured = true;
  return true;
}

/**
 * Supabase(PostgREST) のエラーが「テーブル未作成」かを判定する。
 * 鍵発行済みでもオーナーが `push_subscriptions` の DDL を未実行なら購読APIは
 * これを検知して 501（未実装＝準備待ち）を返し、SQL実行後は自動で機能する。
 */
export function isMissingTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  // PostgREST: スキーマキャッシュに無い（PGRST205） / Postgres: relation does not exist（42P01）
  if (error.code === "PGRST205" || error.code === "42P01") return true;
  const msg = error.message ?? "";
  return /schema cache|does not exist|could not find the table/i.test(msg);
}

/** 送信結果。expired=true の endpoint は購読テーブルから掃除する。 */
export type PushSendResult =
  | { ok: true; statusCode: number }
  | { ok: false; expired: boolean; statusCode: number | null; detail: string };

/**
 * 1件の購読へ push を送る。`SiteNotification` を sw.js が解釈できる payload に変換。
 * 404/410 は購読の失効（endpoint破棄）を意味するので expired=true を返す。
 */
export async function sendPushToSubscription(
  row: PushSubscriptionRow,
  notification: SiteNotification
): Promise<PushSendResult> {
  if (!ensureVapid()) {
    return { ok: false, expired: false, statusCode: null, detail: "web_push_not_configured" };
  }
  const payload = JSON.stringify({
    title: notification.title,
    body: notification.body ?? "",
    // sw.js は notificationclick で data.url を読む。内部導線を優先し、無ければ外部URL。
    tag: notification.id,
    data: { url: notification.internalHref ?? notification.url ?? "/notifications" },
  });
  try {
    const res = await webpush.sendNotification(
      { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
      payload,
      { TTL: 3600 }
    );
    return { ok: true, statusCode: res.statusCode };
  } catch (err) {
    const statusCode =
      typeof (err as { statusCode?: unknown }).statusCode === "number"
        ? (err as { statusCode: number }).statusCode
        : null;
    const expired = statusCode === 404 || statusCode === 410;
    const detail = err instanceof Error ? err.message : String(err);
    return { ok: false, expired, statusCode, detail };
  }
}
