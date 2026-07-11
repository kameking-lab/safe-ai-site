import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SignageOsNotifier } from "./signage-os-notifier";

/**
 * サイネージ「画面表示中OS通知」の発火実測（RTL）。
 * Notification をスタブし、警報コードの増分でのみ発火することを機械固定する
 * （初回スナップショット・減少・既知コードでは発火しない＝リロード再通知防止）。
 */

type NotifCall = { title: string; options?: NotificationOptions };

const calls: NotifCall[] = [];

class FakeNotification {
  static permission: NotificationPermission = "granted";
  static requestPermission = vi.fn(async () => "granted" as NotificationPermission);
  onclick: (() => void) | null = null;
  constructor(title: string, options?: NotificationOptions) {
    calls.push({ title, options });
  }
  close() {}
}

describe("SignageOsNotifier", () => {
  beforeEach(() => {
    calls.length = 0;
    window.localStorage.clear();
    window.localStorage.setItem("signage-os-notify", "1"); // トグルON状態
    vi.stubGlobal("Notification", FakeNotification as unknown as typeof Notification);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("警報コードが増えたときだけ通知が発火する", () => {
    const { rerender } = render(<SignageOsNotifier warnings={[]} regionLabel="東京都 新宿区" />);
    // 初回スナップショットでは発火しない
    expect(calls).toHaveLength(0);

    // 新しい警報コードが現れた → 発火
    rerender(<SignageOsNotifier warnings={[{ code: "03", status: "発表" }]} regionLabel="東京都 新宿区" />);
    expect(calls).toHaveLength(1);
    expect(calls[0].title).toContain("東京都 新宿区");

    // 同じコードのままの再取得 → 追加発火しない
    rerender(<SignageOsNotifier warnings={[{ code: "03", status: "継続" }]} regionLabel="東京都 新宿区" />);
    expect(calls).toHaveLength(1);

    // 解除（減少） → 発火しない
    rerender(<SignageOsNotifier warnings={[]} regionLabel="東京都 新宿区" />);
    expect(calls).toHaveLength(1);
  });

  it("トグルOFF（既定）なら増分でも発火しない", () => {
    window.localStorage.setItem("signage-os-notify", "0");
    const { rerender } = render(<SignageOsNotifier warnings={[]} regionLabel="東京都 新宿区" />);
    rerender(<SignageOsNotifier warnings={[{ code: "03", status: "発表" }]} regionLabel="東京都 新宿区" />);
    expect(calls).toHaveLength(0);
  });

  it("リロード後の初回取得（既存警報あり）では再通知しない", () => {
    render(<SignageOsNotifier warnings={[{ code: "03", status: "継続" }]} regionLabel="東京都 新宿区" />);
    expect(calls).toHaveLength(0);
  });
});
