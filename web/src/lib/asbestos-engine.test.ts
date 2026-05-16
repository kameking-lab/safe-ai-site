import { describe, expect, it } from "vitest";
import type { ProjectScope } from "@/types/asbestos";
import {
  buildPreWorkSummary,
  determineInvestigationRequirement,
  determineReportingObligation,
  generateNotificationForms,
  getWorkPlanTemplate,
  listRequiredQualifications,
} from "./asbestos-engine";

const baseScope = (overrides: Partial<ProjectScope> = {}): ProjectScope => ({
  buildingCategory: "non-residential",
  projectCategory: "demolition",
  constructionStartYear: 1995,
  contractValueJpy: 5_000_000,
  workAreaSqm: 200,
  ...overrides,
});

describe("asbestos-engine — investigation requirement", () => {
  it("requires investigation for any pre-2006 demolition", () => {
    const r = determineInvestigationRequirement(baseScope());
    expect(r.investigationRequired).toBe(true);
    expect(r.presumedContaining).toBe(true);
    expect(r.qualifiedInvestigatorRequired).toBe(true);
  });

  it("still requires investigation for post-2006 buildings", () => {
    const r = determineInvestigationRequirement(
      baseScope({ constructionStartYear: 2018 }),
    );
    expect(r.investigationRequired).toBe(true);
    expect(r.presumedContaining).toBe(false);
  });

  it("skips investigation for greenfield new-build", () => {
    const r = determineInvestigationRequirement(
      baseScope({ projectCategory: "new-build", asbestosKnownPresent: false }),
    );
    expect(r.investigationRequired).toBe(false);
  });

  it("flags pre-1975 buildings as high-risk for level-1 sprayed asbestos", () => {
    const r = determineInvestigationRequirement(
      baseScope({ constructionStartYear: 1970 }),
    );
    expect(r.presumedContaining).toBe(true);
    expect(r.rationale).toContain("吹付け");
  });

  it("respects known-asbestos override even for new builds", () => {
    const r = determineInvestigationRequirement(
      baseScope({
        projectCategory: "new-build",
        asbestosKnownPresent: true,
        constructionStartYear: 2024,
      }),
    );
    expect(r.investigationRequired).toBe(true);
    expect(r.presumedContaining).toBe(true);
  });

  it("relaxes qualified-investigator requirement for civil works", () => {
    const r = determineInvestigationRequirement(
      baseScope({ buildingCategory: "civil-engineering" }),
    );
    expect(r.investigationRequired).toBe(true);
    expect(r.qualifiedInvestigatorRequired).toBe(false);
  });
});

describe("asbestos-engine — reporting obligation", () => {
  it("requires both labour & prefecture reports for large demolitions", () => {
    const r = determineReportingObligation(
      baseScope({ workAreaSqm: 150, contractValueJpy: 3_000_000 }),
    );
    expect(r.requirement).toBe("required-anseiho-and-airpollution");
  });

  it("requires labour-only when contract is over threshold but area is small", () => {
    const r = determineReportingObligation(
      baseScope({
        projectCategory: "renovation",
        workAreaSqm: 30,
        contractValueJpy: 2_000_000,
      }),
    );
    // Renovation 100万円以上 → 大防法も対象
    expect(r.requirement).toBe("required-anseiho-and-airpollution");
  });

  it("requires labour-only for demolition under 80m² but over 100万円", () => {
    const r = determineReportingObligation(
      baseScope({
        projectCategory: "demolition",
        workAreaSqm: 50,
        contractValueJpy: 2_000_000,
      }),
    );
    expect(r.requirement).toBe("required-anseiho-only");
  });

  it("requires prefecture-only for large demolition under 100万円", () => {
    const r = determineReportingObligation(
      baseScope({
        projectCategory: "demolition",
        workAreaSqm: 200,
        contractValueJpy: 500_000,
      }),
    );
    expect(r.requirement).toBe("required-airpollution-only");
  });

  it("marks small jobs as investigation-only (no reporting)", () => {
    const r = determineReportingObligation(
      baseScope({
        projectCategory: "maintenance",
        workAreaSqm: 10,
        contractValueJpy: 200_000,
      }),
    );
    expect(r.requirement).toBe("investigation-only");
  });

  it("flags greenfield new-build as out of scope", () => {
    const r = determineReportingObligation(
      baseScope({ projectCategory: "new-build", asbestosKnownPresent: false }),
    );
    expect(r.requirement).toBe("out-of-scope");
  });
});

describe("asbestos-engine — notification forms", () => {
  it("includes level-1 plan notification for level-1 work", () => {
    const forms = generateNotificationForms(baseScope(), "level-1");
    expect(forms.find((f) => f.id === "work-notification-level-1-2")).toBeDefined();
    expect(forms.find((f) => f.id === "specified-work-notification")).toBeDefined();
    expect(forms.find((f) => f.id === "air-monitoring-record")).toBeDefined();
  });

  it("omits level-1 forms for level-3 work", () => {
    const forms = generateNotificationForms(baseScope(), "level-3");
    expect(forms.find((f) => f.id === "work-notification-level-1-2")).toBeUndefined();
    expect(forms.find((f) => f.id === "specified-work-notification")).toBeUndefined();
  });

  it("always emits on-site display & investigation record", () => {
    const forms = generateNotificationForms(baseScope(), "level-3");
    expect(forms.find((f) => f.id === "onsite-display")).toBeDefined();
    expect(forms.find((f) => f.id === "investigation-record")).toBeDefined();
  });
});

describe("asbestos-engine — work-plan templates", () => {
  it("returns a non-empty template for each level", () => {
    for (const level of ["level-1", "level-2", "level-3"] as const) {
      const plan = getWorkPlanTemplate(level);
      expect(plan.level).toBe(level);
      expect(plan.sections.length).toBeGreaterThan(0);
      expect(plan.ppe.length).toBeGreaterThan(0);
      expect(plan.lawReferences.length).toBeGreaterThan(0);
    }
  });

  it("requires PAPR or equivalent for level-1", () => {
    const plan = getWorkPlanTemplate("level-1");
    expect(plan.ppe.join("\n")).toContain("PAPR");
  });
});

describe("asbestos-engine — required qualifications", () => {
  it("always includes chief supervisor & special education", () => {
    const quals = listRequiredQualifications(null);
    expect(quals.find((q) => q.id === "chief-supervisor")).toBeDefined();
    expect(quals.find((q) => q.id === "special-education")).toBeDefined();
  });

  it("includes qualified investigator for all levels", () => {
    const quals = listRequiredQualifications("level-3");
    expect(quals.find((q) => q.id === "qualified-investigator")).toBeDefined();
  });

  it("omits analyst for level-3 work", () => {
    const quals = listRequiredQualifications("level-3");
    expect(quals.find((q) => q.id === "analyst")).toBeUndefined();
  });

  it("surfaces analyst for level-1 / level-2", () => {
    expect(listRequiredQualifications("level-1").find((q) => q.id === "analyst")).toBeDefined();
    expect(listRequiredQualifications("level-2").find((q) => q.id === "analyst")).toBeDefined();
  });
});

describe("asbestos-engine — buildPreWorkSummary", () => {
  it("combines all four sub-decisions", () => {
    const summary = buildPreWorkSummary(
      baseScope({ constructionStartYear: 1985 }),
      "level-1",
    );
    expect(summary.investigation.investigationRequired).toBe(true);
    expect(summary.reporting.requirement).toBe("required-anseiho-and-airpollution");
    expect(summary.forms.length).toBeGreaterThan(4);
    expect(summary.qualifications.length).toBeGreaterThanOrEqual(3);
  });
});
