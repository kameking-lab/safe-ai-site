import { describe, expect, it } from "vitest";
import {
  HARASSMENT_LINKAGES,
  INTERVIEW_FLOW_STEPS,
  PHYSICIAN_OPINION_TEMPLATE,
  SMALL_BUSINESS_STEPS,
  STRESS_CHECK_REQUIREMENTS,
  STRESS_CHECK_PROCEDURE,
  getMandatoryRequirements,
  getEffortDutyRequirements,
  getLinkageByType,
} from ".";
import {
  obligationTierFromHeadcount,
  sizeBucketFromHeadcount,
} from "@/types/mental-health";

describe("mental-health-rules", () => {
  it("ships at least 11 baseline stress-check requirements", () => {
    const baseline = STRESS_CHECK_REQUIREMENTS.filter((r) => r.baseline);
    expect(baseline.length).toBeGreaterThanOrEqual(11);
  });

  it("every stress-check requirement cites at least one rule article", () => {
    for (const r of STRESS_CHECK_REQUIREMENTS) {
      expect(r.ruleArticles.length, r.id).toBeGreaterThanOrEqual(1);
    }
  });

  it("mandatory tier includes inspection-office reporting; effort-duty does not", () => {
    const mandatory = new Set(getMandatoryRequirements().map((r) => r.id));
    const effort = new Set(getEffortDutyRequirements().map((r) => r.id));
    expect(mandatory.has("lsi-report")).toBe(true);
    expect(effort.has("lsi-report")).toBe(false);
  });

  it("small-business track has 7+ sequenced steps with deadlines", () => {
    expect(SMALL_BUSINESS_STEPS.length).toBeGreaterThanOrEqual(7);
    for (let i = 1; i < SMALL_BUSINESS_STEPS.length; i++) {
      // estimatedDays should be monotonically non-decreasing
      expect(
        SMALL_BUSINESS_STEPS[i].estimatedDays >= SMALL_BUSINESS_STEPS[i - 1].estimatedDays,
        `step ${i}`,
      ).toBe(true);
    }
  });

  it("procedure covers every baseline requirement so no obligation is dropped", () => {
    const covered = new Set(
      STRESS_CHECK_PROCEDURE.flatMap((s) => s.relatedRequirementIds),
    );
    for (const r of STRESS_CHECK_REQUIREMENTS.filter((r) => r.baseline)) {
      expect(covered.has(r.id), `requirement ${r.id} missing from procedure`).toBe(
        true,
      );
    }
  });

  it("procedure phases run in chronological order", () => {
    const order = ["準備期", "実施期", "事後対応期", "報告・保存期"];
    const idxs = STRESS_CHECK_PROCEDURE.map((s) => order.indexOf(s.phase));
    expect(idxs.every((i) => i >= 0)).toBe(true);
    for (let i = 1; i < idxs.length; i++) {
      expect(idxs[i] >= idxs[i - 1], `step ${i} phase out of order`).toBe(true);
    }
  });

  it("only the labour-inspection report step is mandatory-only", () => {
    const mandatoryOnly = STRESS_CHECK_PROCEDURE.filter((s) => s.mandatoryOnly);
    expect(mandatoryOnly.length).toBe(1);
    expect(mandatoryOnly[0].relatedRequirementIds).toContain("lsi-report");
  });

  it("interview-flow steps are sequenced and end with follow-up review", () => {
    expect(INTERVIEW_FLOW_STEPS.length).toBeGreaterThanOrEqual(7);
    for (let i = 0; i < INTERVIEW_FLOW_STEPS.length; i++) {
      expect(INTERVIEW_FLOW_STEPS[i].no).toBe(i + 1);
    }
    const last = INTERVIEW_FLOW_STEPS[INTERVIEW_FLOW_STEPS.length - 1];
    expect(last.title).toMatch(/見直し|経過/);
  });

  it("physician opinion template lists fitness assessment and recommended measures", () => {
    expect(PHYSICIAN_OPINION_TEMPLATE.fitnessAssessment.length).toBeGreaterThanOrEqual(2);
    expect(PHYSICIAN_OPINION_TEMPLATE.recommendedMeasures.length).toBeGreaterThanOrEqual(3);
  });

  it("harassment linkages cover four harassment types", () => {
    const types = new Set(HARASSMENT_LINKAGES.map((l) => l.type));
    expect(types.has("power")).toBe(true);
    expect(types.has("sexual")).toBe(true);
    expect(types.has("maternity")).toBe(true);
    expect(types.has("customer")).toBe(true);
  });

  it("getLinkageByType returns linkage when present, undefined otherwise", () => {
    expect(getLinkageByType("power")).toBeDefined();
    // @ts-expect-error — unknown type passed deliberately
    expect(getLinkageByType("unknown")).toBeUndefined();
  });
});

describe("obligation classification helpers", () => {
  it("treats 50+ headcount as mandatory tier", () => {
    expect(obligationTierFromHeadcount(50)).toBe("mandatory");
    expect(obligationTierFromHeadcount(51)).toBe("mandatory");
    expect(obligationTierFromHeadcount(1000)).toBe("mandatory");
  });

  it("treats sub-50 headcount as effort-duty tier", () => {
    expect(obligationTierFromHeadcount(49)).toBe("effort-duty");
    expect(obligationTierFromHeadcount(10)).toBe("effort-duty");
    expect(obligationTierFromHeadcount(1)).toBe("effort-duty");
  });

  it("buckets workplace size", () => {
    expect(sizeBucketFromHeadcount(5)).toBe("under-10");
    expect(sizeBucketFromHeadcount(30)).toBe("10-49");
    expect(sizeBucketFromHeadcount(80)).toBe("50-99");
    expect(sizeBucketFromHeadcount(200)).toBe("100-299");
    expect(sizeBucketFromHeadcount(1000)).toBe("300-plus");
  });
});
