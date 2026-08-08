import { describe, expect, it } from "vitest";
import { formatJmaWarning, jmaWarningName } from "./warning-label";

describe("JMA warning label", () => {
  it("実payloadのコード14・状態発表を雷注意報として読める", () => {
    expect(jmaWarningName("14")).toBe("雷注意報");
    expect(formatJmaWarning({ code: "14", status: "発表" })).toBe(
      "雷注意報（発表・コード14）",
    );
  });

  it("未知コードを安全・該当なしへ変換しない", () => {
    expect(jmaWarningName("99")).toContain("名称未確認");
  });
});
