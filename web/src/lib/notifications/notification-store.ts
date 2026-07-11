/**
 * 通知センターの既読状態・設定（端末内 localStorage。鍵なし通知ライトの方針＝
 * サーバーに個人データを持たない）。`safe-ai:` 名前空間は site-records/backup.ts の
 * 一括バックアップ対象に自動で入る。
 */

const READ_KEY = "safe-ai:notif-read:v1";
const SETTINGS_KEY = "safe-ai:notif-settings:v1";
/** 既読IDの保持上限（フィードは最大50件程度なので十分。古い順に間引く） */
const READ_CAP = 500;

export type NotificationSettings = {
  /** 画面表示中のOS通知（Notification API）を出すか */
  osNotify: boolean;
  /** 気象警報の対象都道府県ISO（例 JP-13）。未設定はサイネージ等の既定地点に従う */
  prefectureIso: string | null;
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  osNotify: false,
  prefectureIso: null,
};

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  const arr = safeParse<string[]>(window.localStorage.getItem(READ_KEY));
  return new Set(Array.isArray(arr) ? arr : []);
}

export function saveReadIds(ids: Set<string>): void {
  if (typeof window === "undefined") return;
  const arr = [...ids];
  const capped = arr.length > READ_CAP ? arr.slice(arr.length - READ_CAP) : arr;
  window.localStorage.setItem(READ_KEY, JSON.stringify(capped));
}

export function markRead(ids: Iterable<string>): Set<string> {
  const cur = loadReadIds();
  for (const id of ids) cur.add(id);
  saveReadIds(cur);
  return cur;
}

export function loadNotificationSettings(): NotificationSettings {
  if (typeof window === "undefined") return DEFAULT_NOTIFICATION_SETTINGS;
  const parsed = safeParse<Partial<NotificationSettings>>(window.localStorage.getItem(SETTINGS_KEY));
  return {
    osNotify: parsed?.osNotify === true,
    prefectureIso: typeof parsed?.prefectureIso === "string" ? parsed.prefectureIso : null,
  };
}

export function saveNotificationSettings(settings: NotificationSettings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
