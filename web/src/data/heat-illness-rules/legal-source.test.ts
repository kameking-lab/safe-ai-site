import { describe, expect, it } from "vitest";
import { realLawRevisions } from "@/data/mock/real-law-revisions";
import { realLawRevisionsExtra } from "@/data/mock/real-law-revisions-extra";
import {
  HEAT_ILLNESS_2025_LEGAL_SOURCE,
  HEAT_ILLNESS_PREVENTION_RECOMMENDATIONS,
} from "./legal-source";
import { R7_COMPLIANCE_ITEMS } from "./r7-compliance";

describe("2025 heat-illness legal source integrity", () => {
  it("pins the primary-source identity and exactly two statutory duties", () => {
    expect(HEAT_ILLNESS_2025_LEGAL_SOURCE).toMatchObject({
      ordinanceNumber: "令和7年厚生労働省令第57号",
      promulgatedAt: "2025-04-15",
      effectiveFrom: "2025-06-01",
      article: "労働安全衛生規則第612条の2",
      implementationNotice: "基発0520第6号",
      sourceStatus: "url-confirmed-content-review-pending",
      verifiedAt: null,
    });
    expect(HEAT_ILLNESS_2025_LEGAL_SOURCE.duties).toHaveLength(2);
    expect(R7_COMPLIANCE_ITEMS).toHaveLength(2);
  });

  it("keeps preventive recommendations outside the statutory duty list", () => {
    expect(HEAT_ILLNESS_PREVENTION_RECOMMENDATIONS.length).toBeGreaterThan(0);
    const duties = JSON.stringify(HEAT_ILLNESS_2025_LEGAL_SOURCE.duties);
    expect(duties).not.toContain("休憩場所");
    expect(duties).not.toContain("塩分");
  });

  it("does not reintroduce the unrelated 2023 law or fabricated timeline entries", () => {
    const all = [...realLawRevisions, ...realLawRevisionsExtra];
    expect(all.some((entry) => entry.id === "lr-extra-2022-004")).toBe(false);
    expect(all.some((entry) => entry.id === "lr-extra-2023-004")).toBe(false);
    expect(all.some((entry) => entry.id === "lr-extra-2024-006")).toBe(false);
    const heatEntries = all.filter((entry) => `${entry.title} ${entry.summary}`.includes("熱中症"));
    expect(JSON.stringify(heatEntries)).not.toContain("令和5年法律第50号");
  });
});
