import type { SiteNotification } from "@/lib/notifications/feed-types";
import { loadNotificationSettings, loadReadIds } from "@/lib/notifications/notification-store";

/**
 * 「開いている画面」でのOS通知（Notification API）。
 *
 * 鍵なし通知ライトの制約を正直に: これはページが開いているタブからしか発火できない
 * （サイネージ・常時表示ダッシュボード向け）。閉じている端末に届く Web Push は
 * VAPID 鍵の発行後（docs/vapid-push-setup-guide-2026-07-11.md・実装は着手禁止のPath A）。
 */

const SHOWN_KEY = "safe-ai:notif-os-shown:v1";
const SHOWN_CAP = 200;

export function osNotifySupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function osNotifyPermission(): NotificationPermission | "unsupported" {
  return osNotifySupported() ? Notification.permission : "unsupported";
}

export async function requestOsNotifyPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!osNotifySupported()) return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

function loadShown(): Set<string> {
  try {
    const raw = window.localStorage.getItem(SHOWN_KEY);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveShown(ids: Set<string>): void {
  const arr = [...ids];
  const capped = arr.length > SHOWN_CAP ? arr.slice(arr.length - SHOWN_CAP) : arr;
  try {
    window.localStorage.setItem(SHOWN_KEY, JSON.stringify(capped));
  } catch {
    /* 容量超過等は通知の重複より安全側（次回また出るだけ） */
  }
}

/** 1件のOS通知を発火（許可済み前提。クリックでサイト内導線へ） */
export function showOsNotification(n: SiteNotification): void {
  if (!osNotifySupported() || Notification.permission !== "granted") return;
  try {
    const notification = new Notification(n.title, {
      body: n.body,
      icon: "/icon-192x192.png",
      tag: n.id, // 同一警報の重複表示をOS側でも抑止
    });
    notification.onclick = () => {
      window.focus();
      if (n.internalHref) window.location.href = n.internalHref;
      notification.close();
    };
  } catch {
    /* 一部ブラウザ（ページコンテキスト非対応）では黙って諦める */
  }
}

/**
 * フィード新着から「警報級・未読・未通知」のものだけOS通知する。
 * 設定OFF・未許可・非対応なら何もしない。通知済みIDは端末内に永続化し
 * リロードで再通知しない。
 */
export function maybeShowOsNotifications(items: SiteNotification[]): void {
  if (!osNotifySupported() || Notification.permission !== "granted") return;
  if (!loadNotificationSettings().osNotify) return;
  const read = loadReadIds();
  const shown = loadShown();
  let dirty = false;
  for (const n of items) {
    if (n.severity !== "warning" && n.severity !== "special") continue;
    if (read.has(n.id) || shown.has(n.id)) continue;
    showOsNotification(n);
    shown.add(n.id);
    dirty = true;
  }
  if (dirty) saveShown(shown);
}
