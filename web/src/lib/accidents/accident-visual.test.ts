import { describe, expect, it } from "vitest";
import {
  SEVERITY_VISUAL,
  accidentTypeHref,
  computeAccidentTypeCounts,
} from "./accident-visual";

describe("SEVERITY_VISUAL（重篤度の色文法）", () => {
  it("死亡＝赤solid（停止級・最も重い表示）", () => {
    expect(SEVERITY_VISUAL["死亡"]).toEqual({ tone: "danger", variant: "solid" });
  });

  it("重傷＝赤soft / 中等傷＝黄soft / 軽傷＝グレーsoft", () => {
    expect(SEVERITY_VISUAL["重傷"]).toEqual({ tone: "danger", variant: "soft" });
    expect(SEVERITY_VISUAL["中等傷"]).toEqual({ tone: "warning", variant: "soft" });
    expect(SEVERITY_VISUAL["軽傷"]).toEqual({ tone: "neutral", variant: "soft" });
  });

  it("負傷に緑（safe）は使わない — 軽傷でも「安全・OK」ではない", () => {
    for (const v of Object.values(SEVERITY_VISUAL)) {
      expect(v.tone).not.toBe("safe");
    }
  });
});

describe("computeAccidentTypeCounts", () => {
  it("型ごとに件数を集計し、件数降順で返す", () => {
    const cases = [
      { type: "転倒" as const },
      { type: "墜落" as const },
      { type: "転倒" as const },
      { type: "転倒" as const },
      { type: "感電" as const },
    ];
    expect(computeAccidentTypeCounts(cases)).toEqual([
      { type: "転倒", count: 3 },
      { type: "墜落", count: 1 },
      { type: "感電", count: 1 },
    ]);
  });

  it("0件の型は出さない・空入力は空配列", () => {
    expect(computeAccidentTypeCounts([])).toEqual([]);
  });

  it("同数の型は公式並び順（ALL_ACCIDENT_TYPES）を保つ", () => {
    const cases = [{ type: "感電" as const }, { type: "墜落" as const }];
    expect(computeAccidentTypeCounts(cases).map((c) => c.type)).toEqual(["墜落", "感電"]);
  });
});

describe("accidentTypeHref", () => {
  it("tab=list と acc_type を付けて結果アンカーへ直行する", () => {
    const href = accidentTypeHref("はさまれ・巻き込まれ");
    expect(href).toContain("tab=list");
    expect(href).toContain(`acc_type=${encodeURIComponent("はさまれ・巻き込まれ")}`);
    expect(href.endsWith("#accident-results")).toBe(true);
  });
});
