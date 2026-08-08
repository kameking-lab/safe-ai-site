import { PrismaClient } from "@prisma/client";
import { createHmac } from "node:crypto";

const prisma = new PrismaClient();

try {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT to_regclass('public."SharedRateBucket"')::text AS name`,
  );
  let sharedRateBucketWritable = false;
  const hmacSecret = process.env.SHARED_STATE_HMAC_SECRET?.trim() ?? "";
  const subjectHash = hmacSecret
    ? createHmac("sha256", hmacSecret)
        .update("anzen-ai-portal:shared-rate-limit:v1:preview-probe:readiness")
        .digest("base64url")
    : "";
  try {
    await prisma.$transaction(async (transaction) => {
      const rateRows = await transaction.$queryRawUnsafe(
        `
          WITH db_clock AS MATERIALIZED (
            SELECT clock_timestamp() AS now
          ),
          bounds AS (
            SELECT
              now,
              to_timestamp(
                floor(extract(epoch FROM now) * 1000 / $4::double precision)
                * $4::double precision / 1000
              ) AS window_start
            FROM db_clock
          ),
          consumed AS (
            INSERT INTO "SharedRateBucket" (
              "namespace", "routeKey", "subjectHash", "windowStart",
              "count", "expiresAt", "createdAt", "updatedAt"
            )
            SELECT
              $1, $2, $3, window_start, 1,
              window_start
                + (($4::bigint + $5::bigint) * interval '1 millisecond'),
              now, now
            FROM bounds
            ON CONFLICT ("namespace", "routeKey", "subjectHash", "windowStart")
            DO UPDATE SET
              "count" = "SharedRateBucket"."count" + 1,
              "expiresAt" = EXCLUDED."expiresAt",
              "updatedAt" = EXCLUDED."updatedAt"
            RETURNING "count", "windowStart"
          )
          SELECT
            consumed."count"::int AS "count",
            GREATEST(
              1,
              CEIL(
                EXTRACT(
                  epoch FROM (
                    consumed."windowStart"
                      + ($4::bigint * interval '1 millisecond')
                      - bounds.now
                  )
                )
              )::int
            ) AS "retryAfterSeconds"
          FROM consumed
          CROSS JOIN bounds
        `,
        "preview-probe",
        "readiness",
        subjectHash,
        60_000,
        300_000,
      );
      sharedRateBucketWritable =
        Number.isInteger(rateRows?.[0]?.count) &&
        Number.isInteger(rateRows?.[0]?.retryAfterSeconds);
      throw new Error("preview_probe_rollback");
    });
  } catch (error) {
    if (!(error instanceof Error) || error.message !== "preview_probe_rollback") {
      throw error;
    }
  }
  process.stdout.write(
    JSON.stringify({
      connected: true,
      sharedRateBucketExists: Boolean(rows?.[0]?.name),
      sharedRateBucketWritable,
      hmacConfigured: hmacSecret.length >= 32,
      hmacLength: hmacSecret.length,
    }),
  );
} catch (error) {
  process.stdout.write(
    JSON.stringify({
      connected: false,
      errorName: error instanceof Error ? error.name : "unknown",
      errorCode:
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        typeof error.code === "string"
          ? error.code
          : null,
    }),
  );
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
