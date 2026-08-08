import { describe, expect, it } from "vitest";
import type { ChemicalRaResponse } from "@/app/api/chemical-ra/route";
import { sanitizeChemicalRaResponse } from "./response-safety";

const legacy: ChemicalRaResponse = {
  chemicalName: "監査用物質",
  casNumber: "000-00-0",
  ghsHazards: [{ category: "未検証", classification: "区分1" }],
  ppeRecommendations: [{ item: "未検証PPE", specification: "未検証", searchQuery: "未検証" }],
  safetyMeasures: [{ category: "未検証", action: "未検証対策" }],
  emergencyMeasures: ["未検証応急措置"],
  regulatoryNotes: ["未検証法令"],
  rawReply: "未検証AI回答",
  aiStatus: "demo",
  createSimple: {
    level: "I",
    label: "低リスク",
    exposureRatio: 0.01,
    inputSummary: { ventilation: "局所排気", amount: "少量", durationHours: 1 },
    rationale: ["独自式"],
  },
};

describe("sanitizeChemicalRaResponse", () => {
  it("quarantines unsafe legacy generated fields and scores", () => {
    const safe = sanitizeChemicalRaResponse(legacy);
    expect(safe.chemicalName).toBe("監査用物質");
    expect(safe.createSimple).toBeUndefined();
    expect(safe.ghsHazards).toEqual([]);
    expect(safe.safetyMeasures).toEqual([]);
    expect(safe.rawReply).not.toContain("未検証AI回答");
    expect(safe.assessmentStatus).toBe("unavailable");
  });
});
