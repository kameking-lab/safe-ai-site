import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  readiness: vi.fn(),
  consumeRateLimit: vi.fn(),
  anonymizeBucket: vi.fn(),
  persist: vi.fn(),
}));

vi.mock("@/lib/automation-funnel/server-readiness", () => ({
  getAutomationFunnelServerReadiness: mocks.readiness,
}));
vi.mock("@/lib/rum/postgres-store", () => ({
  consumeRumRateLimit: mocks.consumeRateLimit,
}));
vi.mock("@/lib/automation-funnel/postgres-store", () => ({
  anonymizeAutomationFunnelBucket: mocks.anonymizeBucket,
  persistAutomationFunnelEvent: mocks.persist,
}));

import { POST } from "./route";

const VALID = {
  event: "automation_cta_click",
  route_template: "/services/automation",
  cta_position: "hero",
  consultation_category: "automation",
  budget_bucket: "undecided",
  device_class: "desktop",
  anonymous_bucket: "af_0123456789abcdef01234567",
  consent_state: "granted",
};

function request(body: unknown, suffix = "") {
  return new Request(
    `https://www.anzen-ai-portal.jp/api/automation-funnel${suffix}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://www.anzen-ai-portal.jp",
      },
      body: JSON.stringify(body),
    },
  );
}

describe("automation funnel endpoint privacy boundary", () => {
  beforeEach(() => {
    mocks.readiness.mockReturnValue({ ready: true, retentionDays: 30 });
    mocks.anonymizeBucket.mockReturnValue("anonymous-rate-key");
    mocks.consumeRateLimit.mockResolvedValue({ allowed: true });
    mocks.persist.mockResolvedValue(undefined);
  });

  it("rejects request URL queries before parsing or persistence", async () => {
    const response = await POST(request(VALID, "?token=prohibited"));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: "invalid_request_url" },
    });
    expect(mocks.persist).not.toHaveBeenCalled();
  });

  it("rejects prohibited PII fields and never passes them to persistence", async () => {
    const response = await POST(
      request({ ...VALID, email: "person@example.invalid" }),
    );

    expect(response.status).toBe(422);
    expect(mocks.persist).not.toHaveBeenCalled();
    expect(mocks.consumeRateLimit).not.toHaveBeenCalled();
  });

  it("persists only a validated allowlist payload and disables caching", async () => {
    const response = await POST(request(VALID));

    expect(response.status).toBe(204);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.anonymizeBucket).toHaveBeenCalledWith(
      VALID.anonymous_bucket,
    );
    expect(mocks.persist).toHaveBeenCalledWith(VALID, 30);
  });
});
