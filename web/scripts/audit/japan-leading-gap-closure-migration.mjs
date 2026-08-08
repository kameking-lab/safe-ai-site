import { createHash, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { Prisma, PrismaClient } from "@prisma/client";
import {
  databaseTargetFingerprint,
  verifyEncryptedBackup,
} from "./operations-growth-encrypted-backup.mjs";

const applyRequested = process.argv.includes("--apply");
const readinessRequested = process.argv.includes("--verify-apply-readiness");
const explicitDryRun = process.argv.includes("--dry-run");
const dryRunRequested =
  explicitDryRun || (!applyRequested && !readinessRequested);

if (
  Number(applyRequested) +
    Number(readinessRequested) +
    Number(explicitDryRun) >
  1
) {
  throw new Error("migration operation flags are mutually exclusive");
}
if (
  applyRequested &&
  process.env.GAP_CLOSURE_MIGRATION_CONFIRM !==
    "apply-additive-2026-07-31"
) {
  throw new Error("explicit additive migration confirmation is required");
}

if (!process.env.DATABASE_URL?.trim()) {
  try {
    process.loadEnvFile(resolve(process.cwd(), "../.env.local"));
  } catch {
    // A deployment environment may provide the connection instead.
  }
}
if (!process.env.DATABASE_URL?.trim()) {
  throw new Error("DATABASE_URL is required");
}

const migrationPath = resolve(
  process.cwd(),
  "prisma/operations/japan-leading-gap-closure-2026-07-31-up.sql",
);
const migration = readFileSync(migrationPath, "utf8");
const normalizedMigration = migration.replace(/\r\n/g, "\n");
const migrationHash = createHash("sha256")
  .update(normalizedMigration)
  .digest("hex");
const expectedMigrationHash =
  "b412d65155ad0529cda2490edf06ceb7387f7622c531733a03f529d6b88cd711";
if (migrationHash !== expectedMigrationHash) {
  throw new Error("migration content fingerprint mismatch");
}

const executable = normalizedMigration
  .split("\n")
  .filter((line) => !line.trimStart().startsWith("--"))
  .join("\n");
const statements = executable
  .split(";")
  .map((statement) => statement.trim())
  .filter(Boolean);

if (
  statements.some(
    (statement) =>
      !/^CREATE TABLE IF NOT EXISTS\b/i.test(statement) &&
      !/^CREATE (?:UNIQUE )?INDEX IF NOT EXISTS\b/i.test(statement),
  )
) {
  throw new Error("migration contains a non-additive statement");
}

function splitTopLevelComma(value) {
  const parts = [];
  let start = 0;
  let depth = 0;
  let singleQuoted = false;
  let doubleQuoted = false;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    const previous = value[index - 1];
    if (character === "'" && !doubleQuoted && previous !== "\\") {
      singleQuoted = !singleQuoted;
    } else if (character === '"' && !singleQuoted && previous !== "\\") {
      doubleQuoted = !doubleQuoted;
    } else if (!singleQuoted && !doubleQuoted) {
      if (character === "(") depth += 1;
      if (character === ")") depth -= 1;
      if (character === "," && depth === 0) {
        parts.push(value.slice(start, index).trim());
        start = index + 1;
      }
    }
  }
  parts.push(value.slice(start).trim());
  return parts.filter(Boolean);
}

const tableDefinitions = new Map();
for (const statement of statements) {
  const match = statement.match(
    /^CREATE TABLE IF NOT EXISTS\s+"([^"]+)"\s*\(([\s\S]+)\)$/i,
  );
  if (!match) continue;
  const columns = splitTopLevelComma(match[2])
    .map((part) => part.match(/^"([^"]+)"\s+/)?.[1] ?? null)
    .filter(Boolean);
  tableDefinitions.set(match[1], columns);
}

const expectedTables = [
  "SharedRateBucket",
  "SharedIdempotency",
  "SafetyOrganization",
  "SafetySite",
  "SafetyMembership",
  "GovernanceAuditLog",
  "ChemicalRaAssessment",
  "ChemicalSdsRecord",
  "ChemicalRaVersion",
  "ChemicalRaReviewDecision",
  "ChemicalRaApproval",
  "ChemicalReassessmentTrigger",
  "TrainingLearner",
  "TrainingCourse",
  "TrainingCourseVersion",
  "TrainingEnrollment",
  "TrainingAttendance",
  "TrainingAssessment",
  "TrainingCompletion",
  "SignageFleetDevice",
  "SignageFleetConfiguration",
  "SignageFleetRollout",
  "SignageFleetHeartbeat",
  "SignageFleetAcknowledgement",
  "AutomationConsultTicket",
];

if (
  JSON.stringify([...tableDefinitions.keys()]) !==
  JSON.stringify(expectedTables)
) {
  throw new Error("migration table allowlist mismatch");
}

const expectedStandaloneIndexes = statements
  .map(
    (statement) =>
      statement.match(
        /^CREATE (?:UNIQUE )?INDEX IF NOT EXISTS\s+"([^"]+)"/i,
      )?.[1] ?? null,
  )
  .filter(Boolean)
  .sort();
const expectedNamedConstraints = [
  ...normalizedMigration.matchAll(/\bCONSTRAINT\s+"([^"]+)"/g),
]
  .map((match) => match[1])
  .sort();

const actualTargetFingerprint = databaseTargetFingerprint(
  process.env.DATABASE_URL,
);
const expectedTargetFingerprint =
  process.env.GAP_CLOSURE_TARGET_FINGERPRINT?.trim().toLowerCase() ?? "";

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
    process.env.GAP_CLOSURE_RECOVERY_EVIDENCE_ID?.trim() ?? "";
  const backupFile =
    process.env.GAP_CLOSURE_BACKUP_FILE?.trim() ?? "";
  const keyFile =
    process.env.GAP_CLOSURE_BACKUP_KEY_FILE?.trim() ?? "";
  const backupSha256 =
    process.env.GAP_CLOSURE_BACKUP_SHA256?.trim().toLowerCase() ?? "";
  if (
    !/^japan-leading-gap-closure-[A-Za-z0-9TZ]+$/.test(evidenceId) ||
    basename(backupFile) !== backupFile ||
    basename(keyFile) !== keyFile ||
    !/^japan-leading-gap-closure-[0-9TZ]+\.enc\.json$/.test(backupFile) ||
    !/^japan-leading-gap-closure-[0-9TZ]+\.key\.dpapi$/.test(keyFile) ||
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
  const ageMs = Date.now() - Date.parse(verified.createdAt);
  if (
    !Number.isFinite(ageMs) ||
    ageMs < -5 * 60 * 1_000 ||
    ageMs > 24 * 60 * 60 * 1_000
  ) {
    throw new Error("verified encrypted backup must be within 24 hours");
  }
  return {
    backupId: verified.backupId,
    createdAt: verified.createdAt,
    fileSha256: verified.fileSha256,
    plaintextSha256: verified.plaintextSha256,
    schemaSqlSha256: verified.schemaSqlSha256,
    tableCount: verified.tableCount,
    rowCount: verified.rowCount,
    decryptedAndAuthenticatedInMemory: true,
    piiPlaintextWrittenToDisk: false,
  };
}

const recoveryEvidence = requireRecoveryEvidence();
const targetListSql = expectedTables
  .map((table) => `'${table.replaceAll("'", "''")}'`)
  .join(", ");

async function targetSnapshot(database) {
  const [tables, columns, constraints, indexes] = await Promise.all([
    database.$queryRawUnsafe(`
      SELECT table_name AS "tableName"
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (${targetListSql})
      ORDER BY table_name
    `),
    database.$queryRawUnsafe(`
      SELECT table_name AS "tableName", column_name AS "columnName"
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN (${targetListSql})
      ORDER BY table_name, ordinal_position
    `),
    database.$queryRawUnsafe(`
      SELECT c.conname AS "constraintName",
        c.convalidated AS "validated"
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public'
        AND t.relname IN (${targetListSql})
      ORDER BY c.conname
    `),
    database.$queryRawUnsafe(`
      SELECT i.relname AS "indexName",
        ix.indisvalid AS "valid",
        ix.indisready AS "ready",
        ix.indislive AS "live"
      FROM pg_index ix
      JOIN pg_class t ON t.oid = ix.indrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      JOIN pg_class i ON i.oid = ix.indexrelid
      WHERE n.nspname = 'public'
        AND t.relname IN (${targetListSql})
      ORDER BY i.relname
    `),
  ]);
  return { tables, columns, constraints, indexes };
}

function snapshotHash(snapshot) {
  return createHash("sha256")
    .update(JSON.stringify(snapshot))
    .digest("hex");
}

function targetState(snapshot) {
  if (snapshot.tables.length === 0) return "absent";
  if (snapshot.tables.length !== expectedTables.length) {
    return "partial-or-mismatched";
  }
  try {
    verifyTargetSnapshot(snapshot);
    return "exact";
  } catch {
    return "partial-or-mismatched";
  }
}

function verifyTargetSnapshot(snapshot) {
  const actualTables = snapshot.tables.map((row) => row.tableName).sort();
  if (
    JSON.stringify(actualTables) !==
    JSON.stringify([...expectedTables].sort())
  ) {
    throw new Error("target table verification failed");
  }

  const actualColumns = new Map();
  for (const row of snapshot.columns) {
    const columns = actualColumns.get(row.tableName) ?? [];
    columns.push(row.columnName);
    actualColumns.set(row.tableName, columns);
  }
  for (const [table, columns] of tableDefinitions) {
    if (
      JSON.stringify(actualColumns.get(table) ?? []) !==
      JSON.stringify(columns)
    ) {
      throw new Error(`target column verification failed: ${table}`);
    }
  }

  const actualConstraints = new Map(
    snapshot.constraints.map((row) => [
      row.constraintName,
      row.validated,
    ]),
  );
  for (const constraint of expectedNamedConstraints) {
    if (actualConstraints.get(constraint) !== true) {
      throw new Error(`target constraint verification failed: ${constraint}`);
    }
  }

  const actualIndexes = new Map(
    snapshot.indexes.map((row) => [row.indexName, row]),
  );
  for (const index of expectedStandaloneIndexes) {
    const actual = actualIndexes.get(index);
    if (!actual?.valid || !actual.ready || !actual.live) {
      throw new Error(`target index verification failed: ${index}`);
    }
  }

  return {
    tableCount: snapshot.tables.length,
    columnCount: snapshot.columns.length,
    namedConstraintCount: expectedNamedConstraints.length,
    standaloneIndexCount: expectedStandaloneIndexes.length,
    allConstraintsValidated: true,
    allIndexesLive: true,
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
    supplementalOnly: true,
  };
}

const prisma = new PrismaClient();
const rollback = new Error("EXPECTED_GAP_CLOSURE_DRY_RUN_ROLLBACK");

try {
  const before = await targetSnapshot(prisma);
  const beforeState = targetState(before);
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
          migrationHash,
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
      process.stdout.write(
        `${JSON.stringify(
          {
            ok: true,
            mode: "apply",
            additiveOnly: true,
            migrationHash,
            statementCount: statements.length,
            alreadyApplied: true,
            applied: false,
            recoveryEvidence,
            targetFingerprint: actualTargetFingerprint,
            verified: verifyTargetSnapshot(before),
            targetSchemaHash: snapshotHash(before),
          },
          null,
          2,
        )}\n`,
      );
    } else {
      const preApplyWalMarker = await capturePreApplyWalMarker(prisma);
      const verified = await prisma.$transaction(
        async (transaction) => {
          await transaction.$executeRawUnsafe(
            "SELECT pg_advisory_xact_lock(hashtext('japan-leading-gap-closure-2026-07-31'))",
          );
          for (const statement of statements) {
            await transaction.$executeRawUnsafe(statement);
          }
          return verifyTargetSnapshot(await targetSnapshot(transaction));
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 10_000,
          timeout: 120_000,
        },
      );
      const after = await targetSnapshot(prisma);
      verifyTargetSnapshot(after);
      process.stdout.write(
        `${JSON.stringify(
          {
            ok: true,
            mode: "apply",
            additiveOnly: true,
            migrationHash,
            statementCount: statements.length,
            alreadyApplied: false,
            applied: true,
            recoveryEvidence,
            preApplyWalMarker,
            targetFingerprint: actualTargetFingerprint,
            verified,
            targetSchemaHash: snapshotHash(after),
            existingObjectsOrRowsModified: false,
            destructiveStatementsExecuted: false,
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
      verified = verifyTargetSnapshot(before);
    } else {
      try {
        await prisma.$transaction(
          async (transaction) => {
            await transaction.$executeRawUnsafe(
              "SELECT pg_advisory_xact_lock(hashtext('japan-leading-gap-closure-2026-07-31'))",
            );
            for (const statement of statements) {
              await transaction.$executeRawUnsafe(statement);
            }
            verified = verifyTargetSnapshot(await targetSnapshot(transaction));
            throw rollback;
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            maxWait: 10_000,
            timeout: 120_000,
          },
        );
        throw new Error("dry-run did not roll back");
      } catch (error) {
        if (error !== rollback) throw error;
        rolledBack = true;
      }
      const after = await targetSnapshot(prisma);
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
          migrationHash,
          statementCount: statements.length,
          targetStateBefore: beforeState,
          alreadyApplied: beforeState === "exact",
          targetFingerprint: actualTargetFingerprint,
          preMigrationTargetSchemaHash: snapshotHash(before),
          verified,
          rolledBack,
          unchangedAfterDryRun: true,
          existingObjectsOrRowsModified: false,
        },
        null,
        2,
      )}\n`,
    );
  }
} finally {
  await prisma.$disconnect();
}
