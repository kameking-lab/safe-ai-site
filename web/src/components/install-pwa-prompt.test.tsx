import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { InstallPwaPrompt } from "./install-pwa-prompt";

// 柱1是正: beforeinstallprompt が発火しない iOS でも
// 「共有 → ホーム画面に追加」の手動手順が出ることの回帰ガード。

const IPHONE_SAFARI_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36";

const SCORE_KEY = "anzen-usage-score-v1";
const DISMISS_KEY = "pwa-install-dismissed-at";

function setNavigator(userAgent: string, platform: string, maxTouchPoints: number) {
  Object.defineProperty(window.navigator, "userAgent", { value: userAgent, configurable: true });
  Object.defineProperty(window.navigator, "platform", { value: platform, configurable: true });
  Object.defineProperty(window.navigator, "maxTouchPoints", {
    value: maxTouchPoints,
    configurable: true,
  });
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
});

describe("InstallPwaPrompt (iOS 手動案内)", () => {
  it("iPhone Safari + 利用スコア閾値以上で手動手順バナーを表示", () => {
    setNavigator(IPHONE_SAFARI_UA, "iPhone", 5);
    window.localStorage.setItem(SCORE_KEY, "12");
    render(<InstallPwaPrompt />);
    expect(screen.getByRole("dialog", { name: "ホーム画面に追加" })).toBeDefined();
    expect(screen.getByText("「ホーム画面に追加」を選ぶ")).toBeDefined();
    // iOS では prompt() が使えないので「追加する」ボタンは出さない
    expect(screen.queryByRole("button", { name: "追加する" })).toBeNull();
  });

  it("利用スコアが閾値未満なら iPhone でも表示しない", () => {
    setNavigator(IPHONE_SAFARI_UA, "iPhone", 5);
    window.localStorage.setItem(SCORE_KEY, "3");
    render(<InstallPwaPrompt />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("14日以内に閉じていたら iPhone でも表示しない", () => {
    setNavigator(IPHONE_SAFARI_UA, "iPhone", 5);
    window.localStorage.setItem(SCORE_KEY, "12");
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    render(<InstallPwaPrompt />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("Android はイベント未発火なら何も出さない（従来どおり）", () => {
    setNavigator(ANDROID_UA, "Linux armv8l", 5);
    window.localStorage.setItem(SCORE_KEY, "12");
    render(<InstallPwaPrompt />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
