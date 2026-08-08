import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/admin-access", () => ({
  hasAdminPageAccess: vi.fn(),
}));
vi.mock("@/lib/stats/ga4-client", () => ({
  fetchStats: vi.fn(async () => ({ source: "synthetic-test" })),
}));
vi.mock("@/lib/stats/page-analytics-client", () => ({
  fetchPageAnalytics: vi.fn(async () => ({ source: "synthetic-test" })),
}));

import { hasAdminPageAccess } from "@/lib/server/admin-access";
import { fetchStats } from "@/lib/stats/ga4-client";
import { fetchPageAnalytics } from "@/lib/stats/page-analytics-client";
import { GET as getStats } from "./route";
import { GET as getPageAnalytics } from "./page-analytics/route";

const access = vi.mocked(hasAdminPageAccess);

describe("PF-049 operational analytics authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a generic 404 and never queries providers without admin access", async () => {
    access.mockResolvedValue(false);
    for (const handler of [getStats, getPageAnalytics]) {
      const response = await handler(
        new Request("https://example.test/api/stats?period=30d"),
      );
      expect(response.status).toBe(404);
      expect(response.headers.get("cache-control")).toBe("no-store");
      await expect(response.json()).resolves.toEqual({ error: "not_found" });
    }
    expect(fetchStats).not.toHaveBeenCalled();
    expect(fetchPageAnalytics).not.toHaveBeenCalled();
  });

  it("allows the server-derived admin session", async () => {
    access.mockResolvedValue(true);
    expect(
      (
        await getStats(
          new Request("https://example.test/api/stats?period=7d"),
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await getPageAnalytics(
          new Request("https://example.test/api/stats/page-analytics?period=7d"),
        )
      ).status,
    ).toBe(200);
  });
});
