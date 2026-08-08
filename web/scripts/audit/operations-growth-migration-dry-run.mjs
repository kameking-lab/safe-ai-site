import { createHash, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  databaseTargetFingerprint,
  verifyEncryptedBackup,
} from "./operations-growth-encrypted-backup.mjs";

const applyRequested = process.argv.includes("--apply");
const readinessRequested = process.argv.includes("--verify-apply-readiness");
const dryRunRequested =
  process.argv.includes("--dry-run") ||
  (!applyRequested && !readinessRequested);
if (
  Number(applyRequested) +
    Number(readinessRequested) +
    Number(process.argv.includes("--dry-run")) >
  1
) {
  throw new Error("migration operation flags are mutually exclusive");
}
if (
  applyRequested &&
  process.env.OPERATIONS_GROWTH_MIGRATION_CONFIRM !==
    "apply-additive-2026-07-29"
) {
  throw new Error("explicit additive migration confirmation is required");
}

const migrationPath = resolve(
  process.cwd(),
  "prisma/operations/operations-growth-cockpit-2026-07-29-up.sql",
);
if (!process.env.DATABASE_URL?.trim()) {
  try {
    process.loadEnvFile(resolve(process.cwd(), "../.env.local"));
  } catch {
    // The caller may provide DATABASE_URL through the deployment environment.
  }
}
if (!process.env.DATABASE_URL?.trim()) {
  throw new Error("DATABASE_URL is required");
}

const actualTargetFingerprint = databaseTargetFingerprint(
  process.env.DATABASE_URL,
);
const expectedTargetFingerprint =
  process.env.OPERATIONS_GROWTH_TARGET_FINGERPRINT?.trim().toLowerCase() ?? "";
if (applyRequested || readinessRequested) {
  if (!/^[a-f0-9]{64}$/.test(expectedTargetFingerprint)) {
    throw new Error("production target fingerprint is required");
  }
  if (
    !timingSafeEqual(
      Buffer.from(actualTargetFingerprint, "hex"),
      Buffer.from(expectedTargetFingerprint, "hex"),
    )
  ) {
    throw new Error("database target fingerprint mismatch");
  }
}

function requireRecoveryEvidence() {
  if (!applyRequested && !readinessRequested) return null;
  const evidenceId =
    process.env.OPERATIONS_GROWTH_RECOVERY_EVIDENCE_ID?.trim() ?? "";
  const backupFile = process.env.OPERATIONS_GROWTH_BACKUP_FILE?.trim() ?? "";
  const keyFile = process.env.OPERATIONS_GROWTH_BACKUP_KEY_FILE?.trim() ?? "";
  const backupSha256 =
    process.env.OPERATIONS_GROWTH_BACKUP_SHA256?.trim().toLowerCase() ?? "";
  if (
    !/^[A-Za-z0-9._:-]{8,160}$/.test(evidenceId) ||
    basename(backupFile) !== backupFile ||
    basename(keyFile) !== keyFile ||
    !/^operations-growth-[0-9TZ]+\.enc\.json$/.test(backupFile) ||
    !/^operations-growth-[0-9TZ]+\.key\.dpapi$/.test(keyFile) ||
    !/^[a-f0-9]{64}$/.test(backupSha256)
  ) {
    throw new Error("valid encrypted backup evidence is required");
  }
  const verified = verifyEncryptedBackup({
    backupPath: resolve(process.cwd(), "../.vercel/backups", backupFile),
    keyPath: resolve(process.cwd(), "../.vercel/backups", keyFile),
    expectedFileSha256: backupSha256,
    expectedTargetFingerprint,
  });
  if (verified.backupId !== evidenceId) {
    throw new Error("encrypted backup evidence ID mismatch");
  }
  const createdAtMs = Date.parse(verified.createdAt);
  const ageMs = Date.now() - createdAtMs;
  if (
    !Number.isFinite(createdAtMs) ||
    ageMs < -5 * 60 * 1_000 ||
    ageMs > 24 * 60 * 60 * 1_000
  ) {
    throw new Error("verified encrypted backup must be within 24 hours");
  }
  return {
    ...verified,
    backupFile,
    keyFile,
    verifiedAt: new Date().toISOString(),
  };
}

const recoveryEvidence = requireRecoveryEvidence();

const migration = readFileSync(migrationPath, "utf8");
const expectedMigrationHash =
  "5a9717757559da75c42b36958f41109176038a5ade817b7896919b565452088b";
const migrationHash = createHash("sha256")
  .update(migration.replace(/\r\n/g, "\n"))
  .digest("hex");
if (migrationHash !== expectedMigrationHash) {
  throw new Error("migration content fingerprint mismatch");
}
const prohibited = /\b(?:ALTER|DROP|TRUNCATE|DELETE|UPDATE|INSERT)\b/i;
const executable = migration
  .split(/\r?\n/)
  .filter((line) => !line.trimStart().startsWith("--"))
  .join("\n");
if (prohibited.test(executable)) {
  throw new Error("migration is not additive-only");
}

const statements = executable
  .split(";")
  .map((statement) => statement.trim())
  .filter(
    (statement) =>
      statement.length > 0 && !/^(?:BEGIN|COMMIT)$/i.test(statement),
  );
if (statements.length !== 5) {
  throw new Error("unexpected migration statement count");
}

const normalizedStatements = statements.map((statement) =>
  statement.replace(/\s+/g, " ").trim(),
);
const expectedIndexStatements = [
  'CREATE INDEX IF NOT EXISTS "AutomationFunnelEvent_expiresAt_idx" ON "AutomationFunnelEvent"("expiresAt")',
  'CREATE INDEX IF NOT EXISTS "AutomationFunnelEvent_eventDate_event_idx" ON "AutomationFunnelEvent"("eventDate", "event")',
  'CREATE INDEX IF NOT EXISTS "AutomationFunnelEvent_routeTemplate_eventDate_idx" ON "AutomationFunnelEvent"("routeTemplate", "eventDate")',
  'CREATE INDEX IF NOT EXISTS "AutomationFunnelEvent_deployment_eventDate_idx" ON "AutomationFunnelEvent"("deployment", "eventDate")',
];
if (
  !normalizedStatements[0].startsWith(
    'CREATE TABLE IF NOT EXISTS "AutomationFunnelEvent" (',
  ) ||
  JSON.stringify(normalizedStatements.slice(1)) !==
    JSON.stringify(expectedIndexStatements)
) {
  throw new Error(
    "migration statement is outside the additive target allowlist",
  );
}

const expectedColumns = [
  {
    columnName: "id",
    dataType: "bigint",
    notNull: true,
    defaultExpression: "nextval('\"AutomationFunnelEvent_id_seq\"'::regclass)",
  },
  {
    columnName: "event",
    dataType: "character varying(48)",
    notNull: true,
    defaultExpression: "",
  },
  {
    columnName: "routeTemplate",
    dataType: "character varying(120)",
    notNull: true,
    defaultExpression: "",
  },
  {
    columnName: "ctaPosition",
    dataType: "character varying(48)",
    notNull: false,
    defaultExpression: "",
  },
  {
    columnName: "consultationCategory",
    dataType: "character varying(48)",
    notNull: false,
    defaultExpression: "",
  },
  {
    columnName: "budgetBucket",
    dataType: "character varying(32)",
    notNull: false,
    defaultExpression: "",
  },
  {
    columnName: "deviceClass",
    dataType: "character varying(12)",
    notNull: true,
    defaultExpression: "",
  },
  {
    columnName: "eventDate",
    dataType: "date",
    notNull: true,
    defaultExpression: "",
  },
  {
    columnName: "anonymousBucket",
    dataType: "character varying(64)",
    notNull: true,
    defaultExpression: "",
  },
  {
    columnName: "consentState",
    dataType: "character varying(12)",
    notNull: true,
    defaultExpression: "",
  },
  {
    columnName: "deployment",
    dataType: "character varying(80)",
    notNull: true,
    defaultExpression: "",
  },
  {
    columnName: "createdAt",
    dataType: "timestamp(3) without time zone",
    notNull: true,
    defaultExpression: "CURRENT_TIMESTAMP",
  },
  {
    columnName: "expiresAt",
    dataType: "timestamp(3) without time zone",
    notNull: true,
    defaultExpression: "",
  },
];
const expectedConstraints = [
  {
    constraintName: "AutomationFunnelEvent_consent_check",
    constraintType: "c",
    definition: `CHECK ("consentState"::text = 'granted'::text)`,
    validated: true,
  },
  {
    constraintName: "AutomationFunnelEvent_device_check",
    constraintType: "c",
    definition:
      "CHECK (\"deviceClass\"::text = ANY (ARRAY['mobile'::character varying, 'tablet'::character varying, 'desktop'::character varying]::text[]))",
    validated: true,
  },
  {
    constraintName: "AutomationFunnelEvent_event_check",
    constraintType: "c",
    definition:
      "CHECK (event::text = ANY (ARRAY['automation_service_view'::character varying, 'automation_pricing_view'::character varying, 'automation_example_select'::character varying, 'automation_cta_click'::character varying, 'automation_form_start'::character varying, 'automation_form_unavailable'::character varying, 'automation_form_validation_error'::character varying, 'automation_form_success'::character varying]::text[]))",
    validated: true,
  },
  {
    constraintName: "AutomationFunnelEvent_pkey",
    constraintType: "p",
    definition: "PRIMARY KEY (id)",
    validated: true,
  },
  {
    constraintName: "AutomationFunnelEvent_route_check",
    constraintType: "c",
    definition:
      "CHECK (\"routeTemplate\"::text = ANY (ARRAY['/'::character varying, '/services/automation'::character varying, '/safety-ai'::character varying, '/chemical-ra'::character varying, '/ky/paper'::character varying, '/signage'::character varying, '/chatbot'::character varying, '/safety-diary'::character varying, '/features'::character varying, '/education'::character varying, '/strategy/plan-generator'::character varying, '/heat-illness-prevention'::character varying, '/heat-illness-prevention/slides'::character varying, '/heat-illness-prevention/elearning'::character varying, 'sitewide'::character varying]::text[]))",
    validated: true,
  },
];
const expectedIndexes = [
  {
    indexName: "AutomationFunnelEvent_deployment_eventDate_idx",
    unique: false,
    definition:
      'CREATE INDEX "AutomationFunnelEvent_deployment_eventDate_idx" ON public."AutomationFunnelEvent" USING btree (deployment, "eventDate")',
    valid: true,
    ready: true,
    live: true,
  },
  {
    indexName: "AutomationFunnelEvent_eventDate_event_idx",
    unique: false,
    definition:
      'CREATE INDEX "AutomationFunnelEvent_eventDate_event_idx" ON public."AutomationFunnelEvent" USING btree ("eventDate", event)',
    valid: true,
    ready: true,
    live: true,
  },
  {
    indexName: "AutomationFunnelEvent_expiresAt_idx",
    unique: false,
    definition:
      'CREATE INDEX "AutomationFunnelEvent_expiresAt_idx" ON public."AutomationFunnelEvent" USING btree ("expiresAt")',
    valid: true,
    ready: true,
    live: true,
  },
  {
    indexName: "AutomationFunnelEvent_pkey",
    unique: true,
    definition:
      'CREATE UNIQUE INDEX "AutomationFunnelEvent_pkey" ON public."AutomationFunnelEvent" USING btree (id)',
    valid: true,
    ready: true,
    live: true,
  },
  {
    indexName: "AutomationFunnelEvent_routeTemplate_eventDate_idx",
    unique: false,
    definition:
      'CREATE INDEX "AutomationFunnelEvent_routeTemplate_eventDate_idx" ON public."AutomationFunnelEvent" USING btree ("routeTemplate", "eventDate")',
    valid: true,
    ready: true,
    live: true,
  },
];

const prisma = new PrismaClient();
const rollback = new Error("EXPECTED_DRY_RUN_ROLLBACK");

async function targetSchema(database) {
  const [columns, constraints, indexes] = await Promise.all([
    database.$queryRawUnsafe(`
      SELECT a.attname AS "columnName",
        format_type(a.atttypid, a.atttypmod) AS "dataType",
        a.attnotnull AS "notNull",
        COALESCE(pg_get_expr(d.adbin, d.adrelid), '') AS "defaultExpression"
      FROM pg_attribute a
      JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN pg_attrdef d
        ON d.adrelid = a.attrelid AND d.adnum = a.attnum
      WHERE n.nspname = 'public'
        AND c.relname = 'AutomationFunnelEvent'
        AND a.attnum > 0
        AND NOT a.attisdropped
      ORDER BY a.attnum
    `),
    database.$queryRawUnsafe(`
      SELECT conname AS "constraintName",
        contype AS "constraintType",
        pg_get_constraintdef(oid, true) AS "definition",
        convalidated AS "validated"
      FROM pg_constraint
      WHERE conrelid = to_regclass('public."AutomationFunnelEvent"')
        AND contype <> 'n'
      ORDER BY conname
    `),
    database.$queryRawUnsafe(`
      SELECT i.relname AS "indexName",
        ix.indisunique AS "unique",
        pg_get_indexdef(ix.indexrelid) AS "definition",
        ix.indisvalid AS "valid",
        ix.indisready AS "ready",
        ix.indislive AS "live"
      FROM pg_index ix
      JOIN pg_class i ON i.oid = ix.indexrelid
      WHERE ix.indrelid = to_regclass('public."AutomationFunnelEvent"')
      ORDER BY i.relname
    `),
  ]);
  return { columns, constraints, indexes };
}

function snapshotHash(snapshot) {
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

function targetSchemaState(snapshot) {
  if (
    snapshot.columns.length === 0 &&
    snapshot.constraints.length === 0 &&
    snapshot.indexes.length === 0
  ) {
    return "absent";
  }
  if (
    JSON.stringify(snapshot.columns) === JSON.stringify(expectedColumns) &&
    JSON.stringify(snapshot.constraints) ===
      JSON.stringify(expectedConstraints) &&
    JSON.stringify(snapshot.indexes) === JSON.stringify(expectedIndexes)
  ) {
    return "exact";
  }
  return "partial-or-mismatched";
}

function verifyTargetSchema(snapshot) {
  if (JSON.stringify(snapshot.columns) !== JSON.stringify(expectedColumns)) {
    throw new Error("target column verification failed");
  }
  if (
    JSON.stringify(snapshot.constraints) !== JSON.stringify(expectedConstraints)
  ) {
    throw new Error("target constraint verification failed");
  }
  if (JSON.stringify(snapshot.indexes) !== JSON.stringify(expectedIndexes)) {
    throw new Error("target index verification failed");
  }
  return {
    columnCount: snapshot.columns.length,
    constraintCount: snapshot.constraints.length,
    indexCount: snapshot.indexes.length,
  };
}

async function capturePreApplyWalMarker(database) {
  const rows = await database.$queryRawUnsafe(`
    SELECT clock_timestamp() AS "capturedAt",
      pg_current_wal_flush_lsn()::text AS "walLsn"
  `);
  const marker = rows[0];
  if (!(marker?.capturedAt instanceof Date) || !marker?.walLsn) {
    throw new Error("pre-apply WAL marker could not be captured");
  }
  return {
    capturedAt: marker.capturedAt.toISOString(),
    walLsn: marker.walLsn,
  };
}

try {
  const before = await targetSchema(prisma);
  const beforeState = targetSchemaState(before);
  if (beforeState === "partial-or-mismatched") {
    throw new Error("target schema is partial or mismatched");
  }
  if (readinessRequested) {
    process.stdout.write(
      `${JSON.stringify(
        {
          ok: true,
          mode: "verify-apply-readiness",
          additiveOnly: true,
          statementCount: statements.length,
          targetStateBefore: beforeState,
          wouldApply: beforeState === "absent",
          recoveryEvidence,
          targetFingerprint: actualTargetFingerprint,
          preMigrationTargetSchemaHash: snapshotHash(before),
          dataMutation: false,
        },
        null,
        2,
      )}\n`,
    );
  } else if (applyRequested) {
    if (beforeState === "exact") {
      const verified = verifyTargetSchema(before);
      process.stdout.write(
        `${JSON.stringify(
          {
            ok: true,
            mode: "apply",
            additiveOnly: true,
            statementCount: statements.length,
            alreadyApplied: true,
            applied: false,
            recoveryEvidence,
            targetFingerprint: actualTargetFingerprint,
            verified,
            targetSchemaHash: snapshotHash(before),
          },
          null,
          2,
        )}\n`,
      );
    } else {
      const preApplyWalMarker = await capturePreApplyWalMarker(prisma);
      const verified = await prisma.$transaction(async (transaction) => {
        for (const statement of statements) {
          await transaction.$executeRawUnsafe(statement);
        }
        return verifyTargetSchema(await targetSchema(transaction));
      });
      const after = await targetSchema(prisma);
      verifyTargetSchema(after);
      process.stdout.write(
        `${JSON.stringify(
          {
            ok: true,
            mode: "apply",
            additiveOnly: true,
            statementCount: statements.length,
            alreadyApplied: false,
            applied: true,
            recoveryEvidence,
            preApplyWalMarker,
            targetFingerprint: actualTargetFingerprint,
            verified,
            targetSchemaHash: snapshotHash(after),
          },
          null,
          2,
        )}\n`,
      );
    }
  } else if (dryRunRequested) {
    let verified;
    let rolledBack = false;
    if (beforeState === "exact") {
      verified = verifyTargetSchema(before);
    } else {
      try {
        await prisma.$transaction(async (transaction) => {
          for (const statement of statements) {
            await transaction.$executeRawUnsafe(statement);
          }
          const inside = await targetSchema(transaction);
          verified = verifyTargetSchema(inside);
          throw rollback;
        });
        throw new Error("dry-run did not roll back");
      } catch (error) {
        if (error !== rollback) throw error;
        rolledBack = true;
      }
      const after = await targetSchema(prisma);
      if (snapshotHash(before) !== snapshotHash(after)) {
        throw new Error("schema changed after dry-run rollback");
      }
    }
    process.stdout.write(
      `${JSON.stringify(
        {
          ok: true,
          mode: "dry-run",
          additiveOnly: true,
          statementCount: statements.length,
          targetStateBefore: beforeState,
          alreadyApplied: beforeState === "exact",
          targetFingerprint: actualTargetFingerprint,
          preMigrationTargetSchemaHash: snapshotHash(before),
          verified,
          rolledBack,
          unchangedAfterDryRun: true,
        },
        null,
        2,
      )}\n`,
    );
  }
} finally {
  await prisma.$disconnect();
}
