import { describe, expect, it } from "vitest";
import {
  RESIDENCE_STATUS_LABELS_JA,
  type ResidenceStatusId,
} from "@/types/foreign-worker";
import { RESIDENCE_STATUS_INDEX, getResidenceStatusRule } from ".";

const ALL_IDS = Object.keys(RESIDENCE_STATUS_LABELS_JA) as ResidenceStatusId[];

describe("residence status index", () => {
  it("contains every declared status id", () => {
    for (const id of ALL_IDS) {
      expect(getResidenceStatusRule(id), id).toBeDefined();
    }
  });

  it("flags status-based statuses as unlimited work scope", () => {
    const sb = RESIDENCE_STATUS_INDEX.all.filter((r) => r.category === "status-based");
    expect(sb.length).toBeGreaterThan(0);
    for (const r of sb) {
      expect(r.unlimitedWorkScope, r.id).toBe(true);
      expect(r.transferAllowed, r.id).toBe(true);
    }
  });

  it("blocks transfer for technical-intern statuses", () => {
    const ti = RESIDENCE_STATUS_INDEX.all.filter((r) => r.category === "training");
    expect(ti.length).toBe(3);
    for (const r of ti) {
      expect(r.transferAllowed, r.id).toBe(false);
      expect(r.unlimitedWorkScope, r.id).toBe(false);
    }
  });

  it("populates SSW fields only for specified-skill statuses", () => {
    for (const r of RESIDENCE_STATUS_INDEX.all) {
      if (r.category === "specified-skill") {
        expect(r.ssfFields, r.id).toBeDefined();
        expect((r.ssfFields ?? []).length).toBeGreaterThan(0);
      } else {
        expect(r.ssfFields ?? []).toEqual([]);
      }
    }
  });

  it("provides employer obligations and worker rights for every status", () => {
    for (const r of RESIDENCE_STATUS_INDEX.all) {
      expect(r.employerObligations.length, `${r.id}/obligations`).toBeGreaterThanOrEqual(1);
      expect(r.workerRights.length, `${r.id}/rights`).toBeGreaterThanOrEqual(1);
      expect(r.relevantSafetyLaws.length, `${r.id}/laws`).toBeGreaterThanOrEqual(2);
      expect(r.commonTroubles.length, `${r.id}/troubles`).toBeGreaterThanOrEqual(1);
    }
  });
});
