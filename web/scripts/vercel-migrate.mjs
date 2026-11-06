#!/usr/bin/env node
// Applies the owner-approved Prisma migrations during a hosted Vercel production
// build only. Anything other than exactly the approved pending set stops the build.
// Never forward Prisma output/errors: they can contain database credentials.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Owner approved production application of these two (iOS shared ledger), 2026-11-06.
export const APPROVED_MIGRATIONS = Object.freeze([
  "20261103000000_ios3b_shared_entitlements",
  "202611040001_ios3c_review_fixes",
]);
const HISTORY_TABLE = "_prisma_migrations";

export class MigrationGateError extends Error {}

export function isProductionBuild(env) {
  // Vercel itself sets CI=1. CI alone must not disable hosted production builds.
  const externalCi = ["GITHUB_ACTIONS", "GITLAB_CI", "CIRCLECI", "TF_BUILD", "BUILDKITE", "JENKINS_URL", "TEAMCITY_VERSION"];
  return env.VERCEL === "1" && env.VERCEL_ENV === "production"
    && /^dpl_[A-Za-z0-9]+$/.test(env.VERCEL_DEPLOYMENT_ID ?? "")
    && !env.VERCEL_CLI && !externalCi.some((key) => env[key] && env[key] !== "false");
}

export function directDatabaseUrl(env) {
  const key = ["DATABASE_URL_UNPOOLED", "DIRECT_URL", "POSTGRES_URL_NON_POOLING", "DATABASE_URL"]
    .find((name) => env[name]?.trim());
  if (!key) throw new MigrationGateError("No database URL (DATABASE_URL_UNPOOLED / DIRECT_URL / POSTGRES_URL_NON_POOLING / DATABASE_URL).");
  let url;
  try { url = new URL(env[key]); } catch { throw new MigrationGateError(`Invalid ${key}.`); }
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname
    || /pooler/i.test(url.hostname) || url.port === "6543" || url.searchParams.get("pgbouncer") === "true") {
    throw new MigrationGateError(`${key} must be a direct (non-pooled) PostgreSQL URL; set DATABASE_URL_UNPOOLED or DIRECT_URL.`);
  }
  return env[key];
}

function checksums(sql) {
  // Prisma accepts the original, LF and CRLF versions of a migration checksum.
  return [sql, sql.replace(/\r\n/g, "\n"), sql.replace(/\r?\n/g, "\r\n")]
    .map((value) => createHash("sha256").update(value).digest("hex"));
}

function assertApprovedPending(pending, files) {
  const ok = pending.length === 0 || (pending.length === APPROVED_MIGRATIONS.length
    && pending.every((name, index) => name === APPROVED_MIGRATIONS[index]));
  if (!ok) {
    throw new MigrationGateError(`Unexpected pending migrations: ${pending.join(", ") || "(none)"} (only ${APPROVED_MIGRATIONS.join(" + ")} together, or zero, are allowed); no deploy attempted.`);
  }
  if (APPROVED_MIGRATIONS.some((name) => !files.some((file) => file.name === name))) {
    throw new MigrationGateError("Approved migration files are missing; no deploy attempted.");
  }
  return pending;
}

/** Pending migrations for a database that already has Prisma's migration history table. */
export function pendingMigrations(files, history) {
  const applied = new Set();
  for (const row of history) {
    if (row.rolled_back_at) continue;
    const migration = files.find((file) => file.name === row.migration_name);
    if (!row.finished_at || !migration || applied.has(row.migration_name) || !checksums(migration.sql).includes(row.checksum)) {
      throw new MigrationGateError("Failed, unknown, duplicate or modified migration history; no deploy attempted.");
    }
    applied.add(row.migration_name);
  }
  return assertApprovedPending(files.filter((file) => !applied.has(file.name)).map((file) => file.name), files);
}

/** Tables and columns a migration creates, used to inspect a database that was built with `db push`. */
export function migrationObjects(sql) {
  const tables = [...sql.matchAll(/CREATE TABLE "([^"]+)"/g)].map((match) => match[1]);
  const columns = [];
  for (const statement of sql.matchAll(/ALTER TABLE "([^"]+)"([^;]*);/g)) {
    for (const column of statement[2].matchAll(/ADD COLUMN "([^"]+)"/g)) columns.push(`${statement[1]}.${column[1]}`);
  }
  return { tables, columns };
}

/**
 * The production database predates migrations (it was created with `prisma db push`),
 * so it has no history table and `migrate deploy` would refuse it (P3005). Apply the
 * approved SQL only when none of its objects exist yet, then record the history.
 */
export function planWithoutHistory(files, existing) {
  assertApprovedPending(files.map((file) => file.name), files);
  if (!existing.tables.has("User") || !existing.tables.has("Subscription")) {
    throw new MigrationGateError("Database does not look like the Anzen production schema (User/Subscription missing); no deploy attempted.");
  }
  const objects = files.flatMap((file) => {
    const { tables, columns } = migrationObjects(file.sql);
    return [...tables.map((table) => ({ name: table, present: existing.tables.has(table) })),
      ...columns.map((column) => ({ name: column, present: existing.columns.has(column) }))];
  });
  if (objects.length === 0) throw new MigrationGateError("Approved migrations create no recognisable objects; no deploy attempted.");
  const present = objects.filter((object) => object.present).map((object) => object.name);
  if (present.length > 0) {
    throw new MigrationGateError(`No migration history, but ${present.length}/${objects.length} approved objects already exist (${present.slice(0, 5).join(", ")}). Baseline manually with \`prisma migrate resolve --applied\`; no deploy attempted.`);
  }
  return files.map((file) => file.name);
}

export function combinedSql(files) {
  // One explicit transaction: either every approved statement lands or none does.
  return `BEGIN;\n${files.map((file) => file.sql.trim()).join("\n\n")}\nCOMMIT;\n`;
}

function runPrismaCli(cli, cwd, childEnv, args) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd, env: childEnv, encoding: "utf8", windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"], timeout: 120_000, maxBuffer: 4 * 1024 * 1024,
  });
  return { status: result.error ? null : result.status, output: `${result.stdout ?? ""}\n${result.stderr ?? ""}`.replace(/\u001b\[[0-9;]*m/g, "") };
}

/**
 * @param {{ db: { $queryRawUnsafe: (sql: string) => Promise<any[]> }, files: {name: string, sql: string}[],
 *   prisma: (args: string[]) => { status: number | null, output: string }, writeSql: (sql: string) => Promise<string>,
 *   schema: string, log?: (line: string) => void }} context
 */
export async function runApprovedMigrations({ db, files, prisma, writeSql, schema, log = console.log }) {
  const [lock] = await db.$queryRawUnsafe("SELECT pg_try_advisory_xact_lock(1634889321, 1106) AS acquired");
  if (!lock?.acquired) throw new MigrationGateError("Another production migration check is running; build stopped.");
  const inspect = async () => {
    const rows = await db.$queryRawUnsafe("SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = current_schema()");
    return { tables: new Set(rows.map((row) => row.table_name)), columns: new Set(rows.map((row) => `${row.table_name}.${row.column_name}`)) };
  };
  const history = () => db.$queryRawUnsafe(`SELECT migration_name, checksum, finished_at, rolled_back_at FROM "${HISTORY_TABLE}" ORDER BY started_at, id`);
  const run = (args, check) => {
    const result = prisma([...args, "--schema", schema]);
    if (result.status === null || !check(result)) {
      throw new MigrationGateError(`Prisma ${args.slice(0, 2).join(" ")} failed; build stopped (database output withheld).`);
    }
  };
  const upToDate = () => run(["migrate", "status"], (r) => r.status === 0 && r.output.includes("Database schema is up to date!"));

  const existing = await inspect();
  if (existing.tables.has(HISTORY_TABLE)) {
    const pending = pendingMigrations(files, await history());
    if (pending.length === 0) {
      upToDate();
      log("[vercel-migrate] Nothing pending; approved migrations already applied.");
      return { mode: "up-to-date", applied: [] };
    }
    run(["migrate", "status"], (r) => r.status === 1 && r.output.includes("Following migrations have not yet been applied:")
      && pending.every((name) => r.output.includes(name)));
    log(`[vercel-migrate] Preflight passed: ${pending.join(", ")}.`);
    run(["migrate", "deploy"], (r) => r.status === 0);
    if (pendingMigrations(files, await history()).length !== 0) throw new MigrationGateError("Migrations remain after deploy; build stopped.");
    upToDate();
    log("[vercel-migrate] Migration deploy and clean postflight passed.");
    return { mode: "deploy", applied: pending };
  }

  const pending = planWithoutHistory(files, existing);
  log(`[vercel-migrate] Preflight passed (no history; db push database): ${pending.join(", ")}.`);
  const sqlPath = await writeSql(combinedSql(files));
  run(["db", "execute", "--file", sqlPath], (r) => r.status === 0);
  for (const name of pending) run(["migrate", "resolve", "--applied", name], (r) => r.status === 0);
  const after = await inspect();
  if (pendingMigrations(files, await history()).length !== 0
    || files.some((file) => { const { tables, columns } = migrationObjects(file.sql); return tables.some((t) => !after.tables.has(t)) || columns.some((c) => !after.columns.has(c)); })) {
    throw new MigrationGateError("Postflight failed after applying approved SQL; build stopped.");
  }
  upToDate();
  log("[vercel-migrate] Approved SQL applied, history baselined and clean postflight passed.");
  return { mode: "apply-and-baseline", applied: pending };
}

export async function migrateForVercel(env = process.env) {
  if (!isProductionBuild(env)) {
    console.log("[vercel-migrate] Skipped: not a hosted Vercel production build.");
    return null;
  }
  const url = directDatabaseUrl(env);
  const web = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const require = createRequire(import.meta.url);
  const cli = require.resolve("prisma/build/index.js");
  const temp = await mkdtemp(join(tmpdir(), "vercel-migrate-"));
  let client;
  try {
    // Freeze the files we inspect and deploy; Prisma never discovers repo .env files.
    await cp(join(web, "prisma/migrations"), join(temp, "migrations"), { recursive: true });
    const schema = join(temp, "schema.prisma");
    await writeFile(schema, 'datasource db {\n  provider = "postgresql"\n  url = env("DATABASE_URL")\n}\n');
    const names = (await readdir(join(temp, "migrations"), { withFileTypes: true }))
      .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
    const files = await Promise.all(names.map(async (name) => ({
      name, sql: await readFile(join(temp, "migrations", name, "migration.sql"), "utf8"),
    })));
    const { PrismaClient } = require("@prisma/client");
    client = new PrismaClient({ datasourceUrl: url, log: [] });
    // The URL is passed only in the child environment, never argv or output.
    const childEnv = { ...env, DATABASE_URL: url, NO_COLOR: "1", CHECKPOINT_DISABLE: "1" };
    return await client.$transaction((tx) => runApprovedMigrations({
      db: tx, files, schema,
      prisma: (args) => runPrismaCli(cli, temp, childEnv, args),
      writeSql: async (sql) => { const path = join(temp, "approved.sql"); await writeFile(path, sql); return path; },
    }), { timeout: 270_000, maxWait: 5_000 });
  } finally {
    await client?.$disconnect();
    await rm(temp, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await migrateForVercel(); }
  catch (error) {
    // Error objects/stack traces, SQL and Prisma datasource banners are not log-safe.
    const reason = error instanceof MigrationGateError ? error.message : "Database or migration check failed; build stopped. Database output withheld.";
    console.error(`[vercel-migrate] FAILED: ${reason}`);
    process.exitCode = 1;
  }
}
