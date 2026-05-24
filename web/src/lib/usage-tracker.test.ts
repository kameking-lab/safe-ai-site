import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  FEEDBACK_GATE_MIN_PAGE_VIEWS,
  FEEDBACK_GATE_THRESHOLD,
  getPageViewCount,
  getUsageScore,
  hasSubmittedFeedback,
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
});
