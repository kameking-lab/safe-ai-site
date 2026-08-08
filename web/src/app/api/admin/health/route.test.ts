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

  it("returns 503 when ADMIN_HEALTH_KEY is unset (fail closed and distinguish configuration)", async () => {
    const res = await GET(new Request("https://example.test/api/admin/health?key=anything"));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe("auth_not_configured");
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

  it("rejects query-string credentials so they cannot leak through URLs", async () => {
    process.env.ADMIN_HEALTH_KEY = "expected-secret";
    const res = await GET(
      new Request("https://example.test/api/admin/health?key=expected-secret")
    );
    expect(res.status).toBe(401);
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

  it("accepts a valid header even when an unrelated query parameter is present", async () => {
    process.env.ADMIN_HEALTH_KEY = "expected-secret";
    const res = await GET(
      new Request("https://example.test/api/admin/health?key=wrong", {
        headers: { authorization: "Bearer expected-secret" },
      })
    );
    expect(res.status).toBe(200);
  });
});
