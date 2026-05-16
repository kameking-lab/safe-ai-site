import { describe, expect, it } from "vitest";
import { SAFETY_PLAN_TEMPLATES } from "@/data/safety-plan-templates";
import { generatePlan, regenerateFromTemplateId } from "./safety-plan-generator";

describe("safety-plan-generator", () => {
  it("ships 30 templates (10 industries × 3 scales)", () => {
    expect(SAFETY_PLAN_TEMPLATES).toHaveLength(30);
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
});
