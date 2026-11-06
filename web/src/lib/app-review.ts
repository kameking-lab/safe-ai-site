import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { consumeRequestRateLimit } from "@/lib/security/shared-state";

// App Store review sign-in. Server only: never pass these values to a client.
// The identity is reserved and fixed; an owner can never point the code at an
// ordinary member account.
export const APP_REVIEW_PROVIDER_ID = "app-review";
export const APP_REVIEW_USERNAME = "AppReview";
export const APP_REVIEW_USER_ID = "app-review-ios-v1";
export const APP_REVIEW_EMAIL = "app-review@accounts.anzen-ai-portal.invalid";
const RATE_POLICY = { routeKey: "app-review-login", limit: 10, windowMs: 10 * 60_000 };

export type AppReviewConfig = { codeHash: string; expiresAt: number };

export function appReviewConfig(env: NodeJS.ProcessEnv = process.env, now = Date.now()): AppReviewConfig | null {
  if (env.APP_REVIEW_LOGIN_ENABLED !== "true") return null;
  const codeHash = env.APP_REVIEW_CODE_SHA256?.trim().toLowerCase() ?? "";
  const expiresAt = Date.parse(env.APP_REVIEW_EXPIRES_AT ?? "");
  if (!/^[a-f0-9]{64}$/.test(codeHash) || !Number.isFinite(expiresAt) || expiresAt <= now || !env.AUTH_SECRET) return null;
  return { codeHash, expiresAt };
}

/** Binds a review session to the current code and expiry: rotation, expiry or disabling revokes it. */
export function appReviewVersion(env: NodeJS.ProcessEnv = process.env, now = Date.now()): string | null {
  const config = appReviewConfig(env, now);
  if (!config) return null;
  return createHmac("sha256", env.AUTH_SECRET!)
    .update(JSON.stringify(["anzen-app-review-v1", APP_REVIEW_USER_ID, config.codeHash, config.expiresAt]))
    .digest("hex");
}

/** Non-review tokens always pass. Review tokens must carry the current version. */
export function appReviewTokenValid(token: { sub?: unknown; reviewVersion?: unknown }, env: NodeJS.ProcessEnv = process.env, now = Date.now()) {
  if (token.sub !== APP_REVIEW_USER_ID && token.reviewVersion === undefined) return true;
  const expected = appReviewVersion(env, now);
  return token.sub === APP_REVIEW_USER_ID && typeof token.reviewVersion === "string" && !!expected &&
    token.reviewVersion.length === expected.length && timingSafeEqual(Buffer.from(token.reviewVersion), Buffer.from(expected));
}

function audit(outcome: "denied" | "limited" | "unavailable" | "accepted") {
  // No input, address, code, hash or error detail in logs.
  console.info(JSON.stringify({ event: "app_review_login", outcome, at: new Date().toISOString() }));
}

type ReviewDb = Pick<PrismaClient, "user" | "subscription" | "mobileIdentity">;
export type AppReviewDeps = {
  db: ReviewDb | null;
  env?: NodeJS.ProcessEnv;
  now?: number;
  rateLimit?: (request: Request) => Promise<{ allowed: boolean }>;
};

export async function authorizeAppReview(credentials: Partial<Record<"username" | "password", unknown>>, request: Request, deps: AppReviewDeps) {
  const env = deps.env ?? process.env;
  const config = appReviewConfig(env, deps.now ?? Date.now());
  if (!config || !deps.db) return null;
  try {
    // Throttle every attempt before the code is checked. A limiter outage fails closed.
    const limited = await (deps.rateLimit ?? (req => consumeRequestRateLimit(req, RATE_POLICY)))(request);
    if (!limited.allowed) { audit("limited"); return null; }
  } catch { audit("unavailable"); return null; }
  const password = typeof credentials.password === "string" && credentials.password.length <= 256 ? credentials.password : "";
  const usernameOk = credentials.username === APP_REVIEW_USERNAME;
  const codeOk = timingSafeEqual(createHash("sha256").update(password).digest(), Buffer.from(config.codeHash, "hex"));
  if (!usernameOk || !codeOk || !password) { audit("denied"); return null; }
  try {
    // Empty update never resets the reviewer's purchases or profile.
    const user = await deps.db.user.upsert({
      where: { id: APP_REVIEW_USER_ID }, update: {},
      create: { id: APP_REVIEW_USER_ID, email: APP_REVIEW_EMAIL, name: "App Review" },
      select: { id: true, email: true, name: true, image: true, _count: { select: { accounts: true } } },
    });
    // OAuth accounts are never linked to the reserved identity; fail closed if one was.
    if (user.id !== APP_REVIEW_USER_ID || user.email !== APP_REVIEW_EMAIL || user._count.accounts !== 0) { audit("denied"); return null; }
    // Credentials sign-in does not fire createUser: create the default free row here.
    // The reviewer is never granted Pro. They reach the paywall and buy with an Apple sandbox account.
    const subscription = await deps.db.subscription.upsert({
      where: { userId: APP_REVIEW_USER_ID }, update: {},
      create: { userId: APP_REVIEW_USER_ID, planName: "free", status: "active" },
      select: { stripeSubscriptionId: true },
    });
    if (subscription.stripeSubscriptionId !== null) { audit("denied"); return null; }
    if (env.MOBILE_LEDGER_ENABLED === "true") {
      // Only this reserved member is a SANDBOX billing identity, so App Review's
      // sandbox purchase is credited while ordinary members never receive sandbox rights.
      const identity = await deps.db.mobileIdentity.upsert({
        where: { userId: APP_REVIEW_USER_ID }, update: {},
        create: { userId: APP_REVIEW_USER_ID, billingEnvironment: "SANDBOX" },
        select: { billingEnvironment: true },
      });
      if (identity.billingEnvironment !== "SANDBOX") { audit("denied"); return null; }
    }
    audit("accepted");
    return { id: user.id, email: user.email, name: user.name, image: user.image };
  } catch { audit("unavailable"); return null; }
}
