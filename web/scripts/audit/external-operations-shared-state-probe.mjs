/**
 * Two-client synthetic probe for the existing production Postgres resource.
 *
 * It writes only random probe keys and a fixed non-PII Web Vitals payload,
 * verifies atomic cross-connection behavior, and removes every probe row in
 * `finally`. Connection values and generated keys are never printed.
 */
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const first = new PrismaClient({ log: [] });
const second = new PrismaClient({ log: [] });
const key = `probe.${randomBytes(18).toString("base64url")}`;
const fingerprint = randomBytes(32).toString("base64url");
const clientKey = randomBytes(32).toString("base64url");
const rumClientKey = randomBytes(32).toString("base64url");
const now = Date.now();
const consultWindowStart = new Date(
  Math.floor(now / 600_000) * 600_000,
);
const rumWindowStart = new Date(Math.floor(now / 60_000) * 60_000);
let rumMetricId = null;
let cleaned = false;
let result = {
  ok: false,
  errorClass: "probe-not-completed",
  piiIncluded: false,
  valuesIncluded: false,
};

async function begin(database) {
  return database.$transaction(async (transaction) => {
    await transaction.$queryRaw`
      SELECT pg_advisory_xact_lock(
        hashtextextended(${"automation-consult:idempotency:" + key}, 0)
      )::text AS "lock"
    `;
    const current = await transaction.automationConsultState.findUnique({
      where: { key },
    });
    if (current) return current.status === "pending" ? "pending" : "existing";
    await transaction.automationConsultState.create({
      data: {
        key,
        fingerprint,
        status: "pending",
        expiresAt: new Date(now + 300_000),
      },
    });
    return "new";
  });
}

try {
  const starts = await Promise.all([begin(first), begin(second)]);
  const completed = await first.automationConsultState.updateMany({
    where: { key, fingerprint, status: "pending" },
    data: {
      status: "success",
      response: {
        ok: true,
        referenceId: "AC-SYNTHETIC-PROBE",
        receivedAt: new Date(now).toISOString(),
      },
      expiresAt: new Date(now + 86_400_000),
    },
  });
  const replay = await second.automationConsultState.findUnique({
    where: { key },
    select: { status: true, fingerprint: true, response: true },
  });

  const consultCounts = [];
  for (let index = 0; index < 6; index += 1) {
    const database = index % 2 === 0 ? first : second;
    const result = await database.automationConsultRateBucket.upsert({
      where: {
        clientKey_windowStart: { clientKey, windowStart: consultWindowStart },
      },
      create: {
        clientKey,
        windowStart: consultWindowStart,
        count: 1,
        expiresAt: new Date(consultWindowStart.getTime() + 660_000),
      },
      update: { count: { increment: 1 } },
      select: { count: true },
    });
    consultCounts.push(result.count);
  }

  const rumCounts = [];
  for (let index = 0; index < 61; index += 1) {
    const database = index % 2 === 0 ? first : second;
    const result = await database.rumRateBucket.upsert({
      where: {
        clientKey_windowStart: {
          clientKey: rumClientKey,
          windowStart: rumWindowStart,
        },
      },
      create: {
        clientKey: rumClientKey,
        windowStart: rumWindowStart,
        count: 1,
        expiresAt: new Date(rumWindowStart.getTime() + 120_000),
      },
      update: { count: { increment: 1 } },
      select: { count: true },
    });
    rumCounts.push(result.count);
  }

  const metric = await first.rumMetric.create({
    data: {
      routeTemplate: "/safety-ai",
      metric: "LCP",
      value: 2_100,
      rating: "good",
      navigationType: "navigate",
      deviceClass: "mobile",
      connectionClass: "medium",
      buildId: "synthetic-production-probe",
      anonymousBucket: "rum_0123456789abcdef01234567",
      expiresAt: new Date(now + 30 * 86_400_000),
    },
    select: { id: true },
  });
  rumMetricId = metric.id;

  result = {
    ok:
      starts.filter((value) => value === "new").length === 1 &&
      starts.filter((value) => value === "pending").length === 1 &&
      completed.count === 1 &&
      replay?.status === "success" &&
      replay?.fingerprint === fingerprint &&
      consultCounts.join(",") === "1,2,3,4,5,6" &&
      rumCounts[0] === 1 &&
      rumCounts.at(-1) === 61,
    independentClients: 2,
    automationIdempotency: {
      newCount: starts.filter((value) => value === "new").length,
      pendingCount: starts.filter((value) => value === "pending").length,
      completedCount: completed.count,
      replay: replay?.status === "success",
      duplicate: 0,
    },
    automationRateLimit: {
      countsSequential: consultCounts.join(",") === "1,2,3,4,5,6",
      allowed: consultCounts.filter((count) => count <= 5).length,
      denied: consultCounts.filter((count) => count > 5).length,
    },
    rumRateLimit: {
      countsSequential: rumCounts.every(
        (count, index) => count === index + 1,
      ),
      allowed: rumCounts.filter((count) => count <= 60).length,
      denied: rumCounts.filter((count) => count > 60).length,
    },
    rumPayloadColumns: 9,
    piiIncluded: false,
    valuesIncluded: false,
  };
  if (!result.ok) process.exitCode = 2;
} catch (error) {
  result = {
    ok: false,
    errorClass:
      error && error.constructor ? error.constructor.name : "unknown",
    errorCode:
      error && typeof error.code === "string" ? error.code : "unavailable",
    modelName:
      error &&
      error.meta &&
      typeof error.meta.modelName === "string" &&
      /^(AutomationConsult|Rum)/.test(error.meta.modelName)
        ? error.meta.modelName
        : "unavailable",
    piiIncluded: false,
    valuesIncluded: false,
  };
  process.exitCode = 2;
} finally {
  await first
    .$transaction([
      first.automationConsultState.deleteMany({ where: { key } }),
      first.automationConsultRateBucket.deleteMany({ where: { clientKey } }),
      first.rumRateBucket.deleteMany({ where: { clientKey: rumClientKey } }),
      first.rumMetric.deleteMany({
        where: rumMetricId === null ? { id: { lt: 0 } } : { id: rumMetricId },
      }),
    ])
    .then(() => {
      cleaned = true;
    })
    .catch(() => undefined);
  await Promise.all([
    first.$disconnect().catch(() => undefined),
    second.$disconnect().catch(() => undefined),
  ]);
  result = {
    ...result,
    syntheticRowsRemoved: cleaned,
    ok: result.ok && cleaned,
  };
  process.stdout.write(`${JSON.stringify(result)}\n`);
  if (!cleaned) process.exitCode = 2;
}
