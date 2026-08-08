/**
 * Read-only production database capability probe.
 *
 * This script intentionally reports only connectivity, table names, and
 * boolean DDL privileges. It never reads table rows or prints connection
 * strings, database users, hosts, or environment values.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: [] });

try {
  const tables = await prisma.$queryRawUnsafe(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
  );
  const privileges = await prisma.$queryRawUnsafe(
    "SELECT has_database_privilege(current_user, current_database(), 'CREATE') AS can_create_database_objects, has_schema_privilege(current_user, 'public', 'CREATE') AS can_create_public_schema_objects",
  );
  const tableNames = tables.map((row) => String(row.table_name));
  const privilege = privileges[0] ?? {};

  process.stdout.write(
    JSON.stringify({
      connection: "active",
      table_count: tableNames.length,
      table_names: tableNames,
      automation_state_table_present: tableNames.some((name) =>
        /automation.*consult.*state/i.test(name),
      ),
      can_create_database_objects: Boolean(
        privilege.can_create_database_objects,
      ),
      can_create_public_schema_objects: Boolean(
        privilege.can_create_public_schema_objects,
      ),
    }),
  );
} catch (error) {
  process.stdout.write(
    JSON.stringify({
      connection: "failed",
      error_class:
        error && error.constructor ? error.constructor.name : "unknown",
    }),
  );
  process.exitCode = 2;
} finally {
  await prisma.$disconnect().catch(() => {});
}
