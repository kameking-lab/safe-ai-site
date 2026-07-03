import { describe, it, expect } from "vitest";
import { planBuilderConclusion } from "./plan-builder-conclusion";

describe("planBuilderConclusion", () => {
  it("未生成: 青の指示・案内で生成を促す（責めない色）", () => {
    const c = planBuilderConclusion({ submitted: false });
    expect(c.tone).toBe("info");
    expect(c.settled).toBe(false);
    expect(c.title).toBe("プラン未作成");
    expect(c.action.href).toBe("#plan-form");
  });

  it("submitted でも病態名が無ければ未確定（生成失敗の保険）", () => {
    const c = planBuilderConclusion({ submitted: true, conditionName: null });
    expect(c.tone).toBe("info");
    expect(c.settled).toBe(false);
  });

  it("生成失敗: 黄の警告で入力し直しを促す（未生成の青と区別できる）", () => {
    const c = planBuilderConclusion({
      submitted: true,
      conditionName: null,
      generationFailed: true,
    });
    expect(c.tone).toBe("warning");
    expect(c.settled).toBe(false);
    expect(c.title).toBe("プラン生成に失敗しました");
    expect(c.action.href).toBe("#plan-form");
  });

  it("生成済: 緑の完了・病態名を文言に反映・プランへ誘導", () => {
    const c = planBuilderConclusion({
      submitted: true,
      conditionName: "胃がん（術後）",
    });
    expect(c.tone).toBe("safe");
    expect(c.settled).toBe(true);
    expect(c.title).toBe("プラン作成完了");
    expect(c.description).toContain("胃がん（術後）");
    expect(c.action.href).toBe("#plan-output");
  });
});
