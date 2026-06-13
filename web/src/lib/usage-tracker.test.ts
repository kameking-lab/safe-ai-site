import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  FEEDBACK_GATE_MIN_PAGE_VIEWS,
  FEEDBACK_GATE_THRESHOLD,
  SNOOZE_DAYS_DEFAULT,
  getPageViewCount,
  getUsageScore,
  hasSubmittedFeedback,
  isWorkContextPath,
  markFeedbackSubmitted,
  resetUsageTracker,
  shouldShowFeedbackGate,
  snoozeFeedbackGate,
  trackUsage,
} from "./usage-tracker";

// 軽量な localStorage stub。テスト間で必ずリセットする。
let storage: Record<string, string>;

beforeEach(() => {
  storage = {};
  const stub: Storage = {
    get length() {
      return Object.keys(storage).length;
    },
    clear() {
      storage = {};
    },
    getItem(key: string) {
      return key in storage ? storage[key] : null;
    },
    key(i: number) {
      return Object.keys(storage)[i] ?? null;
    },
    removeItem(key: string) {
      delete storage[key];
    },
    setItem(key: string, value: string) {
      storage[key] = value;
    },
  };
  vi.stubGlobal("window", { localStorage: stub });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("trackUsage / shouldShowFeedbackGate", () => {
  it("初回 PV ではゲートを表示しない（P0-4 回帰）", () => {
    trackUsage("page_view");
    expect(getPageViewCount()).toBe(1);
    expect(shouldShowFeedbackGate()).toBe(false);
  });

  it("FEEDBACK_GATE_MIN_PAGE_VIEWS 未満ではどれだけスコアが高くてもゲートを表示しない", () => {
    // ai_chat は 1 回で 3 点。10 回呼んで 30 点（FEEDBACK_GATE_THRESHOLD 超）
    for (let i = 0; i < 10; i += 1) trackUsage("ai_chat");
    expect(getUsageScore()).toBeGreaterThanOrEqual(FEEDBACK_GATE_THRESHOLD);
    expect(getPageViewCount()).toBe(0); // page_view ではない
    expect(shouldShowFeedbackGate()).toBe(false);
  });

  it("3 回以上の PV かつ スコア >= 閾値 でゲート表示", () => {
    for (let i = 0; i < FEEDBACK_GATE_MIN_PAGE_VIEWS; i += 1) {
      trackUsage("page_view");
    }
    // PV だけでは閾値に届かないので明示的に高スコアにする
    for (let i = 0; i < 10; i += 1) trackUsage("ai_chat");
    expect(getPageViewCount()).toBeGreaterThanOrEqual(FEEDBACK_GATE_MIN_PAGE_VIEWS);
    expect(getUsageScore()).toBeGreaterThanOrEqual(FEEDBACK_GATE_THRESHOLD);
    expect(shouldShowFeedbackGate()).toBe(true);
  });

  it("投稿済みフラグがあるとゲートを表示しない", () => {
    for (let i = 0; i < 25; i += 1) trackUsage("page_view");
    markFeedbackSubmitted();
    expect(hasSubmittedFeedback()).toBe(true);
    expect(shouldShowFeedbackGate()).toBe(false);
  });

  it("snooze 中はゲートを表示しない", () => {
    for (let i = 0; i < 25; i += 1) trackUsage("page_view");
    snoozeFeedbackGate(7);
    expect(shouldShowFeedbackGate()).toBe(false);
  });

  it("resetUsageTracker で全カウンタが初期化される", () => {
    for (let i = 0; i < 5; i += 1) trackUsage("page_view");
    resetUsageTracker();
    expect(getPageViewCount()).toBe(0);
    expect(getUsageScore()).toBe(0);
    expect(shouldShowFeedbackGate()).toBe(false);
  });

  it("既定スヌーズは 30 日（§C 是正: 7日→30日でヘビーユーザーの中断を緩和）", () => {
    expect(SNOOZE_DAYS_DEFAULT).toBe(30);
    for (let i = 0; i < 25; i += 1) trackUsage("page_view");
    // 引数なしの既定スヌーズで表示されなくなる
    snoozeFeedbackGate();
    expect(shouldShowFeedbackGate()).toBe(false);
  });
});

describe("isWorkContextPath（作業画面ではフィードバック懇願を出さない）", () => {
  it("/ky 系（KY記入・朝礼）では割込み禁止", () => {
    expect(isWorkContextPath("/ky")).toBe(true);
    expect(isWorkContextPath("/ky/paper")).toBe(true);
    expect(isWorkContextPath("/ky/morning")).toBe(true);
    expect(isWorkContextPath("/ky/list")).toBe(true);
    expect(isWorkContextPath("/ky/workers")).toBe(true);
  });

  it("/signage 系（サイネージ常時表示）では割込み禁止", () => {
    expect(isWorkContextPath("/signage")).toBe(true);
    expect(isWorkContextPath("/signage/display")).toBe(true);
    expect(isWorkContextPath("/signage/map")).toBe(true);
  });

  it("接頭辞が一致するだけの別ルート（/ky-examples 等）は対象外＝閲覧は許可", () => {
    expect(isWorkContextPath("/ky-examples")).toBe(false);
    expect(isWorkContextPath("/signage-guide")).toBe(false);
  });

  it("通常の機能ページでは表示を許可する", () => {
    expect(isWorkContextPath("/accidents")).toBe(false);
    expect(isWorkContextPath("/laws")).toBe(false);
    expect(isWorkContextPath("/")).toBe(false);
  });

  it("null / undefined / 空文字は安全に false", () => {
    expect(isWorkContextPath(null)).toBe(false);
    expect(isWorkContextPath(undefined)).toBe(false);
    expect(isWorkContextPath("")).toBe(false);
  });
});
