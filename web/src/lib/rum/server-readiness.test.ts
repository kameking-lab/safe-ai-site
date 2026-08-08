import { describe, expect, it } from "vitest";
import { getRumServerReadiness } from "./server-readiness";

const READY_ENV = {
  RUM_COLLECTION_ENABLED: "true",
  RUM_SINK_BACKEND: "external",
  RUM_SINK_ENDPOINT: "https://rum-collector.example.test/v1/web-vitals",
  RUM_RETENTION_DAYS: "30",
  RUM_DPA_APPROVED: "true",
  RUM_EDGE_RATE_LIMIT_VERIFIED: "true",
  RUM_SAMPLE_RATE: "0.1",
  VERCEL_ENV: "production",
};

describe("RUM server readiness", () => {
  it("requires every external governance and production gate", () => {
    expect(getRumServerReadiness(READY_ENV)).toMatchObject({
      ready: true,
      sink: "configured",
      sinkBackend: "external",
      retention: "configured",
      retentionDays: 30,
      dpa: "configured",
      edgeRateLimit: "configured",
      runtime: "production",
      sampleRate: 0.1,
    });
  });

  it.each([
    ["RUM_COLLECTION_ENABLED", undefined],
    ["RUM_SINK_ENDPOINT", undefined],
    ["RUM_RETENTION_DAYS", "31"],
    ["RUM_DPA_APPROVED", "false"],
    ["RUM_EDGE_RATE_LIMIT_VERIFIED", "false"],
    ["RUM_SAMPLE_RATE", "0"],
    ["VERCEL_ENV", "preview"],
  ] as const)("fails closed when %s is not ready", (name, value) => {
    expect(
      getRumServerReadiness({ ...READY_ENV, [name]: value }).ready,
    ).toBe(false);
  });

  it("rejects a recursive portal collector", () => {
    expect(
      getRumServerReadiness({
        ...READY_ENV,
        RUM_SINK_ENDPOINT: "https://www.anzen-ai-portal.jp/api/rum",
      }),
    ).toMatchObject({ ready: false, sink: "invalid" });
  });

  it("accepts the existing Postgres integration only with a dedicated HMAC secret", () => {
    const postgres = {
      ...READY_ENV,
      RUM_SINK_BACKEND: "postgres",
      RUM_SINK_ENDPOINT: "",
      DATABASE_URL: "postgresql://configured-server-only",
      RUM_RATE_LIMIT_HASH_SECRET: "r".repeat(32),
    };
    expect(getRumServerReadiness(postgres)).toMatchObject({
      ready: true,
      sink: "configured",
      sinkBackend: "postgres",
      rateLimitSecret: "configured",
      retentionDays: 30,
    });
    expect(
      getRumServerReadiness({
        ...postgres,
        RUM_RATE_LIMIT_HASH_SECRET: "",
      }).ready,
    ).toBe(false);
  });
});
