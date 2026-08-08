/**
 * Applies the additive, idempotent external-operations tables.
 *
 * `--apply` is mandatory. The SQL file contains CREATE TABLE/INDEX IF NOT
 * EXISTS only. No table rows are read and no connection values are printed.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

const apply =
  process.argv.includes("--apply") ||
  process.env.EXTERNAL_OPERATIONS_DB_APPLY === "true";
const sqlPath = resolve(
  process.cwd(),
  "web/prisma/operations/external-operations-activation-2026-07-29-up.sql",
);
const sql = readFileSync(sqlPath, "utf8");
const destructivePattern = /\b(?:DROP|TRUNCATE|ALTER\s+TABLE|DELETE|UPDATE)\b/i;
if (destructivePattern.test(sql)) {
  throw new Error("non_additive_sql_rejected");
}
const statements = sql
  .replace(/^\s*--.*$/gm, "")
  .replace(/\bBEGIN\s*;/gi, "")
  .replace(/\bCOMMIT\s*;/gi, "")
  .split(";")
  .map((statement) => statement.trim())
  .filter(Boolean);

if (!apply) {
  process.stdout.write(
    `${JSON.stringify({
      ok: true,
      mode: "dry-run",
      additiveOnly: true,
      statementCount: statements.length,
      valuesIncluded: false,
    })}\n`,
  );
  process.exit(0);
}

const prisma = new PrismaClient({ log: [] });
try {
  await prisma.$transaction(async (transaction) => {
    for (const statement of statements) {
      await transaction.$executeRawUnsafe(statement);
    }
  });
  const rows = await prisma.$queryRawUnsafe(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('AutomationConsultState','AutomationConsultRateBucket','RumMetric','RumRateBucket') ORDER BY table_name",
  );
  const tableNames = rows.map((row) => String(row.table_name));
  process.stdout.write(
    `${JSON.stringify({
      ok: tableNames.length === 4,
      mode: "applied",
      additiveOnly: true,
      statementCount: statements.length,
      expectedTableCount: 4,
      presentTableCount: tableNames.length,
      tableNames,
      valuesIncluded: false,
    })}\n`,
  );
} catch (error) {
  process.stdout.write(
    `${JSON.stringify({
      ok: false,
      mode: "failed",
      errorClass:
        error && error.constructor ? error.constructor.name : "unknown",
      valuesIncluded: false,
    })}\n`,
  );
  process.exitCode = 2;
} finally {
  await prisma.$disconnect().catch(() => undefined);
}
