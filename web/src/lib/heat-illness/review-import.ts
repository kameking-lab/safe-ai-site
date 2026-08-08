import {
  HEAT_CLAIM_REGISTRY,
  type HeatClaimRegistryEntry,
} from "./review-claim-registry";

export type { HeatClaimRegistryEntry } from "./review-claim-registry";

export type HeatReviewRole = HeatClaimRegistryEntry["role"];
export type HeatReviewDecision =
  "approved" | "changes-requested" | "rejected" | "out-of-scope";
export type HeatReviewApprovalScope = "claim-only" | "claim-and-revised-text";

export type HeatReviewRecord = {
  claimId: string;
  reviewer: string;
  role: HeatReviewRole;
  decision: HeatReviewDecision;
  comment: string;
  revisedText: string;
  date: string;
  source: string;
  approvalScope: HeatReviewApprovalScope;
};

export type HeatReviewValidationError = {
  row: number;
  code:
    | "invalid_csv"
    | "invalid_headers"
    | "unknown_header"
    | "unknown_claim_id"
    | "duplicate_claim_id"
    | "reviewer_required"
    | "invalid_reviewer"
    | "role_mismatch"
    | "invalid_decision"
    | "comment_required"
    | "invalid_comment"
    | "invalid_revised_text"
    | "invalid_date"
    | "source_changed_recheck_required"
    | "invalid_approval_scope"
    | "known_duplicate_must_be_out_of_scope";
};

const HEADERS = [
  "claim_id",
  "reviewer",
  "role",
  "decision",
  "comment",
  "revised_text",
  "date",
  "source",
  "approval_scope",
] as const;
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const DECISIONS = new Set<HeatReviewDecision>([
  "approved",
  "changes-requested",
  "rejected",
  "out-of-scope",
]);
const SCOPES = new Set<HeatReviewApprovalScope>([
  "claim-only",
  "claim-and-revised-text",
]);

export { HEAT_CLAIM_REGISTRY } from "./review-claim-registry";

/** RFC 4180-style parser. It accepts quoted commas/newlines and rejects open quotes. */
export function parseHeatReviewCsv(csv: string): string[][] {
  const normalized = csv.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < normalized.length; index += 1) {
    const character = normalized[index];
    if (quoted) {
      if (character === '"') {
        if (normalized[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
      continue;
    }
    if (character === '"') {
      if (field.length > 0) throw new Error("invalid_csv");
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (quoted) throw new Error("invalid_csv");
  row.push(field.replace(/\r$/, ""));
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

function validIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

export function validateHeatReviewCsv(
  csv: string,
  registry: readonly HeatClaimRegistryEntry[] = HEAT_CLAIM_REGISTRY,
): {
  ok: boolean;
  records: HeatReviewRecord[];
  errors: HeatReviewValidationError[];
  summary: {
    validRows: number;
    approvedRequiredClaims: number;
    requiredClaims: number;
    allRequiredExpertApprovalsPresent: boolean;
    finalHumanPublicationApprovalRequired: true;
    indexReleaseAllowed: false;
  };
} {
  let rows: string[][];
  try {
    rows = parseHeatReviewCsv(csv);
  } catch {
    return {
      ok: false,
      records: [],
      errors: [{ row: 1, code: "invalid_csv" }],
      summary: {
        validRows: 0,
        approvedRequiredClaims: 0,
        requiredClaims: registry.filter((entry) => !entry.duplicateOf).length,
        allRequiredExpertApprovalsPresent: false,
        finalHumanPublicationApprovalRequired: true,
        indexReleaseAllowed: false,
      },
    };
  }

  const errors: HeatReviewValidationError[] = [];
  const header = rows[0] ?? [];
  const unknownHeaders = header.filter(
    (value) => !(HEADERS as readonly string[]).includes(value),
  );
  if (
    header.length !== HEADERS.length ||
    HEADERS.some((expected, index) => header[index] !== expected)
  ) {
    errors.push({ row: 1, code: "invalid_headers" });
  }
  if (unknownHeaders.length > 0) {
    errors.push({ row: 1, code: "unknown_header" });
  }

  const registryById = new Map(registry.map((entry) => [entry.claimId, entry]));
  const seen = new Set<string>();
  const records: HeatReviewRecord[] = [];

  for (let index = 1; index < rows.length; index += 1) {
    const values = rows[index];
    const rowNumber = index + 1;
    if (values.length !== HEADERS.length) {
      errors.push({ row: rowNumber, code: "invalid_csv" });
      continue;
    }
    const [
      claimId,
      reviewer,
      role,
      decision,
      comment,
      revisedText,
      date,
      source,
      approvalScope,
    ] = values.map((value) => value.trim());
    const claim = registryById.get(claimId);
    let rowValid = true;
    const add = (code: HeatReviewValidationError["code"]) => {
      errors.push({ row: rowNumber, code });
      rowValid = false;
    };

    if (!claim) add("unknown_claim_id");
    if (seen.has(claimId)) add("duplicate_claim_id");
    if (claimId) seen.add(claimId);
    if (!reviewer) add("reviewer_required");
    else if (reviewer.length > 120 || CONTROL.test(reviewer)) {
      add("invalid_reviewer");
    }
    if (!claim || role !== claim.role) add("role_mismatch");
    if (!DECISIONS.has(decision as HeatReviewDecision)) {
      add("invalid_decision");
    }
    if (
      (decision === "changes-requested" || decision === "rejected") &&
      !comment
    ) {
      add("comment_required");
    }
    if (comment.length > 2_000 || CONTROL.test(comment)) add("invalid_comment");
    if (revisedText.length > 5_000 || CONTROL.test(revisedText)) {
      add("invalid_revised_text");
    }
    if (!validIsoDate(date)) add("invalid_date");
    if (!claim || source !== claim.source) {
      add("source_changed_recheck_required");
    }
    if (!SCOPES.has(approvalScope as HeatReviewApprovalScope)) {
      add("invalid_approval_scope");
    }
    if (claim?.duplicateOf && decision !== "out-of-scope") {
      add("known_duplicate_must_be_out_of_scope");
    }

    if (rowValid && claim) {
      records.push({
        claimId,
        reviewer,
        role: role as HeatReviewRole,
        decision: decision as HeatReviewDecision,
        comment,
        revisedText,
        date,
        source,
        approvalScope: approvalScope as HeatReviewApprovalScope,
      });
    }
  }

  const decisions = new Map(records.map((record) => [record.claimId, record]));
  const requiredClaims = registry.filter((entry) => !entry.duplicateOf);
  const approvedRequiredClaims = requiredClaims.filter(
    (entry) => decisions.get(entry.claimId)?.decision === "approved",
  ).length;
  const allRequiredExpertApprovalsPresent =
    approvedRequiredClaims === requiredClaims.length;

  return {
    ok: errors.length === 0,
    records,
    errors,
    summary: {
      validRows: records.length,
      approvedRequiredClaims,
      requiredClaims: requiredClaims.length,
      allRequiredExpertApprovalsPresent,
      finalHumanPublicationApprovalRequired: true,
      // Import validation can never publish or alter robots/sitemap state.
      indexReleaseAllowed: false,
    },
  };
}

export function heatReviewImportTemplate(): string {
  const rows = [
    HEADERS.join(","),
    ...HEAT_CLAIM_REGISTRY.map((claim) =>
      [
        claim.claimId,
        "",
        claim.role,
        claim.duplicateOf ? "out-of-scope" : "",
        "",
        "",
        "",
        claim.source,
        "claim-only",
      ]
        .map((value) => `"${value.replaceAll('"', '""')}"`)
        .join(","),
    ),
  ];
  return rows.join("\r\n");
}
