import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  mobileSession: { findUnique: vi.fn() },
  user: { findUnique: vi.fn() },
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ authorization: `Bearer ${"a".repeat(43)}` }) }));
vi.mock("./billing-service", () => ({ billingDb: () => db }));
import { mobileAuthSession } from "./session";
import { APP_REVIEW_USER_ID } from "../app-review";

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe("mobileAuthSession for the App Review member", () => {
  it("ends native review sessions once the review login is disabled or expired", async () => {
    db.mobileSession.findUnique.mockResolvedValue({ userId: APP_REVIEW_USER_ID, expiresAt: new Date(Date.now() + 60_000) });
    db.user.findUnique.mockResolvedValue({ id: APP_REVIEW_USER_ID, name: "App Review", email: null, image: null });
    vi.stubEnv("APP_REVIEW_LOGIN_ENABLED", "false");
    expect(await mobileAuthSession()).toBeNull();
    expect(db.user.findUnique).not.toHaveBeenCalled();

    vi.stubEnv("APP_REVIEW_LOGIN_ENABLED", "true");
    vi.stubEnv("APP_REVIEW_CODE_SHA256", createHash("sha256").update("synthetic").digest("hex"));
    vi.stubEnv("APP_REVIEW_EXPIRES_AT", "2999-01-01T00:00:00Z");
    vi.stubEnv("AUTH_SECRET", "synthetic");
    expect((await mobileAuthSession())?.user.id).toBe(APP_REVIEW_USER_ID);
  });

  it("does not affect ordinary members", async () => {
    db.mobileSession.findUnique.mockResolvedValue({ userId: "ordinary", expiresAt: new Date(Date.now() + 60_000) });
    db.user.findUnique.mockResolvedValue({ id: "ordinary", name: null, email: null, image: null });
    expect((await mobileAuthSession())?.user.id).toBe("ordinary");
  });
});
