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
const PAGE_VIEW_COUNT_KEY = "anzen-page-view-count-v1";

export const FEEDBACK_GATE_THRESHOLD = 20;
// P0-4: 最低 3 回の閲覧があるまではモーダルを出さない。
// score がスコア値で 20 を超えていても、PV 回数が 3 未満なら表示しない。
export const FEEDBACK_GATE_MIN_PAGE_VIEWS = 3;
// 既定スヌーズは 30 日。ヘビーユーザーほど頻繁に再表示される設計を緩和する
// （第三者レビュー §C 是正: 7日→30日。毎朝の習慣を妨げない間隔へ）。
export const SNOOZE_DAYS_DEFAULT = 30;

// 作業の最中に割り込んではいけない画面のパス接頭辞。
// /ky 系（KY記入・朝礼）・/signage 系（サイネージ常時表示）では
// フィードバック懇願を一切出さない（第三者レビュー §C 是正）。
// 印刷ビューは別途 CSS（print:hidden）で抑止する。
const WORK_CONTEXT_PREFIXES = ["/ky", "/signage"] as const;

/**
 * いま見ている画面が「作業の文脈」で割込み禁止かを判定する純関数。
 * 完全一致または `<prefix>/` 始まりのみ該当（例: `/ky` と `/ky/paper` は該当、
 * `/ky-examples`（事例の閲覧）は非該当）。
 */
export function isWorkContextPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return WORK_CONTEXT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

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
  if (event === "page_view") {
    const prev = getPageViewCount();
    safeSet(PAGE_VIEW_COUNT_KEY, String(prev + 1));
  }
  return next;
}

/** 累積ページビュー回数（PVスコアではなく純粋な訪問回数）を取得。 */
export function getPageViewCount(): number {
  const raw = safeGet(PAGE_VIEW_COUNT_KEY);
  if (!raw) return 0;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
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
  // 初回・2回目アクセスでは絶対に表示しない（P0-4）
  if (getPageViewCount() < FEEDBACK_GATE_MIN_PAGE_VIEWS) return false;
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
    window.localStorage.removeItem(PAGE_VIEW_COUNT_KEY);
  } catch {
    /* noop */
  }
}
