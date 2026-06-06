import { describe, it, expect } from "vitest";
import { getChemicalKeyPoints, hasKeyPoints } from "./key-points";

const base = {
  ghsHazards: [
    { category: "急性毒性（吸入）", classification: "区分4", signal: "警告" },
    { category: "引火性液体", classification: "区分2", signal: "危険" },
    { category: "生殖毒性", classification: "区分2", signal: "警告" },
    { category: "特定標的臓器毒性", classification: "区分3", signal: "警告" },
  ],
  safetyMeasures: [
    { category: "保護具", action: "有機ガス用防毒マスクを着用する", priority: 3 as const },
    { category: "工学的対策", action: "局所排気装置を設置し換気する", priority: 1 as const },
    { category: "管理的対策", action: "火気を厳禁とする", priority: 2 as const },
  ],
  regulatoryNotes: [
    "有機溶剤中毒予防規則の対象。作業主任者の選任が必要。",
    "リスクアセスメント対象物に該当する。",
  ],
};

describe("getChemicalKeyPoints", () => {
  it("主な危険性は「危険」を先頭に最大3件", () => {
    const kp = getChemicalKeyPoints(base);
    expect(kp.hazards[0]).toEqual({ category: "引火性液体", signal: "危険" });
    expect(kp.hazards).toHaveLength(3);
  });

  it("まず行う対策は優先度順（工学的→管理的→保護具）", () => {
    const kp = getChemicalKeyPoints(base);
    expect(kp.actions[0]).toBe("局所排気装置を設置し換気する");
    expect(kp.actions[1]).toBe("火気を厳禁とする");
    expect(kp.actions[2]).toBe("有機ガス用防毒マスクを着用する");
  });

  it("規制ノートから短縮タグを抽出（有機則・RA義務）", () => {
    const kp = getChemicalKeyPoints(base);
    expect(kp.regulations).toContain("有機則");
    expect(kp.regulations).toContain("安衛法57条の3（RA義務）");
    expect(kp.regulations).not.toContain("特化則");
  });

  it("空データでも落ちず、hasKeyPoints が false", () => {
    const kp = getChemicalKeyPoints({ ghsHazards: [], safetyMeasures: [], regulatoryNotes: [] });
    expect(kp.hazards).toEqual([]);
    expect(kp.actions).toEqual([]);
    expect(kp.regulations).toEqual([]);
    expect(hasKeyPoints(kp)).toBe(false);
  });

  it("いずれか1つでもあれば hasKeyPoints が true", () => {
    expect(hasKeyPoints(getChemicalKeyPoints(base))).toBe(true);
  });
});
