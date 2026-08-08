import { describe, expect, it } from "vitest";
import { buildRiskWeatherConclusion, type RiskWeatherInput } from "./weather-conclusion";

function build(partial: Partial<RiskWeatherInput> = {}) {
  return buildRiskWeatherConclusion({
    forecastStatus: "ok",
    jmaStatus: "ok",
    regions: [{ label: "関東", forecastLevel: "none", jmaLevel: "none" }],
    ...partial,
  });
}

describe("buildRiskWeatherConclusion", () => {
  it("全ソース取得成功・全地域に発表なしでも安全宣言にしない", () => {
    const result = build();
    expect(result.tone).toBe("neutral");
    expect(result.title).toBe("気象庁の警報・注意報 発表なし");
    expect(result.value).toBeUndefined();
    expect(result.description).toContain("現場条件");
  });

  it("prioritizes an official JMA warning over an independent forecast", () => {
    const result = build({ regions: [{ label: "関東", forecastLevel: "none", jmaLevel: "warning" }] });
    expect(result.tone).toBe("danger");
    expect(result.title).toContain("気象庁");
    expect(result.description).toContain("関東");
  });

  it("labels Open-Meteo thresholds as an independent guide, not an official warning", () => {
    const result = build({ regions: [{ label: "関東", forecastLevel: "warning", jmaLevel: "none" }] });
    expect(result.tone).toBe("danger");
    expect(result.title).toContain("独自目安");
    expect(result.description).toContain("気象庁の警報・注意報を意味しません");
    expect(result.value).toBe(1);
    expect(result.unit).toBe("地域");
  });

  it("fails closed when either source cannot be checked", () => {
    const partial = build({ forecastStatus: "error" });
    expect(partial.tone).toBe("warning");
    expect(partial.title).toBe("一部 確認不能");
    const all = build({ forecastStatus: "error", jmaStatus: "error" });
    expect(all.tone).toBe("warning");
    expect(all.title).toBe("気象情報 取得失敗");
    expect(all.description).toContain("気象庁");
  });

  it("uses a neutral no-publication statement, never a safety declaration", () => {
    const result = build();
    expect(result.tone).toBe("neutral");
    expect(result.title).toContain("発表なし");
    expect(result.title).not.toMatch(/安全|良好/);
  });

  it("特別警報と警報を区別しつつ全該当地域を数える", () => {
    const result = build({
      regions: [
        { label: "近畿", forecastLevel: "none", jmaLevel: "special" },
        { label: "中国", forecastLevel: "none", jmaLevel: "warning" },
      ],
    });
    expect(result.tone).toBe("danger");
    expect(result.title).toBe("気象庁 特別警報あり");
    expect(result.value).toBe(2);
    expect(result.description).toContain("近畿");
    expect(result.description).toContain("中国");
  });

  it("片方の取得中でも検知済みの気象庁警報を隠さない", () => {
    const result = build({
      forecastStatus: "loading",
      regions: [{ label: "東北", forecastLevel: undefined, jmaLevel: "warning" }],
    });
    expect(result.tone).toBe("danger");
    expect(result.title).toBe("気象庁 警報あり");
  });

  it("警報未検知で取得中なら確認中を維持する", () => {
    const bothLoading = build({ forecastStatus: "loading", jmaStatus: "loading" });
    expect(bothLoading.tone).toBe("neutral");
    expect(bothLoading.title).toBe("気象情報 確認中");
    expect(build({ jmaStatus: "loading" }).tone).toBe("neutral");
  });

  it("気象庁注意報だけを公式注意報として数える", () => {
    const result = build({
      regions: [
        { label: "四国", forecastLevel: "none", jmaLevel: "advisory" },
        { label: "九州", forecastLevel: "none", jmaLevel: "advisory" },
      ],
    });
    expect(result.tone).toBe("warning");
    expect(result.title).toBe("気象庁 注意報あり");
    expect(result.value).toBe(2);
    expect(result.description).toContain("四国");
    expect(result.description).toContain("九州");
  });

  it("一方の取得失敗時は独自目安があっても確認不能を優先する", () => {
    const result = build({
      jmaStatus: "error",
      regions: [{ label: "中部", forecastLevel: "advisory", jmaLevel: undefined }],
    });
    expect(result.tone).toBe("warning");
    expect(result.title).toBe("一部 確認不能");
    expect(result.title).not.toContain("発表なし");
  });

  it("独自警戒と独自注意が混在する場合は警戒地域だけを主件数にする", () => {
    const result = build({
      regions: [
        { label: "関東", forecastLevel: "warning", jmaLevel: "none" },
        { label: "東北", forecastLevel: "advisory", jmaLevel: "none" },
      ],
    });
    expect(result.tone).toBe("danger");
    expect(result.value).toBe(1);
    expect(result.description).toContain("関東");
    expect(result.description).not.toContain("東北");
  });
});
