import { describe, expect, it } from "vitest";
import { buildPreWorkSummary } from "./asbestos-engine";
import { computeAsbestosConclusion } from "./asbestos-conclusion";
import type { ProjectScope } from "@/types/asbestos";

/**
 * エンジン（asbestos-engine・テスト済）の実出力に対して、義務件数と
 * 色トーンの割当が安定していることを固定する。法令判定そのものの正しさは
 * asbestos-engine.test.ts が担保 — ここは「結論カードの文法」だけを見る。
 */

const DEMOLITION_LARGE: ProjectScope = {
  buildingCategory: "non-residential",
  projectCategory: "demolition",
  constructionStartYear: 1995,
  contractValueJpy: 3_000_000,
  workAreaSqm: 120,
};

const NEW_BUILD: ProjectScope = {
  buildingCategory: "non-residential",
  projectCategory: "new-build",
  constructionStartYear: 2024,
};

describe("computeAsbestosConclusion", () => {
  it("解体・1995年・300万円・120m² → 4義務すべて（事前調査+調査者資格+労基署+自治体）で青", () => {
    const c = computeAsbestosConclusion(buildPreWorkSummary(DEMOLITION_LARGE));
    expect(c.tone).toBe("info");
    expect(c.count).toBe(4);
    expect(c.duties.map((d) => d.id)).toEqual([
      "investigation",
      "investigator",
      "report-rodo",
      "report-taibo",
    ]);
    expect(c.title).toBe("やること");
  });

  it("新築 → 義務0件で緑（対応不要）", () => {
    const c = computeAsbestosConclusion(buildPreWorkSummary(NEW_BUILD));
    expect(c.tone).toBe("safe");
    expect(c.count).toBe(0);
    expect(c.duties).toEqual([]);
    expect(c.title).toBe("対応不要");
  });

  it("count は duties の件数と常に一致する", () => {
    for (const scope of [DEMOLITION_LARGE, NEW_BUILD]) {
      const c = computeAsbestosConclusion(buildPreWorkSummary(scope));
      expect(c.count).toBe(c.duties.length);
    }
  });

  it("報告義務の区分に応じて報告チップが増減する（労基署のみ＝解体100万円以上・80m²未満）", () => {
    const c = computeAsbestosConclusion(
      buildPreWorkSummary({
        buildingCategory: "non-residential",
        projectCategory: "demolition",
        constructionStartYear: 1990,
        contractValueJpy: 1_500_000,
        workAreaSqm: 30,
      }),
    );
    const ids = c.duties.map((d) => d.id);
    expect(ids).toContain("report-rodo");
    expect(ids).not.toContain("report-taibo");
    expect(c.tone).toBe("info");
  });

  it("報告対象外の小規模改修 → 事前調査系のみ青で残る（調査義務は消えない）", () => {
    const c = computeAsbestosConclusion(
      buildPreWorkSummary({
        buildingCategory: "residential-detached",
        projectCategory: "renovation",
        constructionStartYear: 1990,
        contractValueJpy: 500_000,
        workAreaSqm: 10,
      }),
    );
    expect(c.tone).toBe("info");
    expect(c.duties.map((d) => d.id)).toContain("investigation");
    expect(c.duties.map((d) => d.id)).not.toContain("report-rodo");
    expect(c.duties.map((d) => d.id)).not.toContain("report-taibo");
  });

  it("調査者資格は事前調査義務がある場合のみ数える", () => {
    const newBuild = computeAsbestosConclusion(buildPreWorkSummary(NEW_BUILD));
    expect(newBuild.duties.map((d) => d.id)).not.toContain("investigator");
  });
});
