#!/usr/bin/env node

/**
 * Read-only Supabase suitability probe.
 *
 * It verifies REST reachability and only asks for zero rows from the four
 * purpose-specific shared-state table names. URLs, keys, schema contents, and
 * any existing records are never printed.
 */
const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const anonymousKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const probeKey = serviceKey || anonymousKey;
const tableNames = [
  "automation_consult_state",
  "automation_consult_rate_bucket",
  "rum_metric",
  "rum_rate_bucket",
];

let origin = null;
try {
  const parsed = new URL(rawUrl ?? "");
  if (
    parsed.protocol === "https:" &&
    (parsed.hostname === "supabase.co" ||
      parsed.hostname.endsWith(".supabase.co")) &&
    !parsed.username &&
    !parsed.password &&
    !parsed.search &&
    !parsed.hash
  ) {
    origin = parsed.origin;
  }
} catch {
  origin = null;
}

const report = {
  configured: Boolean(rawUrl && probeKey),
  urlValid: Boolean(origin),
  keyPresent: Boolean(probeKey),
  credentialClass: serviceKey
    ? "server-service-role"
    : anonymousKey
      ? "public-anonymous"
      : "missing",
  restReachable: false,
  tables: Object.fromEntries(
    tableNames.map((name) => [
      name,
      { exists: false, httpStatus: null },
    ]),
  ),
  suitableWithoutSchemaChange: false,
  recordsRead: 0,
  valuesIncluded: false,
  piiIncluded: false,
};

if (origin && probeKey) {
  const headers = {
    apikey: probeKey,
    Authorization: `Bearer ${probeKey}`,
    Accept: "application/json",
  };
  try {
    const response = await fetch(`${origin}/rest/v1/`, {
      method: "GET",
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    report.restReachable = response.ok;
    await response.body?.cancel().catch(() => undefined);
  } catch {
    report.restReachable = false;
  }

  for (const tableName of tableNames) {
    try {
      const response = await fetch(
        `${origin}/rest/v1/${tableName}?select=*&limit=0`,
        {
          method: "GET",
          headers,
          cache: "no-store",
          signal: AbortSignal.timeout(15_000),
        },
      );
      report.tables[tableName] = {
        exists: response.ok,
        httpStatus: response.status,
      };
      await response.body?.cancel().catch(() => undefined);
    } catch {
      report.tables[tableName] = {
        exists: false,
        httpStatus: null,
      };
    }
  }
}

report.suitableWithoutSchemaChange =
  report.restReachable &&
  Object.values(report.tables).every((table) => table.exists);
process.stdout.write(`${JSON.stringify(report)}\n`);
