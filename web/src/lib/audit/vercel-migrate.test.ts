import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  APPROVED_MIGRATIONS,
  combinedSql,
  directDatabaseUrl,
  isProductionBuild,
  migrationObjects,
  pendingMigrations,
  planWithoutHistory,
  runApprovedMigrations,
} from "../../../scripts/vercel-migrate.mjs";

const migrationsDir = join(process.cwd(), "prisma", "migrations");
const files = readdirSync(migrationsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory())
  .map((entry) => entry.name).sort()
  .map((name) => ({ name, sql: readFileSync(join(migrationsDir, name, "migration.sql"), "utf8") }));
const applied = (file: { name: string; sql: string }) => ({
  migration_name: file.name, checksum: createHash("sha256").update(file.sql).digest("hex"), finished_at: new Date(), rolled_back_at: null,
});
const production = { VERCEL: "1", VERCEL_ENV: "production", VERCEL_DEPLOYMENT_ID: "dpl_synthetic" };
const pushedSchema = () => ({ tables: new Set(["User", "Subscription", "Account"]), columns: new Set(["User.id", "Subscription.planName"]) });

describe("vercel-migrate gate", () => {
  it("the repository holds exactly the three owner-approved migrations", () => {
    expect(APPROVED_MIGRATIONS).toEqual(["20261103000000_ios3b_shared_entitlements", "202611040001_ios3c_review_fixes", "202611110001_owner_billing_decisions"]);
    expect(files.map((file) => file.name)).toEqual([...APPROVED_MIGRATIONS]);
  });

  it("runs only in a hosted Vercel production build", () => {
    for (const env of [{}, { CI: "true" }, { VERCEL_ENV: "production" }, { VERCEL: "1", VERCEL_ENV: "production" },
      { ...production, VERCEL_ENV: "preview" }, { ...production, VERCEL_CLI: "1" }, { ...production, GITHUB_ACTIONS: "true" },
      { ...production, VERCEL_DEPLOYMENT_ID: "not-a-deployment" }]) {
      expect(isProductionBuild(env)).toBe(false);
    }
    expect(isProductionBuild({ ...production, CI: "1" })).toBe(true);
  });

  it("requires a direct PostgreSQL URL and prefers the unpooled aliases", () => {
    const direct = "postgresql://user:synthetic@db.example.test:5432/app";
    expect(directDatabaseUrl({ DATABASE_URL_UNPOOLED: direct, DATABASE_URL: "postgresql://u:p@ep-x-pooler.example.test/app" })).toBe(direct);
    expect(directDatabaseUrl({ DATABASE_URL: direct })).toBe(direct);
    for (const env of [{}, { DATABASE_URL: "not a url" }, { DATABASE_URL: "postgresql://u:p@ep-x-pooler.example.test/app" },
      { DATABASE_URL: `${direct}?pgbouncer=true` }, { DIRECT_URL: "postgresql://u:p@db.example.test:6543/app" },
      { DATABASE_URL: "prisma+postgres://accelerate.example.test/?api_key=synthetic" }]) {
      expect(() => directDatabaseUrl(env)).toThrow();
    }
  });

  it("with migration history allows the complete set, billing decisions after the ledger, or none", () => {
    expect(pendingMigrations(files, [])).toEqual([...APPROVED_MIGRATIONS]);
    expect(pendingMigrations(files, files.map(applied))).toEqual([]);
    expect(pendingMigrations(files, files.slice(0,2).map(applied))).toEqual(["202611110001_owner_billing_decisions"]);
    expect(() => pendingMigrations(files, [applied(files[0])])).toThrow(/Unexpected pending migrations: 202611040001_ios3c_review_fixes/);
    expect(() => pendingMigrations([...files, { name: "20261201000000_extra", sql: "SELECT 1;" }], [])).toThrow(/Unexpected pending.*no deploy attempted/);
    expect(() => pendingMigrations([...files].reverse(), [])).toThrow(/Unexpected pending/);
    expect(() => pendingMigrations([files[0]], [])).toThrow(/Unexpected pending/);
  });

  it("stops on failed, unknown, duplicate or modified history", () => {
    const row = applied(files[0]);
    for (const history of [[{ ...row, finished_at: null }], [row, row], [{ ...row, checksum: "bad" }],
      [{ ...row, migration_name: "unknown" }]]) {
      expect(() => pendingMigrations(files, history)).toThrow(/migration history/);
    }
    // Line-ending variants and rolled-back attempts are accepted.
    const crlf = files.map((file) => applied({ ...file, sql: file.sql.replace(/\r?\n/g, "\r\n") }));
    expect(pendingMigrations(files, [{ ...row, finished_at: null, rolled_back_at: new Date() }, ...crlf])).toEqual([]);
  });

  it("parses the tables and columns the approved migrations create", () => {
    const objects = files.map((file) => migrationObjects(file.sql));
    expect(objects[0].tables).toHaveLength(13);
    expect(objects[0].tables).toContain("MobileIdentity");
    expect(objects[1].tables).toEqual(["MobileAccountDeletion"]);
    expect(objects[1].columns).toEqual(expect.arrayContaining(["Subscription.billingHold", "MobilePurchaseIntent.providerRequest", "MobileAuthFlow.authenticatedAt", "MobileUsageOperation.providerStartedAt"]));
    expect(objects[1].columns).toHaveLength(9);
    expect(objects[2].tables).toEqual(['MobileOperationsAlert']);
    expect(objects[2].columns).toEqual(['MobileBudgetMonth.salesPausedAt']);
  });

  it("without history (db push database) applies only when none of the approved objects exist", () => {
    expect(planWithoutHistory(files, pushedSchema())).toEqual([...APPROVED_MIGRATIONS]);
    const partial = pushedSchema(); partial.tables.add("MobileIdentity");
    expect(() => planWithoutHistory(files, partial)).toThrow(/1\/\d+ approved objects already exist \(MobileIdentity\).*migrate resolve/);
    const column = pushedSchema(); column.columns.add("Subscription.billingHold");
    expect(() => planWithoutHistory(files, column)).toThrow(/already exist/);
    expect(() => planWithoutHistory(files, { tables: new Set(), columns: new Set() })).toThrow(/User\/Subscription missing/);
    expect(() => planWithoutHistory([files[0]], pushedSchema())).toThrow(/Unexpected pending/);
    const sql = combinedSql(files);
    expect(sql.startsWith("BEGIN;\n") && sql.endsWith("COMMIT;\n")).toBe(true);
    expect(sql.match(/BEGIN;|COMMIT;/g)).toHaveLength(2);
  });
});

type Row = Record<string, unknown>;
function simulate(state: { history: Row[] | null; tables: Set<string>; columns: Set<string> }, outputs: Record<string, { status: number; output: string }> = {}) {
  const calls: string[] = [];
  const db = {
    async $queryRawUnsafe(sql: string): Promise<Row[]> {
      if (sql.includes("pg_try_advisory_xact_lock")) return [{ acquired: true }];
      if (sql.includes("information_schema.columns")) {
        const tables = new Set(state.tables); if (state.history) tables.add("_prisma_migrations");
        return [...tables].flatMap((table) => [{ table_name: table, column_name: "id" },
          ...[...state.columns].filter((c) => c.startsWith(`${table}.`)).map((c) => ({ table_name: table, column_name: c.split(".")[1] }))]);
      }
      if (sql.includes("_prisma_migrations")) return state.history ?? [];
      throw new Error(`unexpected query ${sql}`);
    },
  };
  const prisma = (args: string[]) => {
    const command = args.slice(0, args.indexOf("--schema")).join(" ");
    calls.push(command);
    if (outputs[command]) return outputs[command];
    if (command === "db execute --file approved.sql") {
      for (const file of files) { const o = migrationObjects(file.sql); o.tables.forEach((t) => state.tables.add(t)); o.columns.forEach((c) => state.columns.add(c)); }
    } else if (command.startsWith("migrate resolve --applied ")) {
      const name = command.split(" ").pop()!;
      state.history = [...(state.history ?? []), applied(files.find((file) => file.name === name)!)];
    } else if (command === "migrate deploy") {
      state.history = files.map(applied);
    } else if (command === "migrate status") {
      const pending = files.filter((file) => !state.history?.some((row) => row.migration_name === file.name));
      return pending.length ? { status: 1, output: `Following migrations have not yet been applied:\n${pending.map((f) => f.name).join("\n")}` } : { status: 0, output: "Database schema is up to date!" };
    }
    return { status: 0, output: "" };
  };
  const run = () => runApprovedMigrations({ db, files, prisma, schema: "schema.prisma", writeSql: async () => "approved.sql", log: () => undefined });
  return { calls, run, state };
}

describe("vercel-migrate dry run against a simulated database", () => {
  it("applies only billing decisions when both existing ledger migrations are already applied",async()=>{
    const sim=simulate({history:files.slice(0,2).map(applied),...pushedSchema()});
    await expect(sim.run()).resolves.toEqual({mode:'deploy',applied:['202611110001_owner_billing_decisions']});
    expect(sim.calls).toEqual(['migrate status','migrate deploy','migrate status']);
  });
  it("db push database: applies the approved SQL once in one transaction, then baselines the history", async () => {
    const sim = simulate({ history: null, ...pushedSchema() });
    await expect(sim.run()).resolves.toEqual({ mode: "apply-and-baseline", applied: [...APPROVED_MIGRATIONS] });
    expect(sim.calls).toEqual(["db execute --file approved.sql", ...APPROVED_MIGRATIONS.map((n) => `migrate resolve --applied ${n}`), "migrate status"]);
    // The next production build is a no-op.
    sim.calls.length = 0;
    await expect(sim.run()).resolves.toEqual({ mode: "up-to-date", applied: [] });
    expect(sim.calls).toEqual(["migrate status"]);
  });

  it("database with history: runs migrate deploy only after a matching status preflight", async () => {
    const sim = simulate({ history: [], ...pushedSchema() });
    await expect(sim.run()).resolves.toEqual({ mode: "deploy", applied: [...APPROVED_MIGRATIONS] });
    expect(sim.calls).toEqual(["migrate status", "migrate deploy", "migrate status"]);
  });

  it("fails closed before any write on unexpected state or a failing Prisma command", async () => {
    const partial = simulate({ history: null, ...pushedSchema() }); partial.state.tables.add("MobileSession");
    await expect(partial.run()).rejects.toThrow(/already exist/);
    expect(partial.calls).toEqual([]);
    const half = simulate({ history: [applied(files[0])], ...pushedSchema() });
    await expect(half.run()).rejects.toThrow(/Unexpected pending/);
    expect(half.calls).toEqual([]);
    const failing = simulate({ history: null, ...pushedSchema() }, { "db execute --file approved.sql": { status: 1, output: "secret-looking output" } });
    const error = await failing.run().catch((e: Error) => e);
    expect(String(error)).toMatch(/Prisma db execute failed; build stopped \(database output withheld\)/);
    expect(String(error)).not.toContain("secret-looking");
    expect(failing.calls).toEqual(["db execute --file approved.sql"]);
  });
});
