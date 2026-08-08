import "server-only";

import { randomUUID } from "node:crypto";
import {
  detectChemicalReassessmentTriggers,
  evaluateChemicalRaApprovalGate,
  isValidCasNumber,
  type ChemicalRaApprovalInput,
} from "@/lib/chemical/ra-governance";
import { roleAllows, type OrganizationRole } from "@/lib/organization-roles";

export type GovernanceSql = {
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
};

export type GovernanceDatabase = GovernanceSql & {
  $transaction<T>(callback: (database: GovernanceSql) => Promise<T>): Promise<T>;
};

export type ChemicalRaDraftInput = {
  organizationId: string;
  siteId: string;
  assessmentNumber: string;
  chemicalIdentity: string;
  casNumber: string | null;
  identityConfirmed: boolean;
  mixtureConfirmed: boolean;
  mixtureComponents: unknown[];
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
  ppe: unknown[];
  existingControl: unknown[];
  additionalControl: unknown[];
  reviewerUserId: string | null;
  approverUserId: string | null;
  dueDate: Date | null;
  reassessmentDate: Date | null;
  aiCandidatesReviewed: boolean;
  sources: unknown[];
  evidence: unknown[];
  unresolvedWarnings: unknown[];
  changeReason: string;
  submitForReview: boolean;
  actorUserId: string;
};

export type ChemicalRaLedgerRow = {
  id: string;
  siteId: string;
  siteName: string;
  assessmentNumber: string;
  chemicalIdentity: string;
  casNumber: string | null;
  status: string;
  currentVersionNumber: number;
  sdsVersionLabel: string | null;
  sdsIssueDate: Date | null;
  ownerUserId: string;
  reviewerUserId: string | null;
  approverUserId: string | null;
  reassessmentDate: Date | null;
  unresolvedWarningCount: number;
  approvedAt: Date | null;
  updatedAt: Date;
};

function json(value: unknown): string {
  return JSON.stringify(value);
}

export async function listChemicalRaLedger(
  database: GovernanceSql,
  organizationId: string,
  siteId?: string | null,
): Promise<ChemicalRaLedgerRow[]> {
  return database.$queryRawUnsafe<ChemicalRaLedgerRow[]>(
    `
      SELECT
        assessment."id",
        assessment."siteId",
        site."name" AS "siteName",
        assessment."assessmentNumber",
        assessment."chemicalIdentity",
        assessment."casNumber",
        assessment."status",
        assessment."currentVersionNumber",
        version."sdsVersionLabel",
        version."sdsIssueDate",
        assessment."ownerUserId",
        assessment."reviewerUserId",
        assessment."approverUserId",
        assessment."reassessmentDate",
        version."unresolvedWarningCount",
        assessment."approvedAt",
        assessment."updatedAt"
      FROM "ChemicalRaAssessment" AS assessment
      INNER JOIN "SafetySite" AS site
        ON site."id" = assessment."siteId"
       AND site."organizationId" = assessment."organizationId"
      INNER JOIN "ChemicalRaVersion" AS version
        ON version."assessmentId" = assessment."id"
       AND version."versionNumber" = assessment."currentVersionNumber"
      WHERE assessment."organizationId" = $1
        AND ($2::varchar IS NULL OR assessment."siteId" = $2)
        AND assessment."status" <> 'archived'
      ORDER BY assessment."updatedAt" DESC
      LIMIT 500
    `,
    organizationId,
    siteId ?? null,
  );
}

export async function createChemicalRaDraft(
  database: GovernanceDatabase,
  input: ChemicalRaDraftInput,
): Promise<{
  assessmentId: string;
  versionId: string;
  status: string;
  missing: string[];
}> {
  const assessmentId = randomUUID();
  const versionId = randomUUID();
  let status =
    ((isValidCasNumber(input.casNumber) && input.identityConfirmed) ||
      input.mixtureConfirmed) &&
    input.chemicalIdentity.trim()
      ? "input-incomplete"
      : "identity-unresolved";
  let missing: string[] = [];
  await database.$transaction(async (transaction) => {
    let verifiedSdsRecordId: string | null = null;
    if (input.sdsRecordId) {
      const sdsRows = await transaction.$queryRawUnsafe<Array<{ id: string }>>(
        `
          SELECT "id"
          FROM "ChemicalSdsRecord"
          WHERE "id" = $1
            AND "organizationId" = $2
            AND "siteId" = $3
            AND "chemicalIdentity" = $4
            AND "versionLabel" = $5
            AND "issueDate" = $6
            AND (
              ($7::varchar IS NULL AND "casNumber" IS NULL)
              OR "casNumber" = $7
            )
          LIMIT 1
        `,
        input.sdsRecordId,
        input.organizationId,
        input.siteId,
        input.chemicalIdentity,
        input.sdsVersionLabel,
        input.sdsIssueDate,
        input.casNumber,
      );
      verifiedSdsRecordId = sdsRows[0]?.id ?? null;
      if (!verifiedSdsRecordId) {
        missing.push("sdsRecord.verified-scope-version");
        status = "input-incomplete";
      }
    }
    // A checksum-valid CAS still requires an explicit human identity
    // confirmation. Multiple assessments remain valid when task/process differs.
    const identityUniquenessConfirmed =
      isValidCasNumber(input.casNumber) && input.identityConfirmed;
    if (input.submitForReview) {
      const gate = evaluateChemicalRaApprovalGate({
        status: "review-required",
        chemicalIdentity: input.chemicalIdentity,
        casNumber: input.casNumber,
        identityUniquenessConfirmed,
        mixtureConfirmed: input.mixtureConfirmed,
        mixtureComponents: input.mixtureComponents,
        sdsRecordId: verifiedSdsRecordId,
        sdsVersionLabel: input.sdsVersionLabel,
        sdsIssueDate: input.sdsIssueDate,
        processName: input.processName,
        taskName: input.taskName,
        quantity: input.quantity,
        concentration: input.concentration,
        exposureDuration: input.exposureDuration,
        frequency: input.frequency,
        temperature: input.temperature,
        ventilation: input.ventilation,
        localExhaust: input.localExhaust,
        skinExposure: input.skinExposure,
        ppe: input.ppe,
        existingControl: input.existingControl,
        additionalControl: input.additionalControl,
        ownerUserId: input.actorUserId,
        reviewerUserId: input.reviewerUserId,
        approverUserId: input.approverUserId,
        reassessmentDate: input.reassessmentDate,
        aiCandidatesReviewed: input.aiCandidatesReviewed,
        sources: input.sources,
        evidence: input.evidence,
        unresolvedWarningCount: input.unresolvedWarnings.length,
      });
      missing = [...new Set([...missing, ...gate.missing])];
      if (gate.approved) status = "review-required";
    }
    await transaction.$executeRawUnsafe(
      `
        INSERT INTO "ChemicalRaAssessment" (
          "id", "organizationId", "siteId", "assessmentNumber",
          "chemicalIdentity", "casNumber", "identityConfirmed",
          "mixtureConfirmed",
          "currentVersionNumber", "status", "ownerUserId", "reviewerUserId",
          "approverUserId", "dueDate", "reassessmentDate", "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, 1, $9, $10, $11, $12, $13, $14,
          clock_timestamp(), clock_timestamp()
        )
      `,
      assessmentId,
      input.organizationId,
      input.siteId,
      input.assessmentNumber,
      input.chemicalIdentity,
      input.casNumber,
      input.identityConfirmed,
      input.mixtureConfirmed,
      status,
      input.actorUserId,
      input.reviewerUserId,
      input.approverUserId,
      input.dueDate,
      input.reassessmentDate,
    );
    await transaction.$executeRawUnsafe(
      `
        INSERT INTO "ChemicalRaVersion" (
          "id", "assessmentId", "versionNumber", "chemicalIdentity",
          "casNumber", "identityConfirmed", "mixtureComponents",
          "mixtureConfirmed", "sdsRecordId",
          "sdsVersionLabel", "sdsIssueDate", "processName", "taskName",
          "quantity", "concentration", "exposureDuration", "frequency",
          "temperature", "ventilation", "localExhaust", "skinExposure",
          "ppe", "existingControl", "additionalControl", "ownerUserId",
          "reviewerUserId", "approverUserId", "status", "dueDate",
          "reassessmentDate", "aiCandidatesReviewed", "sources", "evidence",
          "unresolvedWarnings", "unresolvedWarningCount", "changeReason",
          "createdByUserId", "createdAt"
        ) VALUES (
          $1, $2, 1, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, $12,
          $13, $14, $15, $16, $17, $18, $19, $20, $21::jsonb, $22::jsonb,
          $23::jsonb, $24, $25, $26, $27, $28, $29, $30, $31::jsonb,
          $32::jsonb, $33::jsonb, $34, $35, $36, clock_timestamp()
        )
      `,
      versionId,
      assessmentId,
      input.chemicalIdentity,
      input.casNumber,
      input.identityConfirmed,
      json(input.mixtureComponents),
      input.mixtureConfirmed,
      verifiedSdsRecordId,
      input.sdsVersionLabel,
      input.sdsIssueDate,
      input.processName,
      input.taskName,
      input.quantity,
      input.concentration,
      input.exposureDuration,
      input.frequency,
      input.temperature,
      input.ventilation,
      input.localExhaust,
      input.skinExposure,
      json(input.ppe),
      json(input.existingControl),
      json(input.additionalControl),
      input.actorUserId,
      input.reviewerUserId,
      input.approverUserId,
      status,
      input.dueDate,
      input.reassessmentDate,
      input.aiCandidatesReviewed,
      json(input.sources),
      json(input.evidence),
      json(input.unresolvedWarnings),
      input.unresolvedWarnings.length,
      input.changeReason,
      input.actorUserId,
    );
    await transaction.$executeRawUnsafe(
      `
        INSERT INTO "GovernanceAuditLog" (
          "organizationId", "siteId", "actorUserId", "scope", "entityType",
          "entityId", "action", "toStatus", "metadata", "createdAt"
        ) VALUES (
          $1, $2, $3, 'chemical-ra', 'assessment', $4, 'created', $5,
          $6::jsonb, clock_timestamp()
        )
      `,
      input.organizationId,
      input.siteId,
      input.actorUserId,
      assessmentId,
      status,
      json({ versionNumber: 1, hasSdsVersion: Boolean(input.sdsVersionLabel) }),
    );
  });
  return { assessmentId, versionId, status, missing };
}

export type ChemicalRaRevisionInput = Omit<
  ChemicalRaDraftInput,
  "organizationId" | "siteId" | "assessmentNumber"
> & {
  organizationId: string;
  assessmentId: string;
};

type RevisionSourceRow = {
  assessmentId: string;
  siteId: string;
  assessmentStatus: string;
  currentVersionNumber: number;
  versionId: string;
  versionStatus: string;
  sdsVersionLabel: string | null;
  mixtureComponents: unknown[] | null;
  concentration: string | null;
  quantity: string | null;
  processName: string | null;
  ventilation: string | null;
  localExhaust: string | null;
  ppe: unknown[] | null;
};

export async function createChemicalRaRevision(
  database: GovernanceDatabase,
  input: ChemicalRaRevisionInput,
): Promise<
  | {
      ok: true;
      versionId: string;
      versionNumber: number;
      status: string;
      missing: string[];
      reassessmentTriggers: string[];
    }
  | { ok: false; reason: string }
> {
  return database.$transaction(async (transaction) => {
    const sourceRows = await transaction.$queryRawUnsafe<RevisionSourceRow[]>(
      `
        SELECT
          assessment."id" AS "assessmentId",
          assessment."siteId",
          assessment."status" AS "assessmentStatus",
          assessment."currentVersionNumber",
          version."id" AS "versionId",
          version."status" AS "versionStatus",
          version."sdsVersionLabel",
          version."mixtureComponents",
          version."concentration",
          version."quantity",
          version."processName",
          version."ventilation",
          version."localExhaust",
          version."ppe"
        FROM "ChemicalRaAssessment" assessment
        INNER JOIN "ChemicalRaVersion" version
          ON version."assessmentId" = assessment."id"
         AND version."versionNumber" = assessment."currentVersionNumber"
        WHERE assessment."id" = $1
          AND assessment."organizationId" = $2
        FOR UPDATE OF assessment, version
      `,
      input.assessmentId,
      input.organizationId,
    );
    const source = sourceRows[0];
    if (!source) return { ok: false, reason: "assessment_not_found" };
    if (
      ![
        "draft",
        "identity-unresolved",
        "input-incomplete",
        "screening-complete",
        "changes-requested",
        "reassessment-due",
      ].includes(source.assessmentStatus)
    ) {
      return { ok: false, reason: "revision_state_invalid" };
    }

    let verifiedSdsRecordId: string | null = null;
    const missing: string[] = [];
    if (input.sdsRecordId) {
      const sdsRows = await transaction.$queryRawUnsafe<Array<{ id: string }>>(
        `
          SELECT "id"
          FROM "ChemicalSdsRecord"
          WHERE "id" = $1
            AND "organizationId" = $2
            AND "siteId" = $3
            AND "chemicalIdentity" = $4
            AND "versionLabel" = $5
            AND "issueDate" = $6
            AND (
              ($7::varchar IS NULL AND "casNumber" IS NULL)
              OR "casNumber" = $7
            )
          LIMIT 1
        `,
        input.sdsRecordId,
        input.organizationId,
        source.siteId,
        input.chemicalIdentity,
        input.sdsVersionLabel,
        input.sdsIssueDate,
        input.casNumber,
      );
      verifiedSdsRecordId = sdsRows[0]?.id ?? null;
      if (!verifiedSdsRecordId) {
        missing.push("sdsRecord.verified-scope-version");
      }
    }

    const identityConfirmed =
      isValidCasNumber(input.casNumber) && input.identityConfirmed;
    let status =
      (identityConfirmed || input.mixtureConfirmed) &&
      input.chemicalIdentity.trim()
        ? "input-incomplete"
        : "identity-unresolved";
    if (input.submitForReview) {
      const gate = evaluateChemicalRaApprovalGate({
        status: "review-required",
        chemicalIdentity: input.chemicalIdentity,
        casNumber: input.casNumber,
        identityUniquenessConfirmed: identityConfirmed,
        mixtureConfirmed: input.mixtureConfirmed,
        mixtureComponents: input.mixtureComponents,
        sdsRecordId: verifiedSdsRecordId,
        sdsVersionLabel: input.sdsVersionLabel,
        sdsIssueDate: input.sdsIssueDate,
        processName: input.processName,
        taskName: input.taskName,
        quantity: input.quantity,
        concentration: input.concentration,
        exposureDuration: input.exposureDuration,
        frequency: input.frequency,
        temperature: input.temperature,
        ventilation: input.ventilation,
        localExhaust: input.localExhaust,
        skinExposure: input.skinExposure,
        ppe: input.ppe,
        existingControl: input.existingControl,
        additionalControl: input.additionalControl,
        ownerUserId: input.actorUserId,
        reviewerUserId: input.reviewerUserId,
        approverUserId: input.approverUserId,
        reassessmentDate: input.reassessmentDate,
        aiCandidatesReviewed: input.aiCandidatesReviewed,
        sources: input.sources,
        evidence: input.evidence,
        unresolvedWarningCount: input.unresolvedWarnings.length,
      });
      missing.push(...gate.missing);
      if (gate.approved && missing.length === 0) status = "review-required";
    }

    const nextVersion = source.currentVersionNumber + 1;
    const versionId = randomUUID();
    const changed = await transaction.$executeRawUnsafe(
      `
        UPDATE "ChemicalRaVersion"
        SET "status" = 'superseded'
        WHERE "id" = $1
          AND "versionNumber" = $2
          AND "status" = $3
      `,
      source.versionId,
      source.currentVersionNumber,
      source.versionStatus,
    );
    if (changed !== 1) throw new Error("chemical_ra_revision_race");

    await transaction.$executeRawUnsafe(
      `
        INSERT INTO "ChemicalRaVersion" (
          "id", "assessmentId", "versionNumber", "chemicalIdentity",
          "casNumber", "identityConfirmed", "mixtureComponents",
          "mixtureConfirmed", "sdsRecordId", "sdsVersionLabel",
          "sdsIssueDate", "processName", "taskName", "quantity",
          "concentration", "exposureDuration", "frequency", "temperature",
          "ventilation", "localExhaust", "skinExposure", "ppe",
          "existingControl", "additionalControl", "ownerUserId",
          "reviewerUserId", "approverUserId", "status", "dueDate",
          "reassessmentDate", "aiCandidatesReviewed", "sources", "evidence",
          "unresolvedWarnings", "unresolvedWarningCount", "changeReason",
          "createdByUserId", "createdAt"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18, $19, $20, $21, $22::jsonb, $23::jsonb,
          $24::jsonb, $25, $26, $27, $28, $29, $30, $31, $32::jsonb,
          $33::jsonb, $34::jsonb, $35, $36, $37, clock_timestamp()
        )
      `,
      versionId,
      source.assessmentId,
      nextVersion,
      input.chemicalIdentity,
      input.casNumber,
      input.identityConfirmed,
      json(input.mixtureComponents),
      input.mixtureConfirmed,
      verifiedSdsRecordId,
      input.sdsVersionLabel,
      input.sdsIssueDate,
      input.processName,
      input.taskName,
      input.quantity,
      input.concentration,
      input.exposureDuration,
      input.frequency,
      input.temperature,
      input.ventilation,
      input.localExhaust,
      input.skinExposure,
      json(input.ppe),
      json(input.existingControl),
      json(input.additionalControl),
      input.actorUserId,
      input.reviewerUserId,
      input.approverUserId,
      status,
      input.dueDate,
      input.reassessmentDate,
      input.aiCandidatesReviewed,
      json(input.sources),
      json(input.evidence),
      json(input.unresolvedWarnings),
      input.unresolvedWarnings.length,
      input.changeReason,
      input.actorUserId,
    );
    const assessmentChanged = await transaction.$executeRawUnsafe(
      `
        UPDATE "ChemicalRaAssessment"
        SET "chemicalIdentity" = $4,
            "casNumber" = $5,
            "identityConfirmed" = $6,
            "mixtureConfirmed" = $7,
            "currentVersionNumber" = $3,
            "status" = $8,
            "ownerUserId" = $9,
            "reviewerUserId" = $10,
            "approverUserId" = $11,
            "dueDate" = $12,
            "reassessmentDate" = $13,
            "approvedAt" = NULL,
            "updatedAt" = clock_timestamp()
        WHERE "id" = $1
          AND "organizationId" = $2
          AND "currentVersionNumber" = $14
      `,
      source.assessmentId,
      input.organizationId,
      nextVersion,
      input.chemicalIdentity,
      input.casNumber,
      input.identityConfirmed,
      input.mixtureConfirmed,
      status,
      input.actorUserId,
      input.reviewerUserId,
      input.approverUserId,
      input.dueDate,
      input.reassessmentDate,
      source.currentVersionNumber,
    );
    if (assessmentChanged !== 1) throw new Error("chemical_ra_revision_race");

    const reassessmentTriggers = detectChemicalReassessmentTriggers(
      {
        sdsVersionLabel: source.sdsVersionLabel,
        mixtureComponents: asArray(source.mixtureComponents),
        concentration: source.concentration,
        quantity: source.quantity,
        processName: source.processName,
        ventilation: source.ventilation,
        localExhaust: source.localExhaust,
        ppe: asArray(source.ppe),
      },
      {
        sdsVersionLabel: input.sdsVersionLabel,
        mixtureComponents: input.mixtureComponents,
        concentration: input.concentration,
        quantity: input.quantity,
        processName: input.processName,
        ventilation: input.ventilation,
        localExhaust: input.localExhaust,
        ppe: input.ppe,
      },
    );
    for (const triggerType of reassessmentTriggers) {
      await transaction.$executeRawUnsafe(
        `
          INSERT INTO "ChemicalReassessmentTrigger" (
            "id", "assessmentId", "triggerType", "reason", "sourceRef",
            "detectedAt"
          )
          SELECT $1, $2, $3, $4, $5, clock_timestamp()
          WHERE NOT EXISTS (
            SELECT 1
            FROM "ChemicalReassessmentTrigger"
            WHERE "assessmentId" = $2
              AND "triggerType" = $3
              AND "resolvedAt" IS NULL
          )
        `,
        randomUUID(),
        source.assessmentId,
        triggerType,
        "評価条件の変更を検知したため、改訂版の承認まで再評価を継続します。",
        versionId,
      );
    }
    await transaction.$executeRawUnsafe(
      `
        INSERT INTO "GovernanceAuditLog" (
          "organizationId", "siteId", "actorUserId", "scope",
          "entityType", "entityId", "action", "fromStatus", "toStatus",
          "metadata", "createdAt"
        ) VALUES (
          $1, $2, $3, 'chemical-ra', 'assessment', $4,
          'revision-created', $5, $6, $7::jsonb, clock_timestamp()
        )
      `,
      input.organizationId,
      source.siteId,
      input.actorUserId,
      source.assessmentId,
      source.assessmentStatus,
      status,
      json({
        previousVersionNumber: source.currentVersionNumber,
        versionId,
        versionNumber: nextVersion,
        reassessmentTriggers,
      }),
    );
    return {
      ok: true,
      versionId,
      versionNumber: nextVersion,
      status,
      missing: [...new Set(missing)],
      reassessmentTriggers,
    };
  });
}

type ApprovalRow = ChemicalRaApprovalInput & {
  assessmentId: string;
  versionId: string;
  organizationId: string;
  siteId: string;
  currentVersionNumber: number;
  versionNumber: number;
};

type MemberRoleRow = { userId: string; role: string };

function asArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}

function asDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

export async function recordChemicalRaReviewDecision(
  database: GovernanceDatabase,
  input: {
    organizationId: string;
    assessmentId: string;
    actorUserId: string;
    actorRole: OrganizationRole;
    decision: "recommend-approval" | "changes-requested";
    comment: string | null;
    now?: Date;
  },
): Promise<
  | {
      ok: true;
      reviewDecisionId: string;
      versionNumber: number;
      decision: "recommend-approval" | "changes-requested";
    }
  | { ok: false; reason: string; missing?: string[] }
> {
  return database.$transaction(async (transaction) => {
    const rows = await transaction.$queryRawUnsafe<ApprovalRow[]>(
      `
        SELECT
          assessment."id" AS "assessmentId",
          assessment."organizationId",
          assessment."siteId",
          assessment."currentVersionNumber",
          version."id" AS "versionId",
          version."versionNumber",
          version."status",
          version."chemicalIdentity",
          version."casNumber",
          version."identityConfirmed" AS "identityUniquenessConfirmed",
          version."mixtureConfirmed",
          version."mixtureComponents",
          version."sdsRecordId",
          version."sdsVersionLabel",
          version."sdsIssueDate",
          version."processName",
          version."taskName",
          version."quantity",
          version."concentration",
          version."exposureDuration",
          version."frequency",
          version."temperature",
          version."ventilation",
          version."localExhaust",
          version."skinExposure",
          version."ppe",
          version."existingControl",
          version."additionalControl",
          version."ownerUserId",
          version."reviewerUserId",
          version."approverUserId",
          version."reassessmentDate",
          version."aiCandidatesReviewed",
          version."sources",
          version."evidence",
          version."unresolvedWarningCount"
        FROM "ChemicalRaAssessment" AS assessment
        INNER JOIN "ChemicalRaVersion" AS version
          ON version."assessmentId" = assessment."id"
         AND version."versionNumber" = assessment."currentVersionNumber"
        WHERE assessment."id" = $1
          AND assessment."organizationId" = $2
        FOR UPDATE
      `,
      input.assessmentId,
      input.organizationId,
    );
    const row = rows[0];
    if (!row) return { ok: false, reason: "assessment_not_found" };
    if (row.status !== "review-required") {
      return { ok: false, reason: "review_state_invalid" };
    }
    if (
      row.reviewerUserId !== input.actorUserId ||
      !roleAllows(input.actorRole, "reviewer")
    ) {
      return { ok: false, reason: "assigned_reviewer_required" };
    }
    if (
      input.decision === "changes-requested" &&
      !input.comment?.trim()
    ) {
      return { ok: false, reason: "changes_comment_required" };
    }

    const memberships =
      await transaction.$queryRawUnsafe<MemberRoleRow[]>(
        `
          SELECT "userId", "role"
          FROM "SafetyMembership"
          WHERE "organizationId" = $1
            AND "status" = 'active'
            AND "userId" = $2
          LIMIT 1
        `,
        input.organizationId,
        input.actorUserId,
      );
    const membershipRole = memberships[0]?.role;
    if (
      !membershipRole ||
      !["viewer", "editor", "reviewer", "approver", "admin"].includes(
        membershipRole,
      ) ||
      !roleAllows(membershipRole as OrganizationRole, "reviewer")
    ) {
      return { ok: false, reason: "reviewer_role_invalid" };
    }

    if (input.decision === "recommend-approval") {
      const gate = evaluateChemicalRaApprovalGate(
        {
          ...row,
          mixtureComponents: asArray(row.mixtureComponents),
          ppe: asArray(row.ppe),
          existingControl: asArray(row.existingControl),
          additionalControl: asArray(row.additionalControl),
          sources: asArray(row.sources),
          evidence: asArray(row.evidence),
          sdsIssueDate: asDate(row.sdsIssueDate),
          reassessmentDate: asDate(row.reassessmentDate),
        },
        input.now ?? new Date(),
      );
      if (!gate.approved) {
        return {
          ok: false,
          reason: "review_gate_failed",
          missing: gate.missing,
        };
      }
    }

    const reviewDecisionId = randomUUID();
    await transaction.$executeRawUnsafe(
      `
        INSERT INTO "ChemicalRaReviewDecision" (
          "id", "assessmentId", "versionId", "reviewerUserId",
          "decision", "comment", "decidedAt", "createdAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, clock_timestamp(), clock_timestamp())
      `,
      reviewDecisionId,
      row.assessmentId,
      row.versionId,
      input.actorUserId,
      input.decision,
      input.comment,
    );

    if (input.decision === "changes-requested") {
      const changed = await transaction.$executeRawUnsafe(
        `
          UPDATE "ChemicalRaVersion"
          SET "status" = 'changes-requested'
          WHERE "id" = $1
            AND "versionNumber" = $2
            AND "status" = 'review-required'
        `,
        row.versionId,
        row.versionNumber,
      );
      if (changed !== 1) throw new Error("chemical_ra_review_race");
      await transaction.$executeRawUnsafe(
        `
          UPDATE "ChemicalRaAssessment"
          SET "status" = 'changes-requested',
              "updatedAt" = clock_timestamp()
          WHERE "id" = $1
            AND "organizationId" = $2
            AND "currentVersionNumber" = $3
        `,
        row.assessmentId,
        input.organizationId,
        row.versionNumber,
      );
    }

    await transaction.$executeRawUnsafe(
      `
        INSERT INTO "GovernanceAuditLog" (
          "organizationId", "siteId", "actorUserId", "scope",
          "entityType", "entityId", "action", "fromStatus", "toStatus",
          "metadata", "createdAt"
        ) VALUES (
          $1, $2, $3, 'chemical-ra', 'assessment', $4,
          'review-decision-recorded', 'review-required', $5,
          $6::jsonb, clock_timestamp()
        )
      `,
      input.organizationId,
      row.siteId,
      input.actorUserId,
      row.assessmentId,
      input.decision === "changes-requested"
        ? "changes-requested"
        : "review-required",
      json({
        reviewDecisionId,
        versionId: row.versionId,
        versionNumber: row.versionNumber,
        decision: input.decision,
      }),
    );
    return {
      ok: true,
      reviewDecisionId,
      versionNumber: row.versionNumber,
      decision: input.decision,
    };
  });
}

export async function approveChemicalRaVersion(
  database: GovernanceDatabase,
  input: {
    organizationId: string;
    assessmentId: string;
    actorUserId: string;
    actorRole: OrganizationRole;
    comment: string | null;
    now?: Date;
  },
): Promise<
  | { ok: true; approvalId: string }
  | { ok: false; reason: string; missing?: string[] }
> {
  return database.$transaction(async (transaction) => {
    const rows = await transaction.$queryRawUnsafe<ApprovalRow[]>(
      `
        SELECT
          assessment."id" AS "assessmentId",
          assessment."organizationId",
          assessment."siteId",
          assessment."currentVersionNumber",
          version."id" AS "versionId",
          version."versionNumber",
          version."status",
          version."chemicalIdentity",
          version."casNumber",
          version."identityConfirmed" AS "identityUniquenessConfirmed",
          version."mixtureConfirmed",
          version."mixtureComponents",
          version."sdsRecordId",
          version."sdsVersionLabel",
          version."sdsIssueDate",
          version."processName",
          version."taskName",
          version."quantity",
          version."concentration",
          version."exposureDuration",
          version."frequency",
          version."temperature",
          version."ventilation",
          version."localExhaust",
          version."skinExposure",
          version."ppe",
          version."existingControl",
          version."additionalControl",
          version."ownerUserId",
          version."reviewerUserId",
          version."approverUserId",
          version."reassessmentDate",
          version."aiCandidatesReviewed",
          version."sources",
          version."evidence",
          version."unresolvedWarningCount"
        FROM "ChemicalRaAssessment" AS assessment
        INNER JOIN "ChemicalRaVersion" AS version
          ON version."assessmentId" = assessment."id"
         AND version."versionNumber" = assessment."currentVersionNumber"
        WHERE assessment."id" = $1
          AND assessment."organizationId" = $2
        FOR UPDATE
      `,
      input.assessmentId,
      input.organizationId,
    );
    const row = rows[0];
    if (!row) return { ok: false, reason: "assessment_not_found" };
    if (
      row.approverUserId !== input.actorUserId ||
      !roleAllows(input.actorRole, "approver")
    ) {
      return { ok: false, reason: "assigned_approver_required" };
    }

    const memberRoles = await transaction.$queryRawUnsafe<MemberRoleRow[]>(
      `
        SELECT "userId", "role"
        FROM "SafetyMembership"
        WHERE "organizationId" = $1
          AND "status" = 'active'
          AND "userId" IN ($2, $3)
      `,
      input.organizationId,
      row.reviewerUserId,
      row.approverUserId,
    );
    const reviewerRole = memberRoles.find(
      (membership) => membership.userId === row.reviewerUserId,
    )?.role;
    const approverRole = memberRoles.find(
      (membership) => membership.userId === row.approverUserId,
    )?.role;
    if (
      !reviewerRole ||
      !approverRole ||
      !["viewer", "editor", "reviewer", "approver", "admin"].includes(
        reviewerRole,
      ) ||
      !["viewer", "editor", "reviewer", "approver", "admin"].includes(
        approverRole,
      ) ||
      !roleAllows(reviewerRole as OrganizationRole, "reviewer") ||
      !roleAllows(approverRole as OrganizationRole, "approver")
    ) {
      return { ok: false, reason: "reviewer_or_approver_role_invalid" };
    }

    const reviewRows = await transaction.$queryRawUnsafe<
      Array<{
        id: string;
        reviewerUserId: string;
        decision: string;
        decidedAt: Date;
      }>
    >(
      `
        SELECT "id", "reviewerUserId", "decision", "decidedAt"
        FROM "ChemicalRaReviewDecision"
        WHERE "assessmentId" = $1
          AND "versionId" = $2
          AND "reviewerUserId" = $3
          AND "decision" = 'recommend-approval'
        LIMIT 1
        FOR SHARE
      `,
      row.assessmentId,
      row.versionId,
      row.reviewerUserId,
    );
    const review = reviewRows[0];
    if (!review) {
      return { ok: false, reason: "reviewer_decision_required" };
    }

    const gate = evaluateChemicalRaApprovalGate(
      {
        ...row,
        mixtureComponents: asArray(row.mixtureComponents),
        ppe: asArray(row.ppe),
        existingControl: asArray(row.existingControl),
        additionalControl: asArray(row.additionalControl),
        sources: asArray(row.sources),
        evidence: asArray(row.evidence),
        sdsIssueDate: asDate(row.sdsIssueDate),
        reassessmentDate: asDate(row.reassessmentDate),
      },
      input.now ?? new Date(),
    );
    if (!gate.approved) {
      return { ok: false, reason: "approval_gate_failed", missing: gate.missing };
    }

    const approvalId = randomUUID();
    await transaction.$executeRawUnsafe(
      `
        INSERT INTO "ChemicalRaApproval" (
          "id", "assessmentId", "versionId", "reviewerUserId",
          "approverUserId", "decision", "comment", "reviewedAt",
          "approvedAt", "createdAt"
        ) VALUES (
          $1, $2, $3, $4, $5, 'approved', $6,
          $7, clock_timestamp(), clock_timestamp()
        )
      `,
      approvalId,
      row.assessmentId,
      row.versionId,
      row.reviewerUserId,
      row.approverUserId,
      input.comment,
      review.decidedAt,
    );
    const versionChanged = await transaction.$executeRawUnsafe(
      `
        UPDATE "ChemicalRaVersion"
        SET "status" = 'approved'
        WHERE "id" = $1 AND "status" = 'review-required'
      `,
      row.versionId,
    );
    if (versionChanged !== 1) {
      throw new Error("chemical_ra_approval_race");
    }
    await transaction.$executeRawUnsafe(
      `
        UPDATE "ChemicalRaAssessment"
        SET "status" = 'approved',
            "approvedAt" = clock_timestamp(),
            "updatedAt" = clock_timestamp()
        WHERE "id" = $1
          AND "organizationId" = $2
          AND "currentVersionNumber" = $3
      `,
      row.assessmentId,
      input.organizationId,
      row.versionNumber,
    );
    await transaction.$executeRawUnsafe(
      `
        INSERT INTO "GovernanceAuditLog" (
          "organizationId", "siteId", "actorUserId", "scope", "entityType",
          "entityId", "action", "fromStatus", "toStatus", "metadata", "createdAt"
        ) VALUES (
          $1, $2, $3, 'chemical-ra', 'assessment', $4, 'approved',
          'review-required', 'approved', $5::jsonb, clock_timestamp()
        )
      `,
      input.organizationId,
      row.siteId,
      input.actorUserId,
      row.assessmentId,
      json({
        versionNumber: row.versionNumber,
        approvalId,
        reviewDecisionId: review.id,
      }),
    );
    await transaction.$executeRawUnsafe(
      `
        UPDATE "ChemicalReassessmentTrigger"
        SET "resolvedAt" = clock_timestamp(),
            "resolvedBy" = $2
        WHERE "assessmentId" = $1
          AND "resolvedAt" IS NULL
      `,
      row.assessmentId,
      input.actorUserId,
    );
    return { ok: true, approvalId };
  });
}

export async function createChemicalSdsRecord(
  database: GovernanceDatabase,
  input: {
    organizationId: string;
    siteId: string;
    chemicalIdentity: string;
    casNumber: string | null;
    mixtureConfirmed: boolean;
    versionLabel: string;
    issueDate: Date;
    sourceUrl: string | null;
    evidence: unknown[];
    actorUserId: string;
  },
): Promise<{
  sdsRecordId: string;
  reassessmentAssessmentIds: string[];
}> {
  const sdsRecordId = randomUUID();
  return database.$transaction(async (transaction) => {
    await transaction.$executeRawUnsafe(
      `
        INSERT INTO "ChemicalSdsRecord" (
          "id", "organizationId", "siteId", "chemicalIdentity", "casNumber",
          "mixtureConfirmed", "versionLabel", "issueDate", "sourceUrl",
          "evidence", "createdByUserId", "createdAt"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11,
          clock_timestamp()
        )
      `,
      sdsRecordId,
      input.organizationId,
      input.siteId,
      input.chemicalIdentity,
      input.casNumber,
      input.mixtureConfirmed,
      input.versionLabel,
      input.issueDate,
      input.sourceUrl,
      json(input.evidence),
      input.actorUserId,
    );
    const affected = await transaction.$queryRawUnsafe<
      Array<{ id: string; siteId: string }>
    >(
      `
        SELECT assessment."id", assessment."siteId"
        FROM "ChemicalRaAssessment" assessment
        INNER JOIN "ChemicalRaVersion" version
          ON version."assessmentId" = assessment."id"
         AND version."versionNumber" = assessment."currentVersionNumber"
        WHERE assessment."organizationId" = $1
          AND assessment."siteId" = $2
          AND assessment."status" = 'approved'
          AND (
            ($3::varchar IS NOT NULL AND assessment."casNumber" = $3)
            OR (
              $3::varchar IS NULL
              AND assessment."chemicalIdentity" = $4
            )
          )
          AND version."sdsVersionLabel" IS DISTINCT FROM $5
        FOR UPDATE OF assessment
      `,
      input.organizationId,
      input.siteId,
      input.casNumber,
      input.chemicalIdentity,
      input.versionLabel,
    );
    for (const assessment of affected) {
      await transaction.$executeRawUnsafe(
        `
          INSERT INTO "ChemicalReassessmentTrigger" (
            "id", "assessmentId", "triggerType", "reason", "sourceRef",
            "detectedAt"
          ) VALUES (
            $1, $2, 'sds-updated', $3, $4, clock_timestamp()
          )
        `,
        randomUUID(),
        assessment.id,
        "SDSの新しい版が登録されたため再評価が必要です。",
        sdsRecordId,
      );
      await transaction.$executeRawUnsafe(
        `
          UPDATE "ChemicalRaAssessment"
          SET "status" = 'reassessment-due',
              "updatedAt" = clock_timestamp()
          WHERE "id" = $1
            AND "organizationId" = $2
            AND "status" = 'approved'
        `,
        assessment.id,
        input.organizationId,
      );
      await transaction.$executeRawUnsafe(
        `
          INSERT INTO "GovernanceAuditLog" (
            "organizationId", "siteId", "actorUserId", "scope",
            "entityType", "entityId", "action", "fromStatus", "toStatus",
            "metadata", "createdAt"
          ) VALUES (
            $1, $2, $3, 'chemical-ra', 'assessment', $4,
            'sds-reassessment-triggered', 'approved', 'reassessment-due',
            $5::jsonb, clock_timestamp()
          )
        `,
        input.organizationId,
        assessment.siteId,
        input.actorUserId,
        assessment.id,
        json({ sdsRecordId, versionLabel: input.versionLabel }),
      );
    }
    await transaction.$executeRawUnsafe(
      `
        INSERT INTO "GovernanceAuditLog" (
          "organizationId", "siteId", "actorUserId", "scope",
          "entityType", "entityId", "action", "toStatus", "metadata",
          "createdAt"
        ) VALUES (
          $1, $2, $3, 'chemical-ra', 'sds-record', $4, 'created',
          'version-recorded', $5::jsonb, clock_timestamp()
        )
      `,
      input.organizationId,
      input.siteId,
      input.actorUserId,
      sdsRecordId,
      json({
        versionLabel: input.versionLabel,
        issueDate: input.issueDate.toISOString(),
        reassessmentCount: affected.length,
      }),
    );
    return {
      sdsRecordId,
      reassessmentAssessmentIds: affected.map((row) => row.id),
    };
  });
}

export async function flagChemicalRaReassessment(
  database: GovernanceDatabase,
  input: {
    organizationId: string;
    assessmentId: string;
    actorUserId: string;
    triggerType:
      | "sds-updated"
      | "component-changed"
      | "concentration-changed"
      | "quantity-changed"
      | "process-changed"
      | "ventilation-changed"
      | "ppe-changed"
      | "law-changed"
      | "incident-or-near-miss"
      | "periodic-date";
    reason: string;
    sourceRef: string | null;
  },
): Promise<{ ok: true; triggerId: string } | { ok: false; reason: string }> {
  return database.$transaction(async (transaction) => {
    const rows = await transaction.$queryRawUnsafe<
      Array<{ id: string; siteId: string; status: string }>
    >(
      `
        SELECT "id", "siteId", "status"
        FROM "ChemicalRaAssessment"
        WHERE "id" = $1
          AND "organizationId" = $2
          AND "status" IN ('approved', 'reassessment-due')
        FOR UPDATE
      `,
      input.assessmentId,
      input.organizationId,
    );
    const assessment = rows[0];
    if (!assessment) {
      return { ok: false, reason: "approved_assessment_not_found" };
    }
    const triggerId = randomUUID();
    await transaction.$executeRawUnsafe(
      `
        INSERT INTO "ChemicalReassessmentTrigger" (
          "id", "assessmentId", "triggerType", "reason", "sourceRef",
          "detectedAt"
        ) VALUES ($1, $2, $3, $4, $5, clock_timestamp())
      `,
      triggerId,
      assessment.id,
      input.triggerType,
      input.reason,
      input.sourceRef,
    );
    await transaction.$executeRawUnsafe(
      `
        UPDATE "ChemicalRaAssessment"
        SET "status" = 'reassessment-due',
            "updatedAt" = clock_timestamp()
        WHERE "id" = $1 AND "organizationId" = $2
      `,
      assessment.id,
      input.organizationId,
    );
    await transaction.$executeRawUnsafe(
      `
        INSERT INTO "GovernanceAuditLog" (
          "organizationId", "siteId", "actorUserId", "scope",
          "entityType", "entityId", "action", "fromStatus", "toStatus",
          "metadata", "createdAt"
        ) VALUES (
          $1, $2, $3, 'chemical-ra', 'assessment', $4,
          'reassessment-triggered', $5, 'reassessment-due',
          $6::jsonb, clock_timestamp()
        )
      `,
      input.organizationId,
      assessment.siteId,
      input.actorUserId,
      assessment.id,
      assessment.status,
      json({ triggerId, triggerType: input.triggerType }),
    );
    return { ok: true, triggerId };
  });
}

export async function processDueChemicalReassessments(
  database: GovernanceDatabase,
): Promise<{ processed: number }> {
  return database.$transaction(async (transaction) => {
    const due = await transaction.$queryRawUnsafe<
      Array<{ id: string; organizationId: string; siteId: string }>
    >(
      `
        SELECT "id", "organizationId", "siteId"
        FROM "ChemicalRaAssessment"
        WHERE "status" = 'approved'
          AND "reassessmentDate" IS NOT NULL
          AND "reassessmentDate" <= clock_timestamp()
        ORDER BY "reassessmentDate"
        LIMIT 500
        FOR UPDATE SKIP LOCKED
      `,
    );
    for (const assessment of due) {
      const triggerId = randomUUID();
      await transaction.$executeRawUnsafe(
        `
          INSERT INTO "ChemicalReassessmentTrigger" (
            "id", "assessmentId", "triggerType", "reason", "detectedAt"
          ) VALUES (
            $1, $2, 'periodic-date',
            '設定された定期再評価日へ到達しました。',
            clock_timestamp()
          )
        `,
        triggerId,
        assessment.id,
      );
      await transaction.$executeRawUnsafe(
        `
          UPDATE "ChemicalRaAssessment"
          SET "status" = 'reassessment-due',
              "updatedAt" = clock_timestamp()
          WHERE "id" = $1 AND "status" = 'approved'
        `,
        assessment.id,
      );
      await transaction.$executeRawUnsafe(
        `
          INSERT INTO "GovernanceAuditLog" (
            "organizationId", "siteId", "actorUserId", "scope",
            "entityType", "entityId", "action", "fromStatus", "toStatus",
            "metadata", "createdAt"
          ) VALUES (
            $1, $2, 'system:cron', 'chemical-ra', 'assessment', $3,
            'periodic-reassessment-triggered', 'approved',
            'reassessment-due', $4::jsonb, clock_timestamp()
          )
        `,
        assessment.organizationId,
        assessment.siteId,
        assessment.id,
        json({ triggerId, triggerType: "periodic-date" }),
      );
    }
    return { processed: due.length };
  });
}
