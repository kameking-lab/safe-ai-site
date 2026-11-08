import { describe, expect, it } from "vitest";
import { readChatbotFailure } from "./chatbot-failure";

describe("readChatbotFailure（チャット失敗応答の読み替え）", () => {
  it("未ログインの形 { error: 文 } から文を取り出す", () => {
    expect(readChatbotFailure({ error: "個人情報を除いてください。", retryable: false })).toEqual({
      message: "個人情報を除いてください。",
      code: null,
      retryable: false,
    });
  });

  it("ログイン済み（共通利用枠）の形 { error: { code, message } } から文を取り出す", () => {
    expect(
      readChatbotFailure({
        error: { code: "DAILY_LIMIT_REACHED", message: "本日の上限に達しました。", resetAt: "2026-11-09T00:00:00+09:00" },
      }),
    ).toEqual({ message: "本日の上限に達しました。", code: "DAILY_LIMIT_REACHED", retryable: false });
  });

  it("文の代わりにオブジェクトを返さない（描画で画面が落ちない）", () => {
    const failure = readChatbotFailure({ error: { code: "SAFETY_BLOCKED", reason: "pii" } });
    expect(failure.message).toBeNull();
    expect(failure.retryable).toBe(false);
  });

  it("混雑・処理中・サーバー側の一時的な失敗は再試行できる", () => {
    for (const code of ["BURST_LIMITED", "OPERATION_PENDING", "ENTITLEMENT_SYNC_PENDING"]) {
      expect(readChatbotFailure({ error: { code, message: "しばらくしてから" } }).retryable).toBe(true);
    }
  });

  it("本文が読めないときは文なし・再試行可", () => {
    expect(readChatbotFailure(null)).toEqual({ message: null, code: null, retryable: true });
    expect(readChatbotFailure("oops")).toEqual({ message: null, code: null, retryable: true });
  });
});
