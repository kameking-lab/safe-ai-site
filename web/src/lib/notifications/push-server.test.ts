import { afterEach, describe, expect, it } from "vitest";
import {
  isMissingTableError,
  isWebPushConfigured,
  sendPushToSubscription,
} from "./push-server";

describe("isMissingTableError", () => {
  it("detects PostgREST schema-cache miss (PGRST205)", () => {
    expect(isMissingTableError({ code: "PGRST205", message: "..." })).toBe(true);
  });
  it("detects Postgres relation-does-not-exist (42P01)", () => {
    expect(isMissingTableError({ code: "42P01", message: "..." })).toBe(true);
  });
  it("detects by message text (does not exist)", () => {
    expect(
      isMissingTableError({ message: 'relation "public.push_subscriptions" does not exist' })
    ).toBe(true);
  });
  it("detects 'Could not find the table' message", () => {
    expect(
      isMissingTableError({ message: "Could not find the table 'public.push_subscriptions'" })
    ).toBe(true);
  });
  it("returns false for null and unrelated errors", () => {
    expect(isMissingTableError(null)).toBe(false);
    expect(isMissingTableError({ code: "23505", message: "duplicate key" })).toBe(false);
  });
});

describe("isWebPushConfigured", () => {
  const ORIG = {
    pub: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    priv: process.env.VAPID_PRIVATE_KEY,
    subj: process.env.VAPID_SUBJECT,
    enabled: process.env.PUSH_DELIVERY_ENABLED,
  };
  afterEach(() => {
    for (const [name, value] of [
      ["NEXT_PUBLIC_VAPID_PUBLIC_KEY", ORIG.pub],
      ["VAPID_PRIVATE_KEY", ORIG.priv],
      ["VAPID_SUBJECT", ORIG.subj],
      ["PUSH_DELIVERY_ENABLED", ORIG.enabled],
    ] as const) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });

  it("false when any key is missing", () => {
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_SUBJECT;
    expect(isWebPushConfigured()).toBe(false);

    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "pub";
    expect(isWebPushConfigured()).toBe(false);
  });

  it("true when all three are set", () => {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "pub";
    process.env.VAPID_PRIVATE_KEY = "priv";
    process.env.VAPID_SUBJECT = "mailto:test@example.com";
    process.env.PUSH_DELIVERY_ENABLED = "true";
    expect(isWebPushConfigured()).toBe(true);
  });

  it("keys alone do not enable delivery without the explicit release flag", () => {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "pub";
    process.env.VAPID_PRIVATE_KEY = "priv";
    process.env.VAPID_SUBJECT = "mailto:test@example.com";
    delete process.env.PUSH_DELIVERY_ENABLED;
    expect(isWebPushConfigured()).toBe(false);
  });
});

describe("sendPushToSubscription", () => {
  it("rejects an unapproved stored endpoint before outbound delivery", async () => {
    const result = await sendPushToSubscription(
      {
        endpoint: "https://127.0.0.1/internal",
        p256dh: "synthetic-key",
        auth: "synthetic-auth",
        prefecture: "JP-13",
      },
      {
        id: "synthetic-notice",
        category: "weather",
        title: "Synthetic notification",
        date: "2026-07-22",
        severity: "warning",
      },
    );

    expect(result).toEqual({
      ok: false,
      expired: true,
      statusCode: null,
      detail: "invalid_subscription_endpoint",
    });
  });
});
