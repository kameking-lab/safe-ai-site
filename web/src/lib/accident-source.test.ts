import { describe, expect, it } from "vitest";
import {
  ACCIDENT_PROVENANCE_INFO,
  hasMatchingMhlwSource,
  isAccidentEligibleForOperationalEvidence,
  resolveAccidentProvenance,
  resolveAccidentSource,
} from "@/lib/accident-source";
import type { AccidentCase } from "@/lib/types/domain";

const base: AccidentCase = {
  id: "curated-example",
  title: "example",
  occurredOn: "2026-01-01",
  type: "墜落",
  workCategory: "建設業",
  severity: "重傷",
  summary: "summary",
  mainCauses: [],
  preventionPoints: [],
};

describe("accident provenance", () => {
  it("preserves an explicit provenance classification", () => {
    expect(resolveAccidentProvenance({ ...base, provenance: "synthetic" })).toBe(
      "synthetic",
    );
  });

  it("URLとIDの一致だけでは一次資料確認済みに分類しない", () => {
    const official = {
      ...base,
      id: "mhlw-123",
      source: {
        site: "職場のあんぜんサイト",
        caseId: "123",
        url: "https://anzeninfo.mhlw.go.jp/anzen_pg/SAI_DET.aspx?joho_no=123",
      },
    };
    expect(hasMatchingMhlwSource(official)).toBe(false);
    expect(resolveAccidentProvenance(official)).toBe("curated");
    expect(isAccidentEligibleForOperationalEvidence(official)).toBe(false);
    expect(resolveAccidentProvenance({ ...base, id: "mhlw-123" })).toBe("curated");
    expect(
      resolveAccidentProvenance({
        ...official,
        source: { ...official.source, caseId: "999" },
      }),
    ).toBe("curated");
    expect(resolveAccidentProvenance(base)).toBe("curated");
    expect(isAccidentEligibleForOperationalEvidence(base)).toBe(false);
  });

  it("一次資料と本文を照合した No.100620 だけを公式個票として扱う", () => {
    const reviewed: AccidentCase = {
      ...base,
      id: "mhlw-100620",
      provenance: "mhlw",
      source: {
        site: "職場のあんぜんサイト",
        caseId: "100620",
        url: "https://anzeninfo.mhlw.go.jp/anzen_pg/SAI_DET.aspx?joho_no=100620",
      },
    };
    expect(hasMatchingMhlwSource(reviewed)).toBe(true);
    expect(resolveAccidentProvenance(reviewed)).toBe("mhlw");
    expect(isAccidentEligibleForOperationalEvidence(reviewed)).toBe(true);
    expect(
      hasMatchingMhlwSource({
        ...reviewed,
        source: { ...reviewed.source!, caseId: "100621" },
      }),
    ).toBe(false);
  });

  it("does not invent an individual source URL from an id alone", () => {
    expect(resolveAccidentSource({ ...base, id: "mhlw-123" })).toBeNull();
  });

  it("does not describe synthetic or preliminary entries as official case records", () => {
    expect(ACCIDENT_PROVENANCE_INFO.synthetic.description).toContain("架空事例");
    expect(ACCIDENT_PROVENANCE_INFO.preliminary.description).toContain("実際の個票ではなく");
  });
});
