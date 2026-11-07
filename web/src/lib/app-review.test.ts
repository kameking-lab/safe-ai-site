import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  APP_REVIEW_EMAIL,
  APP_REVIEW_USER_ID,
  APP_REVIEW_USERNAME,
  appReviewConfig,
  appReviewTokenValid,
  appReviewVersion,
  authorizeAppReview,
  type AppReviewDeps,
} from "./app-review";

const CODE = "synthetic-review-code-for-tests-only-0123456789";
const NOW = Date.parse("2026-11-06T00:00:00Z");
const env = (overrides: Record<string, string | undefined> = {}) => ({
  APP_REVIEW_LOGIN_ENABLED: "true",
  APP_REVIEW_CODE_SHA256: createHash("sha256").update(CODE).digest("hex"),
  APP_REVIEW_EXPIRES_AT: "2026-12-31T00:00:00Z",
  AUTH_SECRET: "synthetic-auth-secret",
  ...overrides,
}) as unknown as NodeJS.ProcessEnv;
const request = new Request("https://www.anzen-ai-portal.jp/api/auth/callback/app-review", { method: "POST" });

function fakeDb(state: { accounts?: number; stripeSubscriptionId?: string | null; billingEnvironment?: string } = {}) {
  return {
    user: { upsert: vi.fn(async () => ({ id: APP_REVIEW_USER_ID, email: APP_REVIEW_EMAIL, name: "App Review", image: null, _count: { accounts: state.accounts ?? 0 } })) },
    subscription: { upsert: vi.fn(async () => ({ stripeSubscriptionId: state.stripeSubscriptionId ?? null })) },
    mobileIdentity: { upsert: vi.fn(async () => ({ billingEnvironment: state.billingEnvironment ?? "SANDBOX" })) },
  };
}
function deps(db: ReturnType<typeof fakeDb>, overrides: Partial<AppReviewDeps> = {}): AppReviewDeps {
  return { db: db as unknown as AppReviewDeps["db"], env: env(), now: NOW, rateLimit: async () => ({ allowed: true }), ...overrides };
}

afterEach(() => vi.restoreAllMocks());

describe("appReviewConfig", () => {
  it("is enabled only with the explicit flag, a sha256 hex hash, a future expiry and AUTH_SECRET", () => {
    expect(appReviewConfig(env(), NOW)).not.toBeNull();
    expect(appReviewConfig(env({ APP_REVIEW_CODE_SHA256: createHash("sha256").update(CODE).digest("hex").toUpperCase() }), NOW)).not.toBeNull();
    for (const overrides of [
      { APP_REVIEW_LOGIN_ENABLED: undefined }, { APP_REVIEW_LOGIN_ENABLED: "1" }, { APP_REVIEW_LOGIN_ENABLED: "TRUE" },
      { APP_REVIEW_CODE_SHA256: undefined }, { APP_REVIEW_CODE_SHA256: "abc" }, { APP_REVIEW_CODE_SHA256: CODE },
      { APP_REVIEW_EXPIRES_AT: undefined }, { APP_REVIEW_EXPIRES_AT: "not-a-date" }, { APP_REVIEW_EXPIRES_AT: "2026-11-05T23:59:59Z" },
      { AUTH_SECRET: undefined },
    ]) expect(appReviewConfig(env(overrides), NOW)).toBeNull();
  });
});

describe("review session version", () => {
  it("lets ordinary tokens pass and requires the current version for the reserved member", () => {
    const version = appReviewVersion(env(), NOW)!;
    expect(version).toMatch(/^[a-f0-9]{64}$/);
    expect(appReviewTokenValid({ sub: "ordinary-user" }, env({ APP_REVIEW_LOGIN_ENABLED: undefined }), NOW)).toBe(true);
    expect(appReviewTokenValid({ sub: APP_REVIEW_USER_ID, reviewVersion: version }, env(), NOW)).toBe(true);
    expect(appReviewTokenValid({ sub: APP_REVIEW_USER_ID }, env(), NOW)).toBe(false);
    expect(appReviewTokenValid({ sub: "ordinary-user", reviewVersion: version }, env(), NOW)).toBe(false);
    // Rotation, expiry and disabling revoke an existing review session.
    const rotated = env({ APP_REVIEW_CODE_SHA256: createHash("sha256").update(`${CODE}-rotated`).digest("hex") });
    expect(appReviewTokenValid({ sub: APP_REVIEW_USER_ID, reviewVersion: version }, rotated, NOW)).toBe(false);
    expect(appReviewTokenValid({ sub: APP_REVIEW_USER_ID, reviewVersion: version }, env(), Date.parse("2027-01-01T00:00:00Z"))).toBe(false);
    expect(appReviewTokenValid({ sub: APP_REVIEW_USER_ID, reviewVersion: version }, env({ APP_REVIEW_LOGIN_ENABLED: "false" }), NOW)).toBe(false);
  });
});

describe("authorizeAppReview", () => {
  it("accepts only the fixed username and the code, as a free member with a SANDBOX billing identity", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const db = fakeDb();
    const user = await authorizeAppReview({ username: APP_REVIEW_USERNAME, password: CODE }, request, deps(db, { env: env({ MOBILE_LEDGER_ENABLED: "true" }) }));
    expect(user).toEqual({ id: APP_REVIEW_USER_ID, email: APP_REVIEW_EMAIL, name: "App Review", image: null });
    expect(db.user.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { id: APP_REVIEW_USER_ID }, update: {} }));
    expect(db.subscription.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: {}, create: { userId: APP_REVIEW_USER_ID, planName: "free", status: "active" } }));
    expect(db.mobileIdentity.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: {}, create: { userId: APP_REVIEW_USER_ID, billingEnvironment: "SANDBOX" } }));
  });

  it("does not touch the billing ledger while it is disabled", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const db = fakeDb();
    expect(await authorizeAppReview({ username: APP_REVIEW_USERNAME, password: CODE }, request, deps(db))).not.toBeNull();
    expect(db.mobileIdentity.upsert).not.toHaveBeenCalled();
  });

  it("rejects wrong credentials before any database write and logs no input", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => undefined);
    for (const credentials of [
      { username: APP_REVIEW_USERNAME, password: `${CODE}x` }, { username: "appreview", password: CODE },
      { username: APP_REVIEW_USERNAME, password: "" }, { username: APP_REVIEW_USERNAME }, { password: CODE },
      { username: APP_REVIEW_USERNAME, password: 42 }, { username: APP_REVIEW_USERNAME, password: CODE.padEnd(300, "x") },
    ]) {
      const db = fakeDb();
      expect(await authorizeAppReview(credentials, request, deps(db))).toBeNull();
      expect(db.user.upsert).not.toHaveBeenCalled();
    }
    for (const [line] of log.mock.calls) expect(String(line)).not.toContain(CODE);
  });

  it("is unavailable when disabled, expired or without a database", async () => {
    const db = fakeDb();
    const valid = { username: APP_REVIEW_USERNAME, password: CODE };
    expect(await authorizeAppReview(valid, request, deps(db, { env: env({ APP_REVIEW_LOGIN_ENABLED: undefined }) }))).toBeNull();
    expect(await authorizeAppReview(valid, request, deps(db, { now: Date.parse("2027-01-01T00:00:00Z") }))).toBeNull();
    expect(await authorizeAppReview(valid, request, deps(db, { db: null }))).toBeNull();
    expect(db.user.upsert).not.toHaveBeenCalled();
  });

  it("throttles before checking the code and fails closed when the limiter is down", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const valid = { username: APP_REVIEW_USERNAME, password: CODE };
    const db = fakeDb();
    expect(await authorizeAppReview(valid, request, deps(db, { rateLimit: async () => ({ allowed: false }) }))).toBeNull();
    expect(await authorizeAppReview(valid, request, deps(db, { rateLimit: async () => { throw new Error("down"); } }))).toBeNull();
    expect(db.user.upsert).not.toHaveBeenCalled();
  });

  it("fails closed if the reserved identity was linked, paid by Stripe or is not SANDBOX", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const valid = { username: APP_REVIEW_USERNAME, password: CODE };
    const ledger = { env: env({ MOBILE_LEDGER_ENABLED: "true" }) };
    expect(await authorizeAppReview(valid, request, deps(fakeDb({ accounts: 1 }), ledger))).toBeNull();
    expect(await authorizeAppReview(valid, request, deps(fakeDb({ stripeSubscriptionId: "sub_synthetic" }), ledger))).toBeNull();
    expect(await authorizeAppReview(valid, request, deps(fakeDb({ billingEnvironment: "PRODUCTION" }), ledger))).toBeNull();
    const broken = fakeDb();
    broken.user.upsert.mockRejectedValueOnce(new Error("db down"));
    expect(await authorizeAppReview(valid, request, deps(broken))).toBeNull();
  });
});
