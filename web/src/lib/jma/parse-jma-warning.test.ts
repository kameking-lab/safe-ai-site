import { describe, it, expect } from "vitest";
import { summarizeWarningPayload, type JmaWarningPayload } from "./parse-jma-warning";

describe("summarizeWarningPayload", () => {
  it("発表中の警報(code先頭0)を warning レベルとして拾う", () => {
    const payload: JmaWarningPayload = {
      reportDatetime: "2026-07-02T10:00:00+09:00",
      headlineText: "東京地方に大雨警報",
      publishingOffice: "気象庁",
      areaTypes: [
        {
          areas: [
            { code: "130010", warnings: [{ code: "03", status: "発表" }] },
          ],
        },
      ],
    };
    const summary = summarizeWarningPayload(payload);
    expect(summary.level).toBe("warning");
    expect(summary.headline).toBe("東京地方に大雨警報");
    expect(summary.warnings).toEqual([
      { areaCode: "130010", code: "03", status: "発表", level: "warning" },
    ]);
  });

  it("解除・なし は非アクティブとして除外し level は none", () => {
    const payload: JmaWarningPayload = {
      areaTypes: [
        {
          areas: [
            { code: "130010", warnings: [{ code: "03", status: "解除" }, { code: "14", status: "なし" }] },
          ],
        },
      ],
    };
    const summary = summarizeWarningPayload(payload);
    expect(summary.level).toBe("none");
    expect(summary.warnings).toEqual([]);
  });

  it("注意報(code先頭1/2)と警報が混在する場合は最大レベルを採用", () => {
    const payload: JmaWarningPayload = {
      areaTypes: [
        {
          areas: [
            {
              code: "130010",
              warnings: [
                { code: "14", status: "継続" }, // advisory
                { code: "03", status: "発表" }, // warning
              ],
            },
          ],
        },
      ],
    };
    const summary = summarizeWarningPayload(payload);
    expect(summary.level).toBe("warning");
    expect(summary.warnings).toHaveLength(2);
  });

  it("特別警報(code先頭3)は special", () => {
    const payload: JmaWarningPayload = {
      areaTypes: [{ areas: [{ code: "130010", warnings: [{ code: "33", status: "発表" }] }] }],
    };
    expect(summarizeWarningPayload(payload).level).toBe("special");
  });

  it("headlineText が空白のみ・未設定は null", () => {
    expect(summarizeWarningPayload({ areaTypes: [] }).headline).toBeNull();
    expect(summarizeWarningPayload({ headlineText: "   ", areaTypes: [] }).headline).toBeNull();
  });

  it("areaTypes 欠落時も例外にならず none/空配列を返す", () => {
    const summary = summarizeWarningPayload({});
    expect(summary.level).toBe("none");
    expect(summary.warnings).toEqual([]);
    expect(summary.reportDatetime).toBeNull();
    expect(summary.publishingOffice).toBeNull();
  });
});
