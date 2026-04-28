/**
 * 利用スコア追跡システム
 * 各機能利用時にスコアを加算し、閾値に到達したらフィードバックゲートを表示する。
 * localStorage に保存。投稿後はフラグ永続化、二度と表示しない。
 */

export type UsageEvent =
  | "page_view" // PV ×1
  | "ai_chat" // AIチャット ×3
  | "chemical_ra" // 化学物質RA ×5
  | "ky" // KY ×5
  | "accident_db" // 事故DB ×2
  | "law_notice"; // 通達 ×1

const EVENT_SCORES: Record<UsageEvent, number> = {
  page_view: 1,
  ai_chat: 3,
  chemical_ra: 5,
  ky: 5,
  accident_db: 2,
  law_notice: 1,
};

const SCORE_KEY = "anzen-usage-score-v1";
const GATE_DISMISSED_KEY = "anzen-feedback-gate-dismissed-v1";
const GATE_SNOOZED_UNTIL_KEY = "anzen-feedback-gate-snoozed-until-v1";
const SUBMITTED_FLAG_KEY = "anzen-feedback-gate-submitted-v1";

export const FEEDBACK_GATE_THRESHOLD = 20;
const SNOOZE_DAYS_DEFAULT = 7;

function safeGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* noop */
  }
}

/** 現在の利用スコアを取得 */
export function getUsageScore(): number {
  const raw = safeGet(SCORE_KEY);
  if (!raw) return 0;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** 利用イベントを記録してスコアを加算 */
export function trackUsage(event: UsageEvent): number {
  const current = getUsageScore();
  const next = current + EVENT_SCORES[event];
  safeSet(SCORE_KEY, String(next));
  return next;
}

/** すでに投稿済みか（永続フラグ） */
export function hasSubmittedFeedback(): boolean {
  return safeGet(SUBMITTED_FLAG_KEY) === "1";
}

/** 投稿完了をマーク（以降、ゲートは表示しない） */
export function markFeedbackSubmitted(): void {
  safeSet(SUBMITTED_FLAG_KEY, "1");
}

/** ゲートを閉じた（永続的に閉じる）。投稿しない場合の最終手段。 */
export function dismissFeedbackGate(): void {
  safeSet(GATE_DISMISSED_KEY, "1");
}

/** 「次回」で延期 */
export function snoozeFeedbackGate(days: number = SNOOZE_DAYS_DEFAULT): void {
  const until = Date.now() + days * 24 * 60 * 60 * 1000;
  safeSet(GATE_SNOOZED_UNTIL_KEY, String(until));
}

function isSnoozed(): boolean {
  const raw = safeGet(GATE_SNOOZED_UNTIL_KEY);
  if (!raw) return false;
  const until = Number.parseInt(raw, 10);
  if (!Number.isFinite(until)) return false;
  return Date.now() < until;
}

/** ゲートを表示すべきか */
export function shouldShowFeedbackGate(): boolean {
  if (typeof window === "undefined") return false;
  if (hasSubmittedFeedback()) return false;
  if (safeGet(GATE_DISMISSED_KEY) === "1") return false;
  if (isSnoozed()) return false;
  return getUsageScore() >= FEEDBACK_GATE_THRESHOLD;
}

/** スコアをリセット（テスト用） */
export function resetUsageTracker(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SCORE_KEY);
    window.localStorage.removeItem(GATE_DISMISSED_KEY);
    window.localStorage.removeItem(GATE_SNOOZED_UNTIL_KEY);
    window.localStorage.removeItem(SUBMITTED_FLAG_KEY);
  } catch {
    /* noop */
  }
}
