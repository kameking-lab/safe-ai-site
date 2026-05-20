import { describe, expect, it } from "vitest";
import { SAFETY_PLAN_TEMPLATES } from "@/data/safety-plan-templates";
import { generatePlan, regenerateFromTemplateId } from "./safety-plan-generator";

describe("safety-plan-generator", () => {
  it("ships 39 templates (13 industries × 3 scales)", () => {
    expect(SAFETY_PLAN_TEMPLATES).toHaveLength(39);
  });

  it("each template has 12 monthly schedule entries", () => {
    for (const t of SAFETY_PLAN_TEMPLATES) {
      expect(t.monthlySchedule).toHaveLength(12);
      const months = t.monthlySchedule.map((m) => m.month).sort((a, b) => a - b);
      expect(months).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    }
  });

  it("each template has at least 5 goals and 5 measures", () => {
    for (const t of SAFETY_PLAN_TEMPLATES) {
      expect(t.goals.length).toBeGreaterThanOrEqual(5);
      expect(t.measures.length).toBeGreaterThanOrEqual(5);
    }
  });

  it("each template cites at least one law and one circular", () => {
    for (const t of SAFETY_PLAN_TEMPLATES) {
      expect(t.relatedLaws.length).toBeGreaterThan(0);
      expect(t.relatedCirculars.length).toBeGreaterThan(0);
    }
  });

  it("scale variants produce distinguishable templates (distinct goal/measure titles)", () => {
    for (const industry of [
      "construction",
      "manufacturing",
      "transportation",
      "medical",
      "service",
      "retail",
      "food",
      "wholesale",
      "warehouse",
      "office",
      "agriculture",
      "forestry",
      "fishery",
    ] as const) {
      const small = SAFETY_PLAN_TEMPLATES.find(
        (t) => t.industry === industry && t.scale === "small",
      )!;
      const medium = SAFETY_PLAN_TEMPLATES.find(
        (t) => t.industry === industry && t.scale === "medium",
      )!;
      const large = SAFETY_PLAN_TEMPLATES.find(
        (t) => t.industry === industry && t.scale === "large",
      )!;
      // Each scale tier must have at least one goal or measure title that the
      // other tiers do not, proving the overlays actually distinguish them.
      const titles = (t: typeof small) => [
        ...t.goals.map((g) => `goal:${g.title}`),
        ...t.measures.map((m) => `measure:${m.title}`),
      ];
      const small_t = new Set(titles(small));
      const medium_t = new Set(titles(medium));
      const large_t = new Set(titles(large));
      expect([...small_t].some((x) => !medium_t.has(x))).toBe(true);
      expect([...medium_t].some((x) => !small_t.has(x))).toBe(true);
      expect([...large_t].some((x) => !medium_t.has(x))).toBe(true);
    }
  });

  it("scale-specific law references differ across small/medium/large", () => {
    const t1 = SAFETY_PLAN_TEMPLATES.find(
      (t) => t.industry === "office" && t.scale === "small",
    )!;
    const t2 = SAFETY_PLAN_TEMPLATES.find(
      (t) => t.industry === "office" && t.scale === "medium",
    )!;
    const t3 = SAFETY_PLAN_TEMPLATES.find(
      (t) => t.industry === "office" && t.scale === "large",
    )!;
    const names1 = t1.relatedLaws.map((l) => l.name);
    const names2 = t2.relatedLaws.map((l) => l.name);
    const names3 = t3.relatedLaws.map((l) => l.name);
    expect(names1).not.toEqual(names2);
    expect(names2).not.toEqual(names3);
  });

  it("generatePlan returns a plan when inputs are valid", () => {
    const r = generatePlan({
      industry: "construction",
      scale: "medium",
      organizationName: "サンプル建設株式会社",
      fiscalYear: 2026,
      focusAreas: ["industry-specific", "education"],
      customGoals: [],
      notes: "",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.plan.template.industry).toBe("construction");
    expect(r.plan.template.scale).toBe("medium");
    // Focus areas float to the head, preserving their internal order; the
    // first head item must be in the focus set.
    const focusSet = new Set<string>(["industry-specific", "education"]);
    expect(focusSet.has(r.plan.template.measures[0].category)).toBe(true);
    // No non-focused measure should appear before a focused one.
    const firstNonFocused = r.plan.template.measures.findIndex(
      (m) => !focusSet.has(m.category),
    );
    const lastFocused = r.plan.template.measures
      .map((m) => focusSet.has(m.category))
      .lastIndexOf(true);
    expect(firstNonFocused).toBeGreaterThan(lastFocused);
  });

  it("monthly schedule starts at April (Japan fiscal year)", () => {
    const r = generatePlan({
      industry: "office",
      scale: "small",
      organizationName: "テスト",
      fiscalYear: 2026,
      focusAreas: [],
      customGoals: [],
      notes: "",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.plan.template.monthlySchedule[0].month).toBe(4);
    expect(r.plan.template.monthlySchedule[11].month).toBe(3);
  });

  it("regenerateFromTemplateId reproduces the same template", () => {
    const r = regenerateFromTemplateId({
      templateId: "manufacturing-large",
      fiscalYear: 2026,
      organizationName: "メーカー",
      focusAreas: [],
      customGoals: [],
      notes: "",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.plan.template.id).toBe("manufacturing-large");
  });

  it("fails gracefully on unknown template id", () => {
    const r = regenerateFromTemplateId({
      templateId: "construction-xxlarge",
      fiscalYear: 2026,
      organizationName: "x",
      focusAreas: [],
      customGoals: [],
      notes: "",
    });
    expect(r.ok).toBe(false);
  });

  it("specialWork param adds matching goals and measures", () => {
    const base = generatePlan({
      industry: "office",
      scale: "medium",
      organizationName: "テスト",
      fiscalYear: 2026,
      focusAreas: [],
      customGoals: [],
      notes: "",
    });
    const withSpecial = generatePlan({
      industry: "office",
      scale: "medium",
      organizationName: "テスト",
      fiscalYear: 2026,
      focusAreas: [],
      customGoals: [],
      notes: "",
      specialWork: ["noise", "high-place"],
    });
    expect(base.ok).toBe(true);
    expect(withSpecial.ok).toBe(true);
    if (!base.ok || !withSpecial.ok) return;
    expect(withSpecial.plan.template.measures.length).toBeGreaterThan(
      base.plan.template.measures.length,
    );
    const titles = withSpecial.plan.template.measures.map((m) => m.title);
    expect(titles.some((t) => t.includes("墜落制止用器具") || t.includes("フルハーネス"))).toBe(true);
    expect(titles.some((t) => t.includes("騒音"))).toBe(true);
  });

  it("hasOverseasAssignment adds overseas-related measures", () => {
    const r = generatePlan({
      industry: "office",
      scale: "medium",
      organizationName: "テスト",
      fiscalYear: 2026,
      focusAreas: [],
      customGoals: [],
      notes: "",
      hasOverseasAssignment: true,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const titles = r.plan.template.measures.map((m) => m.title);
    expect(titles.some((t) => t.includes("海外"))).toBe(true);
  });

  it("overworkPriority=high adds dedicated overwork measure", () => {
    const r = generatePlan({
      industry: "office",
      scale: "medium",
      organizationName: "テスト",
      fiscalYear: 2026,
      focusAreas: [],
      customGoals: [],
      notes: "",
      overworkPriority: "high",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const titles = r.plan.template.measures.map((m) => m.title);
    expect(titles.some((t) => t.includes("長時間労働") || t.includes("過重労働"))).toBe(true);
  });

  it("monthly schedule never duplicates an event title within the same month", () => {
    for (const t of SAFETY_PLAN_TEMPLATES) {
      for (const entry of t.monthlySchedule) {
        const keys = entry.events.map((e) => `${e.category}::${e.title}`);
        const unique = new Set(keys);
        expect(unique.size).toBe(keys.length);
      }
    }
  });

  it("every fiscal year contains at least one drill (emergency-response coverage)", () => {
    for (const t of SAFETY_PLAN_TEMPLATES) {
      const drills = t.monthlySchedule.flatMap((m) =>
        m.events.filter((e) => e.category === "drill"),
      );
      expect(drills.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("agriculture template surfaces tractor / heat-stroke / pesticide measures", () => {
    const r = generatePlan({
      industry: "agriculture",
      scale: "medium",
      organizationName: "サンプル農場",
      fiscalYear: 2026,
      focusAreas: [],
      customGoals: [],
      notes: "",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const titles = r.plan.template.measures.map((m) => m.title).join("\n");
    expect(titles).toMatch(/トラクター|農業機械/);
    expect(titles).toMatch(/熱中症|WBGT/);
    expect(titles).toMatch(/農薬/);
  });

  it("forestry template requires chainsaw special education and hangup procedure", () => {
    const r = generatePlan({
      industry: "forestry",
      scale: "small",
      organizationName: "サンプル林業",
      fiscalYear: 2026,
      focusAreas: [],
      customGoals: [],
      notes: "",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const titles = r.plan.template.measures.map((m) => m.title).join("\n");
    expect(titles).toMatch(/チェーンソー/);
    expect(titles).toMatch(/かかり木|防護衣/);
  });

  it("fishery template surfaces life-jacket and weather-judgement measures", () => {
    const r = generatePlan({
      industry: "fishery",
      scale: "medium",
      organizationName: "サンプル水産",
      fiscalYear: 2026,
      focusAreas: [],
      customGoals: [],
      notes: "",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const titles = r.plan.template.measures.map((m) => m.title).join("\n");
    expect(titles).toMatch(/救命胴衣|ライフジャケット/);
    expect(titles).toMatch(/気象|海象/);
  });
});
