import { describe, expect, it } from "vitest";
import {
  buildRiskWeatherConclusion,
  type RiskRegionInput,
  type RiskWeatherInput,
} from "./weather-conclusion";

const REGIONS = [
  "北海道",
  "東北",
  "関東",
  "中部",
  "近畿",
  "中国",
  "四国",
  "九州",
] as const;

function regions(
  overrides: Partial<Record<(typeof REGIONS)[number], Partial<RiskRegionInput>>> = {}
): RiskRegionInput[] {
  return REGIONS.map((label) => ({
    label,
    forecastLevel: "none",
    jmaLevel: "none",
    ...overrides[label],
  }));
}

function input(partial: Partial<RiskWeatherInput>): RiskWeatherInput {
  return {
    forecastStatus: "ok",
    jmaStatus: "ok",
    regions: regions(),
    ...partial,
  };
}

describe("buildRiskWeatherConclusion: 色の文法（サイネージ結論ストリップと同一）", () => {
  it("全ソース取得成功・全ブロック異常なし = 緑「警報・注意報なし」", () => {
    const c = buildRiskWeatherConclusion(input({}));
    expect(c.tone).toBe("safe");
    expect(c.title).toBe("警報・注意報なし");
    expect(c.value).toBeUndefined();
  });

  it("警報相当が1ブロックでもあれば赤・該当ブロック名と地域数を出す", () => {
    const c = buildRiskWeatherConclusion(
      input({ regions: regions({ 関東: { forecastLevel: "warning" } }) })
    );
    expect(c.tone).toBe("danger");
    expect(c.title).toBe("警報相当あり");
    expect(c.value).toBe(1);
    expect(c.unit).toBe("地域");
    expect(c.description).toContain("関東");
    expect(c.description).toContain("中止");
  });

  it("気象庁側(JMA)だけが警報でも赤になる（予報と実況の悪い方を採用）", () => {
    const c = buildRiskWeatherConclusion(
      input({ regions: regions({ 九州: { jmaLevel: "warning" } }) })
    );
    expect(c.tone).toBe("danger");
    expect(c.value).toBe(1);
    expect(c.description).toContain("九州");
  });

  it("特別警報はタイトルで区別する（赤のまま）", () => {
    const c = buildRiskWeatherConclusion(
      input({ regions: regions({ 近畿: { jmaLevel: "special" }, 中国: { jmaLevel: "warning" } }) })
    );
    expect(c.tone).toBe("danger");
    expect(c.title).toBe("特別警報あり");
    expect(c.value).toBe(2);
    expect(c.description).toContain("近畿");
    expect(c.description).toContain("中国");
  });

  it("片方のソースがまだ取得中でも、警報を検知できた時点で赤を出す（隠さない）", () => {
    const c = buildRiskWeatherConclusion(
      input({
        forecastStatus: "loading",
        regions: regions({ 東北: { forecastLevel: undefined, jmaLevel: "warning" } }),
      })
    );
    expect(c.tone).toBe("danger");
  });

  it("両ソース失敗 = 黄「取得失敗」（確認不能を緑にも赤にもしない）", () => {
    const c = buildRiskWeatherConclusion(
      input({
        forecastStatus: "error",
        jmaStatus: "error",
        regions: REGIONS.map((label) => ({ label })),
      })
    );
    expect(c.tone).toBe("warning");
    expect(c.title).toBe("気象情報 取得失敗");
    expect(c.description).toContain("気象庁");
  });

  it("取得中（警報未検知）は無彩「確認中」= 緑のフライング宣言をしない", () => {
    const c = buildRiskWeatherConclusion(
      input({ forecastStatus: "loading", jmaStatus: "loading", regions: REGIONS.map((label) => ({ label })) })
    );
    expect(c.tone).toBe("neutral");
    expect(c.title).toBe("気象情報 確認中");
  });

  it("片方が取得中・もう片方が異常なしでも、まだ緑を宣言しない（確認中のまま）", () => {
    const c = buildRiskWeatherConclusion(input({ jmaStatus: "loading" }));
    expect(c.tone).toBe("neutral");
  });

  it("注意報相当のみ = 黄・該当地域数と名前", () => {
    const c = buildRiskWeatherConclusion(
      input({
        regions: regions({ 四国: { forecastLevel: "advisory" }, 九州: { jmaLevel: "advisory" } }),
      })
    );
    expect(c.tone).toBe("warning");
    expect(c.title).toBe("注意報相当あり");
    expect(c.value).toBe(2);
    expect(c.description).toContain("四国");
    expect(c.description).toContain("九州");
  });

  it("片方失敗＋注意報あり = 注意報を出しつつ取得失敗を補足する（情報を隠さない）", () => {
    const c = buildRiskWeatherConclusion(
      input({
        jmaStatus: "error",
        regions: regions({ 中部: { forecastLevel: "advisory", jmaLevel: undefined } }),
      })
    );
    expect(c.tone).toBe("warning");
    expect(c.title).toBe("注意報相当あり");
    expect(c.description).toContain("取得失敗");
  });

  it("片方失敗＋異常なし = 黄「一部 確認不能」（緑を宣言できない）", () => {
    const c = buildRiskWeatherConclusion(
      input({
        jmaStatus: "error",
        regions: regions().map((r) => ({ ...r, jmaLevel: undefined })),
      })
    );
    expect(c.tone).toBe("warning");
    expect(c.title).toBe("一部 確認不能");
  });

  it("注意報は警報に昇格しない・警報があるとき注意報地域は数に入れない", () => {
    const c = buildRiskWeatherConclusion(
      input({
        regions: regions({
          関東: { forecastLevel: "warning" },
          東北: { forecastLevel: "advisory" },
        }),
      })
    );
    expect(c.tone).toBe("danger");
    expect(c.value).toBe(1);
    expect(c.description).not.toContain("東北");
  });
});
