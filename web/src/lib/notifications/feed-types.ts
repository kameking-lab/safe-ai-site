import type { NewsHubCategory } from "@/lib/news-hub-types";

/**
 * 通知センター（ベル）のフィード型。クライアント（ベル・サイネージ）と
 * サーバー（/api/notify/feed）で共有する。
 *
 * 将来の本Push（VAPID鍵発行後）互換: この SiteNotification がそのまま
 * push payload（sw.js の showNotification 引数）になる想定で設計している
 * （docs/vapid-push-setup-guide-2026-07-11.md 参照）。鍵なしの現状は
 * 「開いている画面でのポーリング→Notification API」までを実装する。
 */

export type SiteNotificationCategory = NewsHubCategory | "weather";

export type SiteNotificationSeverity = "info" | "advisory" | "warning" | "special";

export type SiteNotification = {
  /** 既読管理のキー（安定ID。気象警報は 都道府県×報知時刻 で一意） */
  id: string;
  category: SiteNotificationCategory;
  title: string;
  body?: string;
  /** 並び替え・新着判定用（YYYY-MM-DD または ISO datetime） */
  date: string;
  /** 一次情報への外部リンク */
  url?: string;
  /** サイト内の該当機能への導線 */
  internalHref?: string;
  severity: SiteNotificationSeverity;
};

export type NotificationFeedResponse = {
  generatedAt: string;
  /** リクエストされた都道府県ISO（気象警報の対象。未指定は null） */
  prefectureIso: string | null;
  items: SiteNotification[];
};

export const NOTIFICATION_CATEGORY_LABEL: Record<SiteNotificationCategory, string> = {
  weather: "気象警報",
  "law-revision": "法改正",
  accident: "事故速報",
  notice: "通達・告示",
  media: "報道",
  "serious-case": "重大災害事例",
};
