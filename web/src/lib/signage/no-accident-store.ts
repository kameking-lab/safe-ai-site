"use client";

/**
 * 無災害日数カウンタの起点日（この端末のlocalStorageに保存）。
 * 事故が発生した場合は resetNoAccidentStart() で起点日を今日にリセットする運用を想定。
 */

const START_DATE_KEY = "safe-ai:signage-no-accident-start:v1";

export function getNoAccidentStartDate(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(START_DATE_KEY);
  } catch {
    return null;
  }
}

/** 起点日(yyyy-mm-dd)を設定。無効な形式は無視する。 */
export function setNoAccidentStartDate(iso: string): void {
  if (typeof window === "undefined") return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return;
  try {
    window.localStorage.setItem(START_DATE_KEY, iso);
  } catch {
    /* ignore */
  }
}

/** 事故発生時の起点リセット（起点日=今日）。 */
export function resetNoAccidentStart(todayIso: string): void {
  setNoAccidentStartDate(todayIso);
}
