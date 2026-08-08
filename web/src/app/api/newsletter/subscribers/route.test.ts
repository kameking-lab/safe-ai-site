import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/newsletter/subscribers authentication", () => {
  it("fails closed when NEWSLETTER_ADMIN_TOKEN is not configured", async () => {
    vi.stubEnv("NEWSLETTER_ADMIN_TOKEN", "");
    const response = await GET(new Request("https://example.test/api/newsletter/subscribers"));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "auth_not_configured" });
  });

  it("rejects an unauthenticated request when configured", async () => {
    vi.stubEnv("NEWSLETTER_ADMIN_TOKEN", "synthetic-test-token");
    const response = await GET(new Request("https://example.test/api/newsletter/subscribers"));
    expect(response.status).toBe(401);
  });
});
