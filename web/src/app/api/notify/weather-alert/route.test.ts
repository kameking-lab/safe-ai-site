import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/notify/weather-alert authentication", () => {
  it("does not parse or send a request when CRON_SECRET is absent", async () => {
    vi.stubEnv("CRON_SECRET", "");
    vi.stubEnv("RESEND_API_KEY", "synthetic-never-used");
    const response = await POST(
      new Request("https://example.test/api/notify/weather-alert", {
        method: "POST",
        body: "not-json",
      })
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "auth_not_configured" });
  });

  it("rejects the wrong bearer token before any delivery work", async () => {
    vi.stubEnv("CRON_SECRET", "synthetic-test-token");
    const response = await POST(
      new Request("https://example.test/api/notify/weather-alert", {
        method: "POST",
        headers: { authorization: "Bearer wrong" },
        body: "not-json",
      })
    );
    expect(response.status).toBe(401);
  });

  it("認証後も正しい配信台帳が未実装の間は誤ったAudience宛送信をしない", async () => {
    vi.stubEnv("CRON_SECRET", "synthetic-test-token");
    vi.stubEnv("RESEND_API_KEY", "synthetic-never-used");
    vi.stubEnv("RESEND_AUDIENCE_ID", "synthetic-never-used");
    const response = await POST(
      new Request("https://example.test/api/notify/weather-alert", {
        method: "POST",
        headers: { authorization: "Bearer synthetic-test-token" },
        body: JSON.stringify({ prefecture: "東京都", alertType: "大雨警報" }),
      }),
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      success: false,
      delivered: false,
      reason: "delivery_unavailable",
    });
  });
});
