import { describe, it, expect } from "vitest";
import { resolveWeatherWarningPanelState } from "./weather-warning-panel-state";

const advisoryWarning = [{ code: "12", status: "発表" }];
const warningWarning = [{ code: "03", status: "発表" }];
const specialWarning = [{ code: "31", status: "発表" }];

describe("resolveWeatherWarningPanelState", () => {
  it("取得失敗(error)は警報の有無に関わらず error（誤った安心を与えない）", () => {
    expect(resolveWeatherWarningPanelState("error", null, null)).toEqual({ kind: "error", headline: null });
    // 失敗時に古いヘッドラインが残っていても error を優先
    expect(resolveWeatherWarningPanelState("error", warningWarning, "大雨警報")).toEqual({
      kind: "error",
      headline: null,
    });
  });

  it("初回取得中(idle/loading)は loading", () => {
    expect(resolveWeatherWarningPanelState("idle", null, null)).toEqual({ kind: "loading", headline: null });
    expect(resolveWeatherWarningPanelState("loading", null, null)).toEqual({ kind: "loading", headline: null });
  });

  it("選択地点(市区町村)の警報コードがwarning級なら warning（ヘッドラインは補足として保持）", () => {
    expect(resolveWeatherWarningPanelState("success", warningWarning, "東京都に大雨警報")).toEqual({
      kind: "warning",
      headline: "東京都に大雨警報",
    });
  });

  it("選択地点の警報コードがspecial級なら special", () => {
    expect(resolveWeatherWarningPanelState("success", specialWarning, "  暴風特別警報  ")).toEqual({
      kind: "special",
      headline: "暴風特別警報",
    });
  });

  it("選択地点の警報コードが注意報のみなら advisory（赤にしない・本タスクの核心）", () => {
    expect(resolveWeatherWarningPanelState("success", advisoryWarning, null)).toEqual({
      kind: "advisory",
      headline: null,
    });
  });

  it("県ヘッドラインがあっても選択地点(市区町村)のselectedWarningsが空なら none（離島注意報を新宿の赤にしない）", () => {
    expect(
      resolveWeatherWarningPanelState("success", [], "伊豆諸島では、暴風に注意してください。")
    ).toEqual({ kind: "none", headline: null });
  });

  it("成功かつ選択地点の警報が無い/未指定は none（本当に警報なし）", () => {
    expect(resolveWeatherWarningPanelState("success", null, null)).toEqual({ kind: "none", headline: null });
    expect(resolveWeatherWarningPanelState("success", undefined, undefined)).toEqual({
      kind: "none",
      headline: null,
    });
  });

  it("error と none を取り違えない（本タスクの核心）", () => {
    const fail = resolveWeatherWarningPanelState("error", null, null);
    const clear = resolveWeatherWarningPanelState("success", null, null);
    expect(fail.kind).toBe("error");
    expect(clear.kind).toBe("none");
    expect(fail.kind).not.toBe(clear.kind);
  });
});
