import { describe, it, expect } from "vitest";
import { resolveWeatherWarningPanelState } from "./weather-warning-panel-state";

describe("resolveWeatherWarningPanelState", () => {
  it("取得失敗(error)は警報の有無に関わらず error（誤った安心を与えない）", () => {
    expect(resolveWeatherWarningPanelState("error", null)).toEqual({ kind: "error", headline: null });
    // 失敗時に古いヘッドラインが残っていても error を優先
    expect(resolveWeatherWarningPanelState("error", "大雨警報")).toEqual({ kind: "error", headline: null });
  });

  it("初回取得中(idle/loading)は loading", () => {
    expect(resolveWeatherWarningPanelState("idle", null)).toEqual({ kind: "loading", headline: null });
    expect(resolveWeatherWarningPanelState("loading", null)).toEqual({ kind: "loading", headline: null });
  });

  it("成功＋ヘッドラインありは headline（本文をトリムして保持）", () => {
    expect(resolveWeatherWarningPanelState("success", "東京都に大雨警報")).toEqual({
      kind: "headline",
      headline: "東京都に大雨警報",
    });
    expect(resolveWeatherWarningPanelState("success", "  暴風警報  ")).toEqual({
      kind: "headline",
      headline: "暴風警報",
    });
  });

  it("成功かつヘッドライン無し/空白のみは none（本当に警報なし）", () => {
    expect(resolveWeatherWarningPanelState("success", null)).toEqual({ kind: "none", headline: null });
    expect(resolveWeatherWarningPanelState("success", undefined)).toEqual({ kind: "none", headline: null });
    expect(resolveWeatherWarningPanelState("success", "   ")).toEqual({ kind: "none", headline: null });
  });

  it("error と none を取り違えない（本タスクの核心）", () => {
    const fail = resolveWeatherWarningPanelState("error", null);
    const clear = resolveWeatherWarningPanelState("success", null);
    expect(fail.kind).toBe("error");
    expect(clear.kind).toBe("none");
    expect(fail.kind).not.toBe(clear.kind);
  });
});
