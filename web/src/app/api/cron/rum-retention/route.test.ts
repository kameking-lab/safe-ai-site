import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { readiness, funnelReadiness, plan, cleanup, sharedCleanup } = vi.hoisted(() => ({
  readiness: vi.fn(),
  funnelReadiness: vi.fn(),
  plan: vi.fn(),
  cleanup: vi.fn(),
  sharedCleanup: vi.fn(),
}));

vi.mock("@/lib/rum/server-readiness", () => ({
  getRumServerReadiness: readiness,
}));
vi.mock("@/lib/rum/postgres-store", () => ({
  deleteExpiredRum: vi.fn(),
}));
vi.mock("@/lib/automation-funnel/server-readiness", () => ({
  getAutomationFunnelServerReadiness: funnelReadiness,
}));
vi.mock("@/lib/operations/retention", () => ({
  planOperationsRetention: plan,
  purgeOperationsRetention: cleanup,
}));
vi.mock("@/lib/security/shared-state", () => ({
  deleteExpiredSharedState: sharedCleanup,
}));

import { GET } from "./route";

function request(secret?: string) {
  return new NextRequest(
    "https://www.anzen-ai-portal.jp/api/cron/rum-retention",
    {
      headers: secret ? { Authorization: `Bearer ${secret}` } : {},
    },
  );
}

describe("RUM retention cron", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "synthetic-cron-secret");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("DATABASE_URL", "postgresql://synthetic.invalid/db");
    readiness.mockReturnValue({
      ready: true,
      sinkBackend: "postgres",
      retentionDays: 30,
    });
    funnelReadiness.mockReturnValue({
      ready: true,
      runtime: "production",
      collection: "configured",
      database: "configured",
      retention: "configured",
      retentionDays: 30,
      rateLimitSecret: "configured",
    });
    plan.mockResolvedValue({
      rumMetrics: 3,
      rumRateBuckets: 2,
      funnelEvents: 1,
      funnelStore: "available",
    });
    cleanup.mockResolvedValue({
      rumMetrics: 3,
      rumRateBuckets: 2,
      funnelEvents: 1,
      funnelStore: "available",
    });
    sharedCleanup.mockResolvedValue({ rateBuckets: 4, idempotency: 2 });
  });

  it("requires server-only cron authentication", async () => {
    expect((await GET(request())).status).toBe(401);
    expect(cleanup).not.toHaveBeenCalled();
  });

  it("deletes only expired RUM rows when the Postgres sink is ready", async () => {
    const response = await GET(request("synthetic-cron-secret"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      dryRun: false,
      eligibleOrDeleted: {
        rumMetrics: 3,
        rumRateBuckets: 2,
        funnelEvents: 1,
        funnelStore: "available",
      },
      sharedState: {
        rateBuckets: 4,
        idempotency: 2,
        mode: "deleted",
      },
      automationConsultQueue: {
        deleted: null,
        mode: "deleted",
      },
      chemicalReassessment: {
        processed: null,
        mode: "updated",
      },
      retentionDays: { rum: 30, funnel: 30 },
      retentionSource: "row-expiresAt",
    });
  });

  it("supports an authenticated read-only dry-run", async () => {
    const response = await GET(
      new NextRequest(
        "https://www.anzen-ai-portal.jp/api/cron/rum-retention?dryRun=1",
        { headers: { Authorization: "Bearer synthetic-cron-secret" } },
      ),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).dryRun).toBe(true);
    expect(plan).toHaveBeenCalledOnce();
    expect(cleanup).not.toHaveBeenCalled();
  });

  it("continues expiry when collection readiness is disabled", async () => {
    readiness.mockReturnValue({ ready: false, sinkBackend: null });
    expect((await GET(request("synthetic-cron-secret"))).status).toBe(200);
    expect(cleanup).toHaveBeenCalledOnce();
  });

  it("continues both expiry stores when current retention settings are absent", async () => {
    funnelReadiness.mockReturnValue({
      ready: false,
      runtime: "production",
      collection: "missing",
      database: "missing",
      retention: "missing",
      retentionDays: null,
      rateLimitSecret: "missing",
    });
    const response = await GET(request("synthetic-cron-secret"));

    expect(response.status).toBe(200);
    expect(cleanup).toHaveBeenCalledOnce();
    expect(await response.json()).toMatchObject({
      retentionDays: { rum: 30, funnel: null },
      retentionSource: "row-expiresAt",
    });
  });

  it("fails closed outside production or without the existing database", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    expect((await GET(request("synthetic-cron-secret"))).status).toBe(503);
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("DATABASE_URL", "");
    expect((await GET(request("synthetic-cron-secret"))).status).toBe(503);
    expect(cleanup).not.toHaveBeenCalled();
  });

  it("reports a partial failure after RUM cleanup if the funnel table is unavailable", async () => {
    cleanup.mockResolvedValue({
      rumMetrics: 3,
      rumRateBuckets: 2,
      funnelEvents: null,
      funnelStore: "unavailable",
    });
    const response = await GET(request("synthetic-cron-secret"));

    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({
      ok: false,
      eligibleOrDeleted: {
        rumMetrics: 3,
        rumRateBuckets: 2,
        funnelEvents: null,
        funnelStore: "unavailable",
      },
    });
  });
});
