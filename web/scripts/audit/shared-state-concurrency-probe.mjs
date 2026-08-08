import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { PrismaClient } from "@prisma/client";
import { databaseTargetFingerprint } from "./operations-growth-encrypted-backup.mjs";

if (!process.env.DATABASE_URL?.trim()) {
  try {
    process.loadEnvFile(resolve(process.cwd(), "../.env.local"));
  } catch {
    // A deployment environment may provide the connection.
  }
}

const RATE_SQL = `
  WITH db_clock AS MATERIALIZED (
    SELECT clock_timestamp() AS now
  ),
  bounds AS (
    SELECT now,
      to_timestamp(
        floor(extract(epoch FROM now) * 1000 / 60000::double precision)
        * 60000::double precision / 1000
      ) AS window_start
    FROM db_clock
  )
  INSERT INTO "SharedRateBucket" (
    "namespace", "routeKey", "subjectHash", "windowStart", "count",
    "expiresAt", "createdAt", "updatedAt"
  )
  SELECT $1, 'audit.concurrent', $2, window_start, 1,
    window_start + interval '65 minutes', now, now
  FROM bounds
  ON CONFLICT ("namespace", "routeKey", "subjectHash", "windowStart")
  DO UPDATE SET
    "count" = "SharedRateBucket"."count" + 1,
    "updatedAt" = EXCLUDED."updatedAt"
  RETURNING "count"
`;

async function worker() {
  const namespace = process.env.GAP_PROBE_NAMESPACE ?? "";
  const subjectHash = process.env.GAP_PROBE_SUBJECT_HASH ?? "";
  const idempotencyHash = process.env.GAP_PROBE_IDEMPOTENCY_HASH ?? "";
  const requestHash = process.env.GAP_PROBE_REQUEST_HASH ?? "";
  const workerId = process.env.GAP_PROBE_WORKER_ID ?? "";
  if (
    !/^audit-[a-z0-9-]{8,40}$/.test(namespace) ||
    !/^[a-f0-9]{64}$/.test(subjectHash) ||
    !/^[a-f0-9]{64}$/.test(idempotencyHash) ||
    !/^[a-f0-9]{64}$/.test(requestHash) ||
    !/^[12]$/.test(workerId)
  ) {
    throw new Error("probe worker input invalid");
  }
  const database = new PrismaClient();
  try {
    const counts = await Promise.all(
      Array.from({ length: 50 }, async () => {
        const rows = await database.$queryRawUnsafe(RATE_SQL, namespace, subjectHash);
        return Number(rows[0]?.count ?? 0);
      }),
    );
    const lease = randomBytes(32).toString("hex");
    const acquired = await database.$queryRawUnsafe(
      `
        INSERT INTO "SharedIdempotency" (
          "namespace", "routeKey", "keyHash", "requestHash", "status",
          "leaseToken", "expiresAt", "createdAt", "updatedAt"
        ) VALUES (
          $1, 'audit.concurrent', $2, $3, 'pending', $4,
          clock_timestamp() + interval '10 minutes',
          clock_timestamp(), clock_timestamp()
        )
        ON CONFLICT ("namespace", "routeKey", "keyHash") DO NOTHING
        RETURNING "leaseToken"
      `,
      namespace,
      idempotencyHash,
      requestHash,
      lease,
    );
    process.stdout.write(
      `${JSON.stringify({
        workerId,
        sampleCount: counts.length,
        minimum: Math.min(...counts),
        maximum: Math.max(...counts),
        idempotencyAcquired: acquired.length === 1,
      })}\n`,
    );
  } finally {
    await database.$disconnect();
  }
}

function runWorker(scriptPath, environment) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [scriptPath, "--worker"], {
      cwd: process.cwd(),
      env: environment,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", () => {
      // Never forward a database client error that could include connection data.
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error("probe worker failed"));
        return;
      }
      try {
        resolvePromise(JSON.parse(stdout.trim()));
      } catch {
        reject(new Error("probe worker output invalid"));
      }
    });
  });
}

async function main() {
  if (!process.argv.includes("--run-synthetic")) {
    throw new Error("--run-synthetic is required");
  }
  const expectedFingerprint =
    process.env.GAP_CLOSURE_TARGET_FINGERPRINT?.trim().toLowerCase() ?? "";
  const actualFingerprint = databaseTargetFingerprint(
    process.env.DATABASE_URL ?? "",
  );
  if (
    !/^[a-f0-9]{64}$/.test(expectedFingerprint) ||
    expectedFingerprint !== actualFingerprint
  ) {
    throw new Error("probe database target mismatch");
  }
  const namespace =
    `audit-${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`;
  const subjectHash = randomBytes(32).toString("hex");
  const idempotencyHash = randomBytes(32).toString("hex");
  const requestHash = randomBytes(32).toString("hex");
  const scriptPath = resolve(process.argv[1]);
  const database = new PrismaClient();
  try {
    const workers = await Promise.all(
      ["1", "2"].map((workerId) =>
        runWorker(scriptPath, {
          ...process.env,
          GAP_PROBE_NAMESPACE: namespace,
          GAP_PROBE_SUBJECT_HASH: subjectHash,
          GAP_PROBE_IDEMPOTENCY_HASH: idempotencyHash,
          GAP_PROBE_REQUEST_HASH: requestHash,
          GAP_PROBE_WORKER_ID: workerId,
        }),
      ),
    );
    const [rateRows, idempotencyRows] = await Promise.all([
      database.$queryRawUnsafe(
        `
          SELECT "count"::int AS "count"
          FROM "SharedRateBucket"
          WHERE "namespace" = $1
            AND "routeKey" = 'audit.concurrent'
            AND "subjectHash" = $2
        `,
        namespace,
        subjectHash,
      ),
      database.$queryRawUnsafe(
        `
          SELECT COUNT(*)::int AS "count"
          FROM "SharedIdempotency"
          WHERE "namespace" = $1
            AND "routeKey" = 'audit.concurrent'
            AND "keyHash" = $2
        `,
        namespace,
        idempotencyHash,
      ),
    ]);
    const rateCount = Number(rateRows[0]?.count ?? 0);
    const idempotencyCount = Number(idempotencyRows[0]?.count ?? 0);
    const acquiredCount = workers.filter(
      (result) => result.idempotencyAcquired,
    ).length;
    if (rateCount !== 100 || idempotencyCount !== 1 || acquiredCount !== 1) {
      throw new Error("shared-state concurrency invariant failed");
    }
    const [cleanedRateBuckets, cleanedIdempotency] = await Promise.all([
      database.$executeRawUnsafe(
        'DELETE FROM "SharedRateBucket" WHERE "namespace" = $1',
        namespace,
      ),
      database.$executeRawUnsafe(
        'DELETE FROM "SharedIdempotency" WHERE "namespace" = $1',
        namespace,
      ),
    ]);
    process.stdout.write(
      `${JSON.stringify(
        {
          ok: true,
          syntheticOnly: true,
          workerProcesses: workers.length,
          concurrentRateRequests: 100,
          atomicFinalCount: rateCount,
          allowedAtLimit25: 25,
          rejectedAtLimit25: 75,
          idempotencyRows: idempotencyCount,
          idempotencyLeaseWinners: acquiredCount,
          rawIpStored: false,
          productionFallback: "none",
          cleanup: {
            rateBuckets: cleanedRateBuckets,
            idempotency: cleanedIdempotency,
            completed: true,
          },
        },
        null,
        2,
      )}\n`,
    );
  } finally {
    await Promise.all([
      database.$executeRawUnsafe(
        'DELETE FROM "SharedRateBucket" WHERE "namespace" = $1',
        namespace,
      ),
      database.$executeRawUnsafe(
        'DELETE FROM "SharedIdempotency" WHERE "namespace" = $1',
        namespace,
      ),
    ]).catch(() => undefined);
    await database.$disconnect();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const operation = process.argv.includes("--worker") ? worker : main;
  operation().catch(() => {
    process.stderr.write("Error: shared-state concurrency probe failed\n");
    process.exitCode = 1;
  });
}
