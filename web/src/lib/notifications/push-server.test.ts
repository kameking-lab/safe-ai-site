import { afterEach, describe, expect, it } from "vitest";
import { isMissingTableError, isWebPushConfigured } from "./push-server";

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
  };
  afterEach(() => {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = ORIG.pub;
    process.env.VAPID_PRIVATE_KEY = ORIG.priv;
    process.env.VAPID_SUBJECT = ORIG.subj;
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
    expect(isWebPushConfigured()).toBe(true);
  });
});
