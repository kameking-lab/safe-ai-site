import { describe, it, expect } from "vitest";
import { SAFETY_TONE, SAFETY_TONES, dominantTone } from "./safety-tone";

describe("SAFETY_TONE トークン", () => {
  it("全トーンに全クラスフィールドが定義されている（空文字なし）", () => {
    for (const tone of SAFETY_TONES) {
      const t = SAFETY_TONE[tone];
      for (const [key, value] of Object.entries(t)) {
        expect(value, `${tone}.${key}`).toBeTruthy();
      }
    }
  });

  it("JIS安全色の文法: 赤=rose / 黄=amber / 緑=emerald / 青=sky を逸脱しない", () => {
    expect(SAFETY_TONE.danger.solid).toContain("rose");
    expect(SAFETY_TONE.warning.solid).toContain("amber");
    expect(SAFETY_TONE.safe.solid).toContain("emerald");
    expect(SAFETY_TONE.info.solid).toContain("sky");
    expect(SAFETY_TONE.neutral.solid).toContain("slate");
  });

  it("solid は白文字（濃色塗りで視認性を保証）", () => {
    for (const tone of SAFETY_TONES) {
      expect(SAFETY_TONE[tone].solid).toContain("text-white");
    }
  });
});

describe("dominantTone（1画面1メッセージの決定ロジック）", () => {
  it("期限超過が1件でもあれば danger", () => {
    expect(dominantTone({ danger: 1, warning: 9 })).toBe("danger");
  });
  it("期限超過なし・要対応ありなら warning", () => {
    expect(dominantTone({ danger: 0, warning: 2 })).toBe("warning");
  });
  it("どちらも無ければ safe", () => {
    expect(dominantTone({ danger: 0, warning: 0 })).toBe("safe");
    expect(dominantTone({})).toBe("safe");
  });
});
