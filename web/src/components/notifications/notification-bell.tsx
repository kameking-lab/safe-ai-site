"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, ExternalLink, Rss, Settings } from "lucide-react";
import {
  NOTIFICATION_CATEGORY_LABEL,
  type NotificationFeedResponse,
  type SiteNotification,
} from "@/lib/notifications/feed-types";
import {
  loadNotificationSettings,
  loadReadIds,
  markRead,
} from "@/lib/notifications/notification-store";
import { maybeShowOsNotifications } from "@/lib/notifications/os-notify";

/**
 * サイト内通知センター（ベル）。ヘッダー常駐。
 *
 * - 表示中ポーリング（15分間隔・非表示タブは休止）で /api/notify/feed を取得
 * - 未読数バッジ（既読は端末内 localStorage）
 * - 設定でONのとき、警報級の新着は OS 通知（Notification API）も発火
 *   ＝「開いている画面」にのみ届く（鍵なし通知ライトの制約。閉じている端末への
 *   Push は VAPID 鍵発行後に対応＝docs/vapid-push-setup-guide-2026-07-11.md）
 */

const POLL_INTERVAL_MS = 15 * 60 * 1000;
/** app-shell はモバイル/PC用に本コンポーネントを2箇所マウントするため、
 *  同一ページ内の重複フェッチをモジュールキャッシュで1本化する（60秒共有）。 */
const FETCH_SHARE_MS = 60 * 1000;
let sharedFetch: { key: string; at: number; promise: Promise<NotificationFeedResponse | null> } | null = null;

function fetchFeedShared(pref: string | null): Promise<NotificationFeedResponse | null> {
  const key = pref ?? "";
  const now = Date.now();
  if (sharedFetch && sharedFetch.key === key && now - sharedFetch.at < FETCH_SHARE_MS) {
    return sharedFetch.promise;
  }
  const promise = (async () => {
    try {
      const qs = pref ? `?pref=${encodeURIComponent(pref)}` : "";
      const res = await fetch(`/api/notify/feed${qs}`);
      if (!res.ok) return null;
      return (await res.json()) as NotificationFeedResponse;
    } catch {
      return null;
    }
  })();
  sharedFetch = { key, at: now, promise };
  return promise;
}

const SEVERITY_BAR: Record<SiteNotification["severity"], string> = {
  special: "border-l-4 border-rose-600",
  warning: "border-l-4 border-rose-400",
  advisory: "border-l-4 border-amber-400",
  info: "border-l-4 border-slate-200",
};

function formatDate(date: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!m) return date;
  return `${Number(m[2])}/${Number(m[3])}`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SiteNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const refresh = useCallback(async () => {
    const settings = loadNotificationSettings();
    const data = await fetchFeedShared(settings.prefectureIso);
    if (!data) return; // オフライン等は次回ポーリングに任せる
    const list = Array.isArray(data.items) ? data.items : [];
    setItems(list);
    setLoaded(true);
    // 警報級の新着はOS通知（設定ON＋許可済みのときのみ。既読・通知済みは除外）
    maybeShowOsNotifications(list);
  }, []);

  useEffect(() => {
    // 初期既読状態（SSRでは空→マウント後に実値。バッジはマウント後のみ描画）
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReadIds(loadReadIds());
    void refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      void refresh();
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  // パネル外クリックで閉じる
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const unread = items.filter((i) => !readIds.has(i.id));
  const hasAlert = unread.some((i) => i.severity === "warning" || i.severity === "special");

  const markAllRead = () => {
    setReadIds(new Set(markRead(items.map((i) => i.id))));
  };
  const markOneRead = (id: string) => {
    setReadIds(new Set(markRead([id])));
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`通知センター${loaded && unread.length > 0 ? `（未読${unread.length}件）` : ""}`}
        data-testid="notification-bell"
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {loaded && unread.length > 0 && (
          <span
            data-testid="notification-badge"
            className={`absolute -right-0.5 -top-0.5 inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${
              hasAlert ? "bg-rose-600" : "bg-sky-600"
            }`}
          >
            {unread.length > 99 ? "99+" : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="通知センター"
          className="fixed inset-x-2 top-16 z-[70] max-h-[75vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-96"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2 dark:border-slate-700">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
              通知センター
              {loaded && unread.length > 0 && <span className="ml-1.5 text-xs font-semibold text-sky-600">未読{unread.length}</span>}
            </p>
            <button
              type="button"
              onClick={markAllRead}
              className="inline-flex min-h-[44px] items-center gap-1 rounded-lg px-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
              すべて既読
            </button>
          </div>
          <ul className="max-h-[52vh] overflow-y-auto">
            {!loaded && <li className="p-4 text-xs text-slate-500">読み込み中…</li>}
            {loaded && items.length === 0 && <li className="p-4 text-xs text-slate-500">新しい通知はありません。</li>}
            {items.slice(0, 30).map((n) => {
              const isRead = readIds.has(n.id);
              const href = n.internalHref ?? n.url ?? "/whats-new";
              const external = !n.internalHref && !!n.url;
              return (
                <li key={n.id} className={`${SEVERITY_BAR[n.severity]} ${isRead ? "opacity-60" : ""}`}>
                  <Link
                    href={href}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noreferrer" : undefined}
                    onClick={() => markOneRead(n.id)}
                    className="block px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <p className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                      <span
                        className={`rounded px-1 py-0.5 ${
                          n.category === "weather" ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {NOTIFICATION_CATEGORY_LABEL[n.category]}
                      </span>
                      {formatDate(n.date)}
                      {external && <ExternalLink className="h-3 w-3" aria-hidden="true" />}
                      {!isRead && <span className="ml-auto h-2 w-2 rounded-full bg-sky-500" aria-label="未読" />}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs font-semibold text-slate-800 dark:text-slate-100">{n.title}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center justify-between border-t border-slate-200 px-3 py-2 dark:border-slate-700">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="inline-flex min-h-[44px] items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
            >
              <Settings className="h-3.5 w-3.5" aria-hidden="true" />
              通知設定・OS通知
            </Link>
            <a
              href="/feed/news.xml"
              className="inline-flex min-h-[44px] items-center gap-1 text-xs font-semibold text-orange-700 hover:underline dark:text-orange-300"
            >
              <Rss className="h-3.5 w-3.5" aria-hidden="true" />
              RSSで購読
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
