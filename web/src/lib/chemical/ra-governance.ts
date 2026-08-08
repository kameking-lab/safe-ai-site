export const CHEMICAL_RA_STATUSES = [
  "draft",
  "identity-unresolved",
  "input-incomplete",
  "screening-complete",
  "review-required",
  "changes-requested",
  "approved",
  "superseded",
  "reassessment-due",
  "archived",
] as const;

export type ChemicalRaStatus = (typeof CHEMICAL_RA_STATUSES)[number];

export const CHEMICAL_REASSESSMENT_TRIGGERS = [
  "sds-updated",
  "component-changed",
  "concentration-changed",
  "quantity-changed",
  "process-changed",
  "ventilation-changed",
  "ppe-changed",
  "law-changed",
  "incident-or-near-miss",
  "periodic-date",
] as const;

export type ChemicalReassessmentTrigger =
  (typeof CHEMICAL_REASSESSMENT_TRIGGERS)[number];

export type ChemicalRaApprovalInput = {
  status: ChemicalRaStatus;
  chemicalIdentity: string | null;
  casNumber: string | null;
  identityUniquenessConfirmed: boolean;
  mixtureConfirmed: boolean;
  mixtureComponents: unknown[] | null;
  sdsRecordId: string | null;
  sdsVersionLabel: string | null;
  sdsIssueDate: Date | null;
  processName: string | null;
  taskName: string | null;
  quantity: string | null;
  concentration: string | null;
  exposureDuration: string | null;
  frequency: string | null;
  temperature: string | null;
  ventilation: string | null;
  localExhaust: string | null;
  skinExposure: string | null;
  ppe: unknown[] | null;
  existingControl: unknown[] | null;
  additionalControl: unknown[] | null;
  ownerUserId: string | null;
  reviewerUserId: string | null;
  approverUserId: string | null;
  reassessmentDate: Date | null;
  aiCandidatesReviewed: boolean;
  sources: unknown[] | null;
  evidence: unknown[] | null;
  unresolvedWarningCount: number;
};

export type ChemicalRaApprovalGate = {
  approved: boolean;
  missing: string[];
};

function hasText(value: string | null): boolean {
  return Boolean(value?.trim());
}

function hasItems(value: unknown[] | null): boolean {
  return Array.isArray(value) && value.length > 0;
}

/** CAS Registry Number checksum validation. This does not establish identity by itself. */
export function isValidCasNumber(value: string | null): boolean {
  if (!value || !/^\d{2,7}-\d{2}-\d$/.test(value)) return false;
  const digits = value.replaceAll("-", "");
  const check = Number(digits.at(-1));
  const body = digits.slice(0, -1).split("").reverse();
  const sum = body.reduce(
    (total, digit, index) => total + Number(digit) * (index + 1),
    0,
  );
  return sum % 10 === check;
}

export function evaluateChemicalRaApprovalGate(
  input: ChemicalRaApprovalInput,
  now = new Date(),
): ChemicalRaApprovalGate {
  const missing: string[] = [];
  if (input.status !== "review-required") missing.push("status.review-required");
  if (!hasText(input.chemicalIdentity)) missing.push("chemicalIdentity");

  const singleIdentity =
    isValidCasNumber(input.casNumber) && input.identityUniquenessConfirmed;
  const confirmedMixture =
    input.mixtureConfirmed && hasItems(input.mixtureComponents);
  if (!singleIdentity && !confirmedMixture) {
    missing.push("identity.confirmed-cas-or-mixture");
  }

  if (!hasText(input.sdsRecordId)) missing.push("sdsRecordId");
  if (!hasText(input.sdsVersionLabel)) missing.push("sdsVersionLabel");
  if (!input.sdsIssueDate || Number.isNaN(input.sdsIssueDate.getTime())) {
    missing.push("sdsIssueDate");
  } else if (input.sdsIssueDate.getTime() > now.getTime()) {
    missing.push("sdsIssueDate.not-future");
  }

  const requiredText: Array<[keyof ChemicalRaApprovalInput, string]> = [
    ["processName", "process"],
    ["taskName", "task"],
    ["quantity", "quantity"],
    ["concentration", "concentration"],
    ["exposureDuration", "exposureDuration"],
    ["frequency", "frequency"],
    ["temperature", "temperature"],
    ["ventilation", "ventilation"],
    ["localExhaust", "localExhaust"],
    ["skinExposure", "skinExposure"],
    ["ownerUserId", "owner"],
    ["reviewerUserId", "reviewer"],
    ["approverUserId", "approver"],
  ];
  for (const [key, label] of requiredText) {
    if (!hasText(input[key] as string | null)) missing.push(label);
  }

  if (!hasItems(input.ppe)) missing.push("ppe");
  if (!hasItems(input.existingControl)) missing.push("existingControl");
  if (!hasItems(input.additionalControl)) missing.push("additionalControl");
  if (!hasItems(input.sources)) missing.push("sources");
  if (!hasItems(input.evidence)) missing.push("evidence");
  if (!input.aiCandidatesReviewed) missing.push("aiCandidatesReviewed");
  if (!Number.isInteger(input.unresolvedWarningCount)) {
    missing.push("unresolvedWarningCount.invalid");
  } else if (input.unresolvedWarningCount !== 0) {
    missing.push("unresolvedWarningCount.zero");
  }
  if (
    !input.reassessmentDate ||
    Number.isNaN(input.reassessmentDate.getTime()) ||
    input.reassessmentDate.getTime() <= now.getTime()
  ) {
    missing.push("reassessmentDate.future");
  }

  if (
    hasText(input.ownerUserId) &&
    input.ownerUserId === input.reviewerUserId
  ) {
    missing.push("reviewer.independent");
  }
  if (
    hasText(input.reviewerUserId) &&
    input.reviewerUserId === input.approverUserId
  ) {
    missing.push("approver.independent");
  }

  return { approved: missing.length === 0, missing };
}

const ALLOWED_TRANSITIONS: Record<ChemicalRaStatus, ChemicalRaStatus[]> = {
  draft: ["identity-unresolved", "input-incomplete", "screening-complete", "archived"],
  "identity-unresolved": ["draft", "input-incomplete", "archived"],
  "input-incomplete": ["draft", "screening-complete", "archived"],
  "screening-complete": ["review-required", "input-incomplete", "archived"],
  "review-required": ["changes-requested", "approved", "archived"],
  "changes-requested": ["draft", "screening-complete", "archived"],
  approved: ["superseded", "reassessment-due", "archived"],
  superseded: ["archived"],
  "reassessment-due": ["draft", "superseded", "archived"],
  archived: [],
};

export function canTransitionChemicalRa(
  from: ChemicalRaStatus,
  to: ChemicalRaStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

type TriggerComparable = {
  sdsVersionLabel: string | null;
  mixtureComponents: unknown[] | null;
  concentration: string | null;
  quantity: string | null;
  processName: string | null;
  ventilation: string | null;
  localExhaust: string | null;
  ppe: unknown[] | null;
};

function stable(value: unknown): string {
  if (Array.isArray(value)) return JSON.stringify([...value].sort());
  return JSON.stringify(value);
}

export function detectChemicalReassessmentTriggers(
  previous: TriggerComparable,
  next: TriggerComparable,
): ChemicalReassessmentTrigger[] {
  const triggers: ChemicalReassessmentTrigger[] = [];
  if (previous.sdsVersionLabel !== next.sdsVersionLabel) triggers.push("sds-updated");
  if (stable(previous.mixtureComponents) !== stable(next.mixtureComponents)) {
    triggers.push("component-changed");
  }
  if (previous.concentration !== next.concentration) {
    triggers.push("concentration-changed");
  }
  if (previous.quantity !== next.quantity) triggers.push("quantity-changed");
  if (previous.processName !== next.processName) triggers.push("process-changed");
  if (
    previous.ventilation !== next.ventilation ||
    previous.localExhaust !== next.localExhaust
  ) {
    triggers.push("ventilation-changed");
  }
  if (stable(previous.ppe) !== stable(next.ppe)) triggers.push("ppe-changed");
  return triggers;
}

export function isChemicalRaStatus(value: unknown): value is ChemicalRaStatus {
  return (
    typeof value === "string" &&
    CHEMICAL_RA_STATUSES.includes(value as ChemicalRaStatus)
  );
}
