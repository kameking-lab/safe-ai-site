import { describe, expect, it } from "vitest";
import type { WorkerProfile } from "@/types/health-checkup";
import {
  buildDecision,
  determineRequiredCheckups,
  generateAnnualSchedule,
} from "./health-checkup-engine";
import {
  buildOptimisedMonthlyView,
  consolidatedTestItemsForMonth,
  extractOnDemandEvents,
  optimiseDecision,
  optimiseSchedule,
} from "./annual-schedule-optimizer";

const profile = (overrides: Partial<WorkerProfile> = {}): WorkerProfile => ({
  industry: "manufacturing",
  jobIds: [],
  substances: [],
  workConditions: [],
  hireDate: "2026-04-15",
  ...overrides,
});

describe("annual-schedule-optimizer", () => {
  it("extracts overtime and overseas rules as on-demand events", () => {
    const required = determineRequiredCheckups(
      profile({
        workConditions: ["overtime-80h", "overseas-dispatch-6m"],
      }),
    );
    const onDemand = extractOnDemandEvents(required);
    const ids = new Set(onDemand.map((e) => e.rule.id));
    expect(ids.has("overtime-medical-interview")).toBe(true);
    expect(ids.has("overseas-dispatch-pre")).toBe(true);
    expect(ids.has("overseas-dispatch-post")).toBe(true);
  });

  it("event-driven rules do not appear on the monthly calendar", () => {
    const required = determineRequiredCheckups(
      profile({
        workConditions: ["overtime-80h", "overseas-dispatch-6m"],
      }),
    );
    const schedule = generateAnnualSchedule(required, "2026-04-15");
    const eventDriven = schedule.entries.filter(
      (e) =>
        e.ruleId === "overtime-medical-interview" ||
        e.ruleId === "overseas-dispatch-pre" ||
        e.ruleId === "overseas-dispatch-post",
    );
    expect(eventDriven).toHaveLength(0);
  });

  it("consolidated items collapse duplicate blood-panel entries", () => {
    const required = determineRequiredCheckups(
      profile({
        industry: "construction",
        jobIds: ["c-welder", "c-painter"],
        substances: ["benzene", "vinyl-chloride", "dichloromethane"],
      }),
    );
    const schedule = generateAnnualSchedule(required, "2026-04-15");
    const apr = consolidatedTestItemsForMonth(schedule, 4);
    // Liver function appears in dichloromethane, vinyl-chloride AND general
    // periodic — should collapse to a single canonical entry.
    const liver = apr.filter((s) => s.includes("肝機能"));
    expect(liver.length).toBe(1);
  });

  it("optimiseSchedule re-distributes overloaded months when feasible", () => {
    const decision = buildDecision(
      profile({
        industry: "construction",
        jobIds: ["c-welder", "c-painter"],
        substances: ["chromium", "cadmium", "manganese", "nickel"],
        workConditions: ["night-work", "noise-work"],
        hireDate: "2026-04-15",
      }),
      [],
    );
    const before = decision.schedule;
    const { schedule: after, moves } = optimiseSchedule(before);
    // The optimizer may or may not move events depending on heuristics, but
    // it must NEVER drop or duplicate entries.
    expect(after.entries.length).toBe(before.entries.length);
    for (const move of moves) {
      expect(move.from).not.toBe(move.to);
    }
  });

  it("optimiseDecision exposes coverage stats and a 12-row monthly view", () => {
    const decision = buildDecision(profile({ industry: "service" }), []);
    const opt = optimiseDecision(decision.required, decision.schedule);
    expect(opt.coverage.matched).toBeGreaterThan(0);
    expect(opt.coverage.total).toBeGreaterThanOrEqual(30);
    expect(opt.monthlyView).toHaveLength(12);
    expect(opt.monthlyView.map((m) => m.month)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ]);
  });

  it("at-hire entries are never moved by the optimizer", () => {
    const decision = buildDecision(
      profile({
        industry: "construction",
        jobIds: ["c-welder", "c-painter"],
        substances: ["benzene", "vinyl-chloride", "chromium"],
        workConditions: ["night-work"],
        hireDate: "2026-04-15",
      }),
      [],
    );
    const { schedule: after, moves } = optimiseSchedule(decision.schedule);
    const atHireEntries = decision.schedule.entries.filter((e) => e.isAtHire);
    for (const original of atHireEntries) {
      const matchAfter = after.entries.find(
        (e) => e.ruleId === original.ruleId && e.isAtHire,
      );
      expect(matchAfter?.month).toBe(original.month);
    }
    for (const move of moves) {
      const moved = after.entries.find(
        (e) => e.ruleId === move.ruleId && e.month === move.to,
      );
      expect(moved?.isAtHire).toBe(false);
    }
  });

  it("buildOptimisedMonthlyView returns one entry per month in order", () => {
    const decision = buildDecision(profile({ industry: "service" }), []);
    const view = buildOptimisedMonthlyView(decision.schedule);
    expect(view).toHaveLength(12);
    expect(view.map((v) => v.month)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ]);
  });
});
