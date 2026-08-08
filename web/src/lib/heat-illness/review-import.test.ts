import { describe, expect, it } from "vitest";
import {
  HEAT_CLAIM_REGISTRY,
  validateHeatReviewCsv,
  type HeatClaimRegistryEntry,
} from "./review-import";

const HEADER =
  "claim_id,reviewer,role,decision,comment,revised_text,date,source,approval_scope";

function row(
  claim: HeatClaimRegistryEntry,
  overrides: Partial<Record<string, string>> = {},
): string {
  const values = {
    claim_id: claim.claimId,
    reviewer: "外部レビュー担当",
    role: claim.role,
    decision: claim.duplicateOf ? "out-of-scope" : "approved",
    comment: "",
    revised_text: "",
    date: "2026-07-29",
    source: claim.source,
    approval_scope: "claim-only",
    ...overrides,
  };
  return [
    values.claim_id,
    values.reviewer,
    values.role,
    values.decision,
    values.comment,
    values.revised_text,
    values.date,
    values.source,
    values.approval_scope,
  ]
    .map((value) => `"${value.replaceAll('"', '""')}"`)
    .join(",");
}

function codes(csv: string) {
  return validateHeatReviewCsv(csv).errors.map((error) => error.code);
}

describe("heat review import validator", () => {
  const legal = HEAT_CLAIM_REGISTRY[0];

  it("rejects unknown and duplicate claim IDs", () => {
    const unknown = row(legal, { claim_id: "HL-X-999" });
    const duplicate = [HEADER, row(legal), row(legal)].join("\n");

    expect(codes([HEADER, unknown].join("\n"))).toContain("unknown_claim_id");
    expect(codes(duplicate)).toContain("duplicate_claim_id");
  });

  it("rejects missing reviewers, role mismatches, and source changes", () => {
    const csv = [
      HEADER,
      row(legal, {
        reviewer: "",
        role: "medical",
        source: "changed-source",
      }),
    ].join("\n");

    expect(codes(csv)).toEqual(
      expect.arrayContaining([
        "reviewer_required",
        "role_mismatch",
        "source_changed_recheck_required",
      ]),
    );
  });

  it("accepts a valid partial import without treating it as publication approval", () => {
    const result = validateHeatReviewCsv([HEADER, row(legal)].join("\n"));

    expect(result.ok).toBe(true);
    expect(result.summary.allRequiredExpertApprovalsPresent).toBe(false);
    expect(result.summary.finalHumanPublicationApprovalRequired).toBe(true);
    expect(result.summary.indexReleaseAllowed).toBe(false);
  });

  it("requires the known duplicate to be out of scope", () => {
    const duplicate = HEAT_CLAIM_REGISTRY.find(
      (claim) => claim.duplicateOf,
    )!;
    const result = validateHeatReviewCsv(
      [HEADER, row(duplicate, { decision: "approved" })].join("\n"),
    );

    expect(result.ok).toBe(false);
    expect(codes([HEADER, row(duplicate, { decision: "approved" })].join("\n")))
      .toContain("known_duplicate_must_be_out_of_scope");
  });

  it("keeps index release disabled even after every expert claim is approved", () => {
    const csv = [
      HEADER,
      ...HEAT_CLAIM_REGISTRY.map((claim) => row(claim)),
    ].join("\n");
    const result = validateHeatReviewCsv(csv);

    expect(result.ok).toBe(true);
    expect(result.summary.requiredClaims).toBe(45);
    expect(result.summary.approvedRequiredClaims).toBe(45);
    expect(result.summary.allRequiredExpertApprovalsPresent).toBe(true);
    expect(result.summary.finalHumanPublicationApprovalRequired).toBe(true);
    expect(result.summary.indexReleaseAllowed).toBe(false);
  });
});
