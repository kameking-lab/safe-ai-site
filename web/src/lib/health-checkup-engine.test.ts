import { describe, expect, it } from "vitest";
import { ALL_CHECKUP_RULES, ALL_JOB_PROFILES } from "@/data/health-checkup-rules";
import type { WorkerProfile } from "@/types/health-checkup";
import {
  buildDecision,
  determineRequiredCheckups,
  generateAnnualSchedule,
  groupScheduleByMonth,
  identifyMissing,
  resolveWorkerHazards,
} from "./health-checkup-engine";

const baseProfile = (overrides: Partial<WorkerProfile> = {}): WorkerProfile => ({
  industry: "construction",
  jobIds: [],
  substances: [],
  workConditions: [],
  hireDate: "2026-04-15",
  ...overrides,
});

describe("health-checkup-engine", () => {
  it("ships rules covering all 6 checkup types", () => {
    const types = new Set(ALL_CHECKUP_RULES.map((r) => r.type));
    expect(types.has("general")).toBe(true);
    expect(types.has("specific-job")).toBe(true);
    expect(types.has("special")).toBe(true);
    expect(types.has("silicosis")).toBe(true);
    expect(types.has("dental-special")).toBe(true);
    expect(types.has("electron-radiation")).toBe(true);
  });

  it("ships at least 100 job profiles across 5 industries", () => {
    expect(ALL_JOB_PROFILES.length).toBeGreaterThanOrEqual(100);
    const industries = new Set(ALL_JOB_PROFILES.map((j) => j.industry));
    expect(industries.size).toBe(5);
  });

  it("a plain office worker (no hazards) gets only the general checkups", () => {
    const result = determineRequiredCheckups(
      baseProfile({ industry: "service" }),
    );
    const types = new Set(result.map((r) => r.rule.type));
    expect(types.has("general")).toBe(true);
    expect(types.has("specific-job")).toBe(false);
    expect(types.has("special")).toBe(false);
  });

  it("a welder triggers special and specific-job checkups", () => {
    const result = determineRequiredCheckups(
      baseProfile({
        industry: "construction",
        jobIds: ["c-welder"],
      }),
    );
    const ids = new Set(result.map((r) => r.rule.id));
    expect(ids.has("general-periodic")).toBe(true);
    expect(ids.has("specified-chemical-checkup")).toBe(true); // welding fume
    expect(ids.has("specific-job-checkup")).toBe(true); // noise / hot work
  });

  it("an organic solvent painter triggers the organic-solvent checkup", () => {
    const result = determineRequiredCheckups(
      baseProfile({
        industry: "construction",
        jobIds: ["c-painter"],
      }),
    );
    const ids = new Set(result.map((r) => r.rule.id));
    expect(ids.has("organic-solvent-checkup")).toBe(true);
  });

  it("a radiologic technologist triggers ionizing-radiation checkup", () => {
    const result = determineRequiredCheckups(
      baseProfile({
        industry: "medical",
        jobIds: ["med-radiologic"],
      }),
    );
    const ids = new Set(result.map((r) => r.rule.id));
    expect(ids.has("electron-radiation-checkup")).toBe(true);
    // ionizing radiation work also qualifies for specific-job checkup
    expect(ids.has("specific-job-checkup")).toBe(true);
  });

  it("a tunnel/drilling worker triggers silicosis checkup", () => {
    const result = determineRequiredCheckups(
      baseProfile({
        industry: "construction",
        jobIds: ["c-tunnel"],
      }),
    );
    const ids = new Set(result.map((r) => r.rule.id));
    expect(ids.has("silicosis-checkup")).toBe(true);
  });

  it("manual substance entry composes with job defaults", () => {
    const hazards = resolveWorkerHazards(
      baseProfile({
        industry: "service",
        jobIds: ["s-chef"],
        substances: ["formaldehyde"],
        workConditions: ["night-work"],
      }),
    );
    expect(hazards.workConditions.has("hot-work")).toBe(true); // from chef
    expect(hazards.workConditions.has("night-work")).toBe(true); // manual
    expect(hazards.substances.has("formaldehyde")).toBe(true); // manual
  });

  it("triggeredBy is recorded with the firing trigger kind", () => {
    const result = determineRequiredCheckups(
      baseProfile({
        industry: "construction",
        jobIds: ["c-welder"],
      }),
    );
    const welder = result.find((r) => r.rule.id === "specified-chemical-checkup");
    expect(welder).toBeDefined();
    const kinds = welder!.triggeredBy.map((t) => t.kind);
    expect(kinds.includes("substance")).toBe(true);
  });

  it("generateAnnualSchedule anchors at-hire event at the hire month", () => {
    const required = determineRequiredCheckups(
      baseProfile({ industry: "service", hireDate: "2026-04-15" }),
    );
    const schedule = generateAnnualSchedule(required, "2026-04-15");
    const atHire = schedule.entries.find(
      (e) => e.ruleId === "general-at-hire" && e.isAtHire,
    );
    expect(atHire?.month).toBe(4);
  });

  it("generateAnnualSchedule repeats 6-month rules across the year", () => {
    const required = determineRequiredCheckups(
      baseProfile({
        industry: "construction",
        jobIds: ["c-welder"],
        hireDate: "2026-02-10",
      }),
    );
    const schedule = generateAnnualSchedule(required, "2026-02-10");
    const sixMonthEntries = schedule.entries.filter(
      (e) => e.ruleId === "specific-job-checkup",
    );
    // at-hire (Feb) + one repeat 6 months later (Aug)
    expect(sixMonthEntries.length).toBe(2);
    const months = sixMonthEntries.map((e) => e.month).sort((a, b) => a - b);
    expect(months).toEqual([2, 8]);
  });

  it("groupScheduleByMonth returns a stable 12-row record", () => {
    const required = determineRequiredCheckups(baseProfile({ industry: "service" }));
    const schedule = generateAnnualSchedule(required, "2026-07-01");
    const grouped = groupScheduleByMonth(schedule);
    expect(Object.keys(grouped).length).toBe(12);
    for (let m = 1; m <= 12; m++) {
      expect(Array.isArray(grouped[m as 1])).toBe(true);
    }
  });

  it("identifyMissing flags rules with no record", () => {
    const required = determineRequiredCheckups(baseProfile({ industry: "service" }));
    const missing = identifyMissing(required, []);
    // both general rules should be missing
    expect(missing.length).toBeGreaterThanOrEqual(2);
    expect(missing.every((m) => m.reason.includes("実施記録なし"))).toBe(true);
  });

  it("identifyMissing flags rules whose last exam is older than the interval", () => {
    const required = determineRequiredCheckups(baseProfile({ industry: "service" }));
    const ref = new Date(2026, 4, 16); // 2026-05-16
    const missing = identifyMissing(
      required,
      [
        { ruleId: "general-at-hire", lastPerformed: "2026-05-01" },
        { ruleId: "general-periodic", lastPerformed: "2024-05-01" },
      ],
      ref,
    );
    const periodic = missing.find((m) => m.rule.id === "general-periodic");
    expect(periodic?.reason).toMatch(/超過/);
    const atHire = missing.find((m) => m.rule.id === "general-at-hire");
    expect(atHire).toBeUndefined();
  });

  it("buildDecision returns required + schedule + missing in one call", () => {
    const profile = baseProfile({
      industry: "manufacturing",
      jobIds: ["m-plater"],
      hireDate: "2026-04-15",
    });
    const decision = buildDecision(profile, []);
    expect(decision.required.length).toBeGreaterThan(0);
    expect(decision.schedule.entries.length).toBeGreaterThan(0);
    // missing should at least include the not-yet-performed special checkup
    expect(decision.missing.length).toBeGreaterThan(0);
  });

  it("returns no rules and no entries on a malformed hire date", () => {
    const required = determineRequiredCheckups(
      baseProfile({ industry: "service", hireDate: "not-a-date" }),
    );
    const schedule = generateAnnualSchedule(required, "not-a-date");
    expect(schedule.entries).toEqual([]);
  });
});
