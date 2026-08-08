import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { operations } = vi.hoisted(() => ({ operations: vi.fn() }));
vi.mock("@/lib/search-console/production-operations", () => ({
  runProductionSearchConsoleOperations: operations,
}));

import { GET } from "./route";

function request(secret?: string) {
  return new NextRequest(
    "https://www.anzen-ai-portal.jp/api/cron/search-console-operations",
    { headers: secret ? { Authorization: `Bearer ${secret}` } : {} },
  );
}

describe("Search Console operations cron", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "synthetic-cron-secret");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("SEARCH_CONSOLE_OPERATIONS_ENABLED", "true");
    operations.mockResolvedValue({
      access: "active",
      sitemap: {
        submissionResult: "already-submitted",
        errors: 0,
        warnings: 0,
      },
      urlInspection: {
        requested: true,
        productionUrls: 11,
        results: Array.from({ length: 11 }, () => ({ status: "active" })),
        previewUrls: 0,
        heatHoldUrls: 0,
      },
      failure: null,
    });
  });

  it("requires server-only cron authentication", async () => {
    expect((await GET(request())).status).toBe(401);
    expect(operations).not.toHaveBeenCalled();
  });

  it("does not retry known blocked credentials until explicitly enabled", async () => {
    vi.stubEnv("SEARCH_CONSOLE_OPERATIONS_ENABLED", "false");
    const response = await GET(request("synthetic-cron-secret"));

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      ok: false,
      operationStatus: "blocked-external",
      error: { code: "search_console_operations_disabled" },
    });
    expect(operations).not.toHaveBeenCalled();
  });

  it("is disabled outside production even if the explicit flag is present", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    expect((await GET(request("synthetic-cron-secret"))).status).toBe(503);
    expect(operations).not.toHaveBeenCalled();
  });

  it("targets only production URLs and may submit only the production sitemap", async () => {
    const response = await GET(request("synthetic-cron-secret"));
    expect(response.status).toBe(200);
    expect(operations).toHaveBeenCalledWith({
      allowMutations: true,
      inspectUrls: true,
    });
    expect(await response.json()).toMatchObject({
      ok: true,
      operationStatus: "active",
      access: "active",
      urlInspection: { previewUrls: 0, heatHoldUrls: 0 },
    });
  });

  it("reports blocked credentials without pretending success", async () => {
    operations.mockResolvedValue({
      access: "blocked-external",
      sitemap: {
        submissionResult: "not-attempted",
        errors: null,
        warnings: null,
      },
      urlInspection: {
        requested: true,
        productionUrls: 11,
        results: [],
        previewUrls: 0,
        heatHoldUrls: 0,
      },
      failure: null,
    });
    const response = await GET(request("synthetic-cron-secret"));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ ok: false });
  });

  it.each([
    {
      name: "top-level provider failure",
      patch: {
        failure: {
          code: "google_api_failed",
          stage: "search-analytics",
          httpStatus: 503,
        },
      },
    },
    {
      name: "sitemap submission failure",
      patch: {
        sitemap: {
          submissionResult: "blocked-external",
          errors: null,
          warnings: null,
        },
      },
    },
    {
      name: "reported sitemap errors",
      patch: {
        sitemap: {
          submissionResult: "already-submitted",
          errors: 1,
          warnings: 0,
        },
      },
    },
    {
      name: "partial URL inspection",
      patch: {
        urlInspection: {
          requested: true,
          productionUrls: 11,
          results: [
            ...Array.from({ length: 10 }, () => ({ status: "active" })),
            { status: "blocked-external" },
          ],
          previewUrls: 0,
          heatHoldUrls: 0,
        },
      },
    },
  ])("returns 502 for $name instead of a false success", async ({ patch }) => {
    operations.mockResolvedValue({
      access: "active",
      sitemap: {
        submissionResult: "already-submitted",
        errors: 0,
        warnings: 0,
      },
      urlInspection: {
        requested: true,
        productionUrls: 11,
        results: Array.from({ length: 11 }, () => ({ status: "active" })),
        previewUrls: 0,
        heatHoldUrls: 0,
      },
      failure: null,
      ...patch,
    });

    const response = await GET(request("synthetic-cron-secret"));
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({
      ok: false,
      operationStatus: "partial-failure",
    });
  });
});
