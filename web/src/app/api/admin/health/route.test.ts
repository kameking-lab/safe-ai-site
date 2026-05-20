import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/external/health", () => ({
  checkAllServices: vi.fn().mockResolvedValue([
    {
      id: "stub",
      label: "Stub",
      status: "ok",
      latencyMs: 1,
      detail: "ok",
      fallbackBehavior: "n/a",
      circuit: { state: "closed", consecutiveFailures: 0, lastErrorMessage: null },
    },
  ]),
}));

import { GET } from "./route";

const ORIGINAL_KEY = process.env.ADMIN_HEALTH_KEY;

describe("GET /api/admin/health auth", () => {
  beforeEach(() => {
    delete process.env.ADMIN_HEALTH_KEY;
  });

  afterEach(() => {
    if (ORIGINAL_KEY === undefined) {
      delete process.env.ADMIN_HEALTH_KEY;
    } else {
      process.env.ADMIN_HEALTH_KEY = ORIGINAL_KEY;
    }
  });

  it("returns 401 when ADMIN_HEALTH_KEY is unset (fail closed)", async () => {
    const res = await GET(new Request("https://example.test/api/admin/health?key=anything"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it("returns 401 when key is missing", async () => {
    process.env.ADMIN_HEALTH_KEY = "expected-secret";
    const res = await GET(new Request("https://example.test/api/admin/health"));
    expect(res.status).toBe(401);
  });

  it("returns 401 for the old hardcoded key", async () => {
    process.env.ADMIN_HEALTH_KEY = "expected-secret";
    const res = await GET(
      new Request("https://example.test/api/admin/health?key=anzenai2026")
    );
    expect(res.status).toBe(401);
  });

  it("returns 200 with the correct ?key= value", async () => {
    process.env.ADMIN_HEALTH_KEY = "expected-secret";
    const res = await GET(
      new Request("https://example.test/api/admin/health?key=expected-secret")
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.summary.ok).toBe(1);
  });

  it("returns 200 with a matching Authorization: Bearer header", async () => {
    process.env.ADMIN_HEALTH_KEY = "expected-secret";
    const res = await GET(
      new Request("https://example.test/api/admin/health", {
        headers: { authorization: "Bearer expected-secret" },
      })
    );
    expect(res.status).toBe(200);
  });

  it("prefers Authorization header over query string when both present", async () => {
    process.env.ADMIN_HEALTH_KEY = "expected-secret";
    const res = await GET(
      new Request("https://example.test/api/admin/health?key=wrong", {
        headers: { authorization: "Bearer expected-secret" },
      })
    );
    expect(res.status).toBe(200);
  });
});
