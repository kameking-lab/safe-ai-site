import { describe, it, expect } from "vitest";
import { deriveDangerAlertInput } from "./danger-alert-source";
import type { JmaWarningsByIso, JmaWarningEntry } from "@/lib/jma/jma-data";

function entry(partial: Partial<JmaWarningEntry>): JmaWarningEntry {
  return {
    sourceCode: "000000",
    level: "none",
    headline: null,
    reportDatetime: null,
    publishingOffice: null,
    warnings: [],
    ...partial,
  };
}

describe("deriveDangerAlertInput", () => {
  it("byIso が undefined なら空", () => {
    expect(deriveDangerAlertInput(undefined)).toEqual({ jmaHeadline: null, warnings: [] });
  });

  it("注意報のみは高リスク扱いしない（誤発動防止）", () => {
    const byIso: JmaWarningsByIso = {
      "JP-13": {
        level: "advisory",
        entries: [
          entry({
            level: "advisory",
            headline: "東京都に大雨注意報が発表されています",
            warnings: [{ areaCode: "1310100", code: "10", status: "大雨注意報", level: "advisory" }],
          }),
        ],
      },
    };
    expect(deriveDangerAlertInput(byIso)).toEqual({ jmaHeadline: null, warnings: [] });
  });

  it("警報レベルの個別警報を {code,status} で抽出しヘッドラインを採用", () => {
    const byIso: JmaWarningsByIso = {
      "JP-13": {
        level: "warning",
        entries: [
          entry({
            level: "warning",
            headline: "東京都に大雨警報が発表されています",
            warnings: [
              { areaCode: "1310100", code: "03", status: "大雨警報", level: "warning" },
              { areaCode: "1310100", code: "10", status: "雷注意報", level: "advisory" },
            ],
          }),
        ],
      },
    };
    const result = deriveDangerAlertInput(byIso);
    expect(result.jmaHeadline).toBe("東京都に大雨警報が発表されています");
    expect(result.warnings).toEqual([{ code: "03", status: "大雨警報" }]);
  });

  it("特別警報のヘッドラインを警報より優先する", () => {
    const byIso: JmaWarningsByIso = {
      "JP-13": {
        level: "warning",
        entries: [
          entry({
            level: "warning",
            headline: "大雨警報",
            warnings: [{ areaCode: "a", code: "03", status: "大雨警報", level: "warning" }],
          }),
        ],
      },
      "JP-14": {
        level: "special",
        entries: [
          entry({
            level: "special",
            headline: "大雨特別警報",
            warnings: [{ areaCode: "b", code: "33", status: "大雨特別警報", level: "special" }],
          }),
        ],
      },
    };
    expect(deriveDangerAlertInput(byIso).jmaHeadline).toBe("大雨特別警報");
  });

  it("同一 code|status は重複排除する", () => {
    const byIso: JmaWarningsByIso = {
      "JP-13": {
        level: "warning",
        entries: [
          entry({
            level: "warning",
            warnings: [{ areaCode: "a", code: "03", status: "大雨警報", level: "warning" }],
          }),
          entry({
            level: "warning",
            warnings: [{ areaCode: "b", code: "03", status: "大雨警報", level: "warning" }],
          }),
        ],
      },
    };
    expect(deriveDangerAlertInput(byIso).warnings).toEqual([{ code: "03", status: "大雨警報" }]);
  });

  it("個別warnings配列が空でも警報レベルのヘッドラインは採用する", () => {
    const byIso: JmaWarningsByIso = {
      "JP-13": {
        level: "warning",
        entries: [entry({ level: "warning", headline: "暴風警報", warnings: [] })],
      },
    };
    const result = deriveDangerAlertInput(byIso);
    expect(result.jmaHeadline).toBe("暴風警報");
    expect(result.warnings).toEqual([]);
  });

  it("status が null の警報項目は無視する", () => {
    const byIso: JmaWarningsByIso = {
      "JP-13": {
        level: "warning",
        entries: [
          entry({
            level: "warning",
            warnings: [{ areaCode: "a", code: "03", status: null, level: "warning" }],
          }),
        ],
      },
    };
    expect(deriveDangerAlertInput(byIso).warnings).toEqual([]);
  });
});
