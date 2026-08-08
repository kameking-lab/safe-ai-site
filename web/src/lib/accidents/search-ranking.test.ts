import { describe, expect, it } from "vitest";
import type { AccidentCase } from "@/lib/types/domain";
import { precisionAt, rankAccidents } from "./search-ranking";

function accident(id: string, patch: Partial<AccidentCase>): AccidentCase {
  return {
    id,
    title: "転倒事故",
    occurredOn: "2026-07-01",
    type: "転倒",
    workCategory: "建設業",
    severity: "軽傷",
    summary: "通路で転倒した",
    mainCauses: ["整理不足"],
    preventionPoints: ["通路を整理する"],
    provenance: "curated",
    ...patch,
  };
}

describe("accident search relevance gold set", () => {
  const cases = [
    accident("heat-title", { title: "熱中症による救急搬送", type: "高温・低温の物との接触", summary: "炎天下の屋外作業" }),
    accident("heat-cause", { title: "屋外作業中に意識を失う", mainCauses: ["熱中症", "水分不足"], preventionPoints: ["WBGTを確認"] }),
    accident("unrelated", { title: "階段から墜落", type: "墜落", summary: "足場の昇降中に墜落" }),
    accident("noise", { title: "熱源付近で工具を落下", type: "飛来・落下", summary: "工具が落下した" }),
  ];

  it("ranks directly relevant heatstroke cases above incidental character matches", () => {
    const results = rankAccidents(cases, "熱中症");
    expect(results.map((result) => result.accident.id)).toEqual(["heat-title", "heat-cause"]);
    expect(results[0].matchFields).toContain("タイトル");
    expect(results[1].matchFields).toContain("主な原因");
    expect(precisionAt(results, new Set(["heat-title", "heat-cause"]), 10)).toBe(1);
  });

  it("searches causes and prevention fields and exposes match locations", () => {
    const results = rankAccidents(cases, "WBGT");
    expect(results).toHaveLength(1);
    expect(results[0].accident.id).toBe("heat-cause");
    expect(results[0].matchFields).toEqual(["再発防止"]);
    expect(results[0].matchSnippets[0]).toContain("WBGT");
  });

  it("uses AND semantics across fields for multi-token queries", () => {
    expect(rankAccidents(cases, "屋外 熱中症").map((result) => result.accident.id)).toEqual([
      "heat-cause",
      "heat-title",
    ]);
  });
});
