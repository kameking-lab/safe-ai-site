import { describe, expect, it } from "vitest";
import { buildGhsHazardsFromNite, severestCategoryNumber } from "./nite-ghs-hazards";
import { findByCas } from "@/lib/mhlw-chemicals";

// NITE政府版GHS分類 → GhsHazard 変換（AI不通フォールバック強化）の回帰ガード。
// 注意喚起語はGHS標準割当（JIS Z 7253）に基づく。区分の値はNITEデータそのまま。

describe("severestCategoryNumber", () => {
  it("複数区分は最も重い（小さい）番号を取る", () => {
    expect(severestCategoryNumber("区分1（中枢神経系）、区分3（気道刺激性）")).toBe(1);
    expect(severestCategoryNumber("区分2B")).toBe(2);
    expect(severestCategoryNumber("区分１Ａ")).toBe(1);
    expect(severestCategoryNumber("分類できない")).toBeNull();
  });
});

describe("buildGhsHazardsFromNite", () => {
  it("発がん性区分1A=危険 / 皮膚刺激区分2=警告（GHS標準割当）", () => {
    const hazards = buildGhsHazardsFromNite({
      carcinogen: "区分1A",
      skinCorrIrr: "区分2",
    });
    expect(hazards).toEqual([
      { category: "発がん性", classification: "区分1A", signal: "危険" },
      { category: "皮膚腐食性・刺激性", classification: "区分2", signal: "警告" },
    ]);
  });

  it("呼吸器感作性=常に危険 / 皮膚感作性=常に警告", () => {
    const hazards = buildGhsHazardsFromNite({ respSens: "区分1", skinSens: "区分1" });
    expect(hazards.find((h) => h.category === "呼吸器感作性")?.signal).toBe("危険");
    expect(hazards.find((h) => h.category === "皮膚感作性")?.signal).toBe("警告");
  });

  it("「分類できない」「区分に該当しない」は採用しない", () => {
    expect(
      buildGhsHazardsFromNite({ carcinogen: "分類できない", mutagen: "区分に該当しない" }),
    ).toEqual([]);
    expect(buildGhsHazardsFromNite(undefined)).toEqual([]);
    expect(buildGhsHazardsFromNite(null)).toEqual([]);
  });

  it("危険が警告より先に並ぶ（結論カードの重み付けと一致）", () => {
    const hazards = buildGhsHazardsFromNite({
      skinCorrIrr: "区分2", // 警告
      stotRepeat: "区分1（中枢神経系）", // 危険
    });
    expect(hazards[0].signal).toBe("危険");
  });

  it("実データ: トルエン（108-88-3）から危険シグナル付きハザードが得られる", () => {
    const toluene = findByCas("108-88-3");
    const hazards = buildGhsHazardsFromNite(toluene?.details?.limits?.niteGhsClassifications);
    expect(hazards.length).toBeGreaterThan(0);
    expect(hazards.some((h) => h.signal === "危険")).toBe(true);
    // 生殖毒性 区分1A（NITE収録値）が含まれ、危険の割当
    const repro = hazards.find((h) => h.category === "生殖毒性");
    expect(repro?.signal).toBe("危険");
  });
});
