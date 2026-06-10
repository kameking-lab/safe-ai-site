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

  // ---- WCAG コントラスト機械検証（第2回独立監査 2026-06-10 反映） ----
  // 是正前: warning.solid=amber-500+白文字 2.15:1 / safe=emerald-600+白 3.77:1 /
  // info=sky-600+白 4.10:1 の3トーンが AA(4.5:1)不足だった。トークン1箇所で直し、
  // ここで恒久固定する（Tailwind既定パレットの実色値で計算）。

  /** このファイルで使う Tailwind 既定パレットの実色値（v3/v4共通の既定値） */
  const TAILWIND_HEX: Record<string, string> = {
    white: "#ffffff",
    "rose-600": "#e11d48",
    "amber-500": "#f59e0b",
    "amber-950": "#451a03",
    "emerald-700": "#047857",
    "sky-700": "#0369a1",
    "slate-600": "#475569",
  };

  function relativeLuminance(hexColor: string): number {
    const n = parseInt(hexColor.slice(1), 16);
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function contrastRatio(a: string, b: string): number {
    const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  }

  /** "bg-amber-500 text-amber-950" → ["amber-500", "amber-950"] */
  function solidPair(solid: string): [string, string] {
    const bg = solid.match(/bg-([a-z]+-\d+)/)?.[1];
    const text = solid.includes("text-white") ? "white" : solid.match(/text-([a-z]+-\d+)/)?.[1];
    if (!bg || !text) throw new Error(`solid からbg/textを抽出できない: ${solid}`);
    return [bg, text];
  }

  it("solid の背景×文字は全トーンで WCAG AA (4.5:1) を満たす", () => {
    for (const tone of SAFETY_TONES) {
      const [bg, text] = solidPair(SAFETY_TONE[tone].solid);
      expect(TAILWIND_HEX[bg], `${tone}.solid の背景色 ${bg} をTAILWIND_HEXに追加せよ`).toBeDefined();
      expect(TAILWIND_HEX[text], `${tone}.solid の文字色 ${text} をTAILWIND_HEXに追加せよ`).toBeDefined();
      const ratio = contrastRatio(TAILWIND_HEX[bg], TAILWIND_HEX[text]);
      expect(ratio, `${tone}.solid (${bg}/${text}) のコントラスト比 ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("warning.solid は JIS 現物標識と同じ「黄地に黒系文字」（白文字に戻さない）", () => {
    expect(SAFETY_TONE.warning.solid).toContain("bg-amber-500");
    expect(SAFETY_TONE.warning.solid).not.toContain("text-white");
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
