import { describe, expect, it } from "vitest";
import {
  assessReadiness,
  determineRequiredAction,
  readinessGuidance,
  READINESS_QUESTIONS,
} from "./mental-health-flow";
import { STRESS_CHECK_REQUIREMENTS } from "@/data/mental-health-rules";

describe("mental-health-flow", () => {
  describe("determineRequiredAction", () => {
    it("ships at least the 11 baseline stress-check requirements", () => {
      const baseline = STRESS_CHECK_REQUIREMENTS.filter((r) => r.baseline);
      expect(baseline.length).toBeGreaterThanOrEqual(11);
    });

    it("flags 50+ workplaces as the mandatory tier", () => {
      const out = determineRequiredAction({
        headcount: 60,
        stressCheckResult: "low-stress",
        interviewRequest: "pending",
        jobClass: "office",
      });
      expect(out.obligationTier).toBe("mandatory");
      // mandatory tier includes the labour-inspection reporting requirement
      const ids = new Set(out.requirements.map((r) => r.id));
      expect(ids.has("lsi-report")).toBe(true);
    });

    it("flags sub-50 workplaces as the effort-duty tier and exposes small-business steps", () => {
      const out = determineRequiredAction({
        headcount: 30,
        stressCheckResult: "low-stress",
        interviewRequest: "pending",
        jobClass: "service",
      });
      expect(out.obligationTier).toBe("effort-duty");
      // effort-duty requirements should NOT include the inspection-office reporting
      const ids = new Set(out.requirements.map((r) => r.id));
      expect(ids.has("lsi-report")).toBe(false);
      // small-business roll-out steps are exposed only for effort-duty workplaces
      expect(out.smallBusinessSteps).not.toBeNull();
      expect((out.smallBusinessSteps ?? []).length).toBeGreaterThanOrEqual(5);
    });

    it("does not expose small-business steps for the mandatory tier", () => {
      const out = determineRequiredAction({
        headcount: 200,
        stressCheckResult: "high-stress",
        interviewRequest: "filed",
        jobClass: "driving",
      });
      expect(out.smallBusinessSteps).toBeNull();
    });

    it("recommends no restriction for a low-stress worker", () => {
      const out = determineRequiredAction({
        headcount: 100,
        stressCheckResult: "low-stress",
        interviewRequest: "pending",
        jobClass: "office",
      });
      expect(out.requiredAction.adjustmentLevel).toBe("no-restriction");
      expect(out.remainingFlow).toEqual([]);
    });

    it("advances the interview flow when a high-stress worker files a request", () => {
      const out = determineRequiredAction({
        headcount: 80,
        stressCheckResult: "high-stress",
        interviewRequest: "filed",
        jobClass: "shift-work",
      });
      expect(out.requiredAction.title).toContain("医師面接");
      expect(out.requiredAction.deadlineDays).toBe(30);
      // filed request → remaining flow starts at step 3 (physician scheduling)
      expect(out.remainingFlow[0]?.no).toBe(3);
    });

    it("provides job-class-specific work-restriction overlay", () => {
      const driving = determineRequiredAction({
        headcount: 80,
        stressCheckResult: "high-stress",
        interviewRequest: "filed",
        jobClass: "driving",
      });
      expect(driving.jobClassOverlay.some((s) => s.includes("運転"))).toBe(true);

      const healthcare = determineRequiredAction({
        headcount: 80,
        stressCheckResult: "high-stress",
        interviewRequest: "filed",
        jobClass: "healthcare",
      });
      expect(healthcare.jobClassOverlay.some((s) => s.includes("夜勤"))).toBe(
        true,
      );
    });

    it("includes a disclaimer that clinical judgement remains with the physician", () => {
      const out = determineRequiredAction({
        headcount: 100,
        stressCheckResult: "high-stress",
        interviewRequest: "filed",
        jobClass: "office",
      });
      expect(out.disclaimer).toContain("医師");
    });
  });

  describe("assessReadiness", () => {
    const allYes = () =>
      Object.fromEntries(READINESS_QUESTIONS.map((q) => [q.id, true]));
    const allNo = () =>
      Object.fromEntries(READINESS_QUESTIONS.map((q) => [q.id, false]));

    it("returns ready verdict when all questions are yes", () => {
      const r = assessReadiness({ headcount: 100, answers: allYes() });
      expect(r.verdict).toBe("ready");
      expect(r.readinessRatio).toBe(1);
      expect(r.gaps).toEqual([]);
    });

    it("returns early verdict when most questions are no", () => {
      const r = assessReadiness({ headcount: 100, answers: allNo() });
      expect(r.verdict).toBe("early");
      expect(r.readinessRatio).toBe(0);
      expect(r.gaps.length).toBe(READINESS_QUESTIONS.length);
    });

    it("returns partial verdict at intermediate readiness", () => {
      const answers = allNo();
      // mark first 4 of 7 questions as yes → ratio ~0.57
      answers[READINESS_QUESTIONS[0].id] = true;
      answers[READINESS_QUESTIONS[1].id] = true;
      answers[READINESS_QUESTIONS[2].id] = true;
      answers[READINESS_QUESTIONS[3].id] = true;
      const r = assessReadiness({ headcount: 80, answers });
      expect(r.verdict).toBe("partial");
      expect(r.gaps.length).toBe(3);
    });
  });

  describe("readinessGuidance", () => {
    it("never tells a mandatory (50+) workplace to rely on the sub-50 track", () => {
      for (const verdict of ["early", "partial", "ready"] as const) {
        const text = readinessGuidance(verdict, "mandatory");
        expect(text, verdict).not.toContain("50人未満");
        expect(text, verdict).not.toContain("さんぽセンター");
      }
    });

    it("points sub-50 workplaces at the さんぽセンター support when not yet ready", () => {
      expect(readinessGuidance("early", "effort-duty")).toContain("さんぽセンター");
      expect(readinessGuidance("partial", "effort-duty")).toContain("さんぽセンター");
    });

    it("reminds a mandatory workplace of the annual / reporting obligation", () => {
      expect(readinessGuidance("early", "mandatory")).toContain("義務");
      expect(readinessGuidance("partial", "mandatory")).toContain("様式第6号の2");
    });
  });
});
