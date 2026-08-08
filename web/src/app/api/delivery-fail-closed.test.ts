import { afterEach, describe, expect, it } from "vitest";
import { POST as subscribeWeather } from "@/app/api/notify/subscribe/route";
import { POST as subscribeNewsletter } from "@/app/api/newsletter/subscribe/route";
import { POST as sendNewsletter } from "@/app/api/newsletter/send/route";
import {
  GET as unsubscribeNewsletterGet,
  POST as unsubscribeNewsletterPost,
} from "@/app/api/newsletter/unsubscribe/route";

afterEach(() => {
  delete process.env.AUTOMATED_NOTIFICATION_DELIVERY_ENABLED;
  delete process.env.NEWSLETTER_ADMIN_TOKEN;
});

describe("automated delivery activation boundary", () => {
  it("rejects weather-email registration before operational attestation", async () => {
    const response = await subscribeWeather(new Request("https://example.test/api/notify/subscribe", {
      method: "POST",
      body: JSON.stringify({ email: "marker@example.test", prefecture: "東京都" }),
    }));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      delivered: false,
      error: "delivery_not_operationally_verified",
    });
  });

  it("rejects newsletter registration before operational attestation", async () => {
    const response = await subscribeNewsletter(new Request("https://example.test/api/newsletter/subscribe", {
      method: "POST",
      body: JSON.stringify({ email: "marker@example.test" }),
    }));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ ok: false, error: "delivery_not_operationally_verified" });
  });

  it("rejects an authenticated newsletter send while opaque unsubscribe links are unavailable", async () => {
    process.env.NEWSLETTER_ADMIN_TOKEN = "test-newsletter-admin-token";
    const response = await sendNewsletter(
      new Request("https://example.test/api/newsletter/send", {
        method: "POST",
        headers: {
          authorization: "Bearer test-newsletter-admin-token",
        },
      }),
    );

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      ok: false,
      sent: 0,
      reason: "opaque_unsubscribe_flow_required",
    });
  });

  it.each([
    ["GET", unsubscribeNewsletterGet],
    ["POST", unsubscribeNewsletterPost],
  ] as const)(
    "retires the legacy newsletter unsubscribe %s endpoint without caching or referrer disclosure",
    async (_method, handler) => {
      const response = await handler();

      expect(response.status).toBe(410);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(response.headers.get("referrer-policy")).toBe("no-referrer");
      expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
      expect(response.headers.get("content-type")).toContain("text/html");
      expect(await response.text()).toContain(
        'name="robots" content="noindex,nofollow"',
      );
    },
  );
});
