import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import {
  anonymizeRumClient,
  consumeRumRateLimit,
  getRumClientIp,
  persistRumMetric,
} from "./postgres-store";

const PAYLOAD = {
  route_template: "/safety-ai" as const,
  metric: "LCP" as const,
  value: 2_100,
  rating: "good" as const,
  navigation_type: "navigate" as const,
  device_class: "mobile" as const,
  connection_class: "medium" as const,
  build_id: "build_20260729",
  anonymous_bucket: "rum_0123456789abcdef01234567",
};

describe("Postgres RUM privacy store", () => {
  it("HMACs the client address and never returns the raw address", () => {
    const anonymous = anonymizeRumClient("203.0.113.44", "s".repeat(32));
    expect(anonymous).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(anonymous).not.toContain("203.0.113.44");
    expect(anonymizeRumClient("203.0.113.44", "short")).toBeNull();
    expect(
      getRumClientIp(
        new Request("https://example.test", {
          headers: { "x-forwarded-for": "203.0.113.44, 198.51.100.1" },
        }),
      ),
    ).toBe("203.0.113.44");
  });

  it("uses a multi-instance atomic upsert for the fixed rate window", async () => {
    const upsert = vi
      .fn()
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 61 });
    const database = {
      rumRateBucket: { upsert },
    } as unknown as PrismaClient;

    await expect(
      consumeRumRateLimit("anonymous-client", database, 120_001),
    ).resolves.toEqual({ allowed: true });
    await expect(
      consumeRumRateLimit("anonymous-client", database, 120_001),
    ).resolves.toEqual({
      allowed: false,
      retryAfterSeconds: 60,
    });
    expect(upsert).toHaveBeenCalledTimes(2);
  });

  it("stores only the validated nine-field payload plus server timestamps", async () => {
    const create = vi.fn().mockResolvedValue({ id: 1 });
    const database = {
      rumMetric: { create },
    } as unknown as PrismaClient;

    await persistRumMetric(PAYLOAD, 30, database);

    const data = create.mock.calls[0]?.[0]?.data;
    expect(data).toMatchObject({
      routeTemplate: "/safety-ai",
      metric: "LCP",
      value: 2_100,
      rating: "good",
      navigationType: "navigate",
      deviceClass: "mobile",
      connectionClass: "medium",
      buildId: "build_20260729",
      anonymousBucket: "rum_0123456789abcdef01234567",
    });
    expect(Object.keys(data).sort()).toEqual(
      [
        "anonymousBucket",
        "buildId",
        "connectionClass",
        "deviceClass",
        "expiresAt",
        "metric",
        "navigationType",
        "rating",
        "routeTemplate",
        "value",
      ].sort(),
    );
    expect(JSON.stringify(data)).not.toContain("email");
    expect(JSON.stringify(data)).not.toContain("url");
    expect(JSON.stringify(data)).not.toContain("query");
  });
});
