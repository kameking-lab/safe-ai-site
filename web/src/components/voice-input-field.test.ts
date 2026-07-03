import { describe, expect, it } from "vitest";
import { describeVoiceError } from "./voice-input-field";

describe("describeVoiceError", () => {
  it("マイク権限拒否を日本語で説明する", () => {
    expect(describeVoiceError("not-allowed")).toContain("マイクが許可されていません");
    expect(describeVoiceError("NotAllowedError")).toContain("マイクが許可されていません");
    expect(describeVoiceError("permission-denied")).toContain("マイクが許可されていません");
  });

  it("無音・マイク未検出・ネットワークエラーを個別に説明する", () => {
    expect(describeVoiceError("no-speech")).toContain("音声が検出されませんでした");
    expect(describeVoiceError("audio-capture")).toContain("マイクが見つかりません");
    expect(describeVoiceError("network")).toContain("ネットワークエラー");
  });

  it("未対応ブラウザを説明する", () => {
    expect(describeVoiceError("not-supported")).toContain("未対応");
    expect(describeVoiceError("service-not-allowed")).toContain("未対応");
  });

  it("未知のエラーコードでも空文字にならず何らかのメッセージを返す", () => {
    expect(describeVoiceError("some-unknown-code")).toContain("some-unknown-code");
    expect(describeVoiceError(undefined)).toBe("音声エラー");
  });
});
