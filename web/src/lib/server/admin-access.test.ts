import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

import { auth } from "@/auth";
import { hasAdminPageAccess, isAdminEmail } from "./admin-access";

const originalAuthSecret = process.env.AUTH_SECRET;
const originalAdminEmails = process.env.ADMIN_EMAILS;

afterEach(() => {
  vi.mocked(auth).mockReset();
  if (originalAuthSecret === undefined) delete process.env.AUTH_SECRET;
  else process.env.AUTH_SECRET = originalAuthSecret;
  if (originalAdminEmails === undefined) delete process.env.ADMIN_EMAILS;
  else process.env.ADMIN_EMAILS = originalAdminEmails;
});

describe("admin email allowlist", () => {
  it("fails closed when the allowlist or email is absent", () => {
    expect(isAdminEmail("admin@example.invalid", "")).toBe(false);
    expect(isAdminEmail(null, "admin@example.invalid")).toBe(false);
  });

  it("uses normalized exact matching and rejects suffix confusion", () => {
    const allowlist = "first@example.invalid, Admin@Example.invalid";
    expect(isAdminEmail("admin@example.invalid", allowlist)).toBe(true);
    expect(isAdminEmail("admin@example.invalid.evil.test", allowlist)).toBe(false);
  });

  it("fails closed before resolving a session when admin auth is unconfigured", async () => {
    delete process.env.AUTH_SECRET;
    process.env.ADMIN_EMAILS = "admin@example.invalid";

    await expect(hasAdminPageAccess()).resolves.toBe(false);
    expect(auth).not.toHaveBeenCalled();
  });

  it("rejects an authenticated session when the admin allowlist is absent", async () => {
    process.env.AUTH_SECRET = "test-only-secret";
    delete process.env.ADMIN_EMAILS;
    vi.mocked(auth).mockResolvedValue({
      user: { email: "admin@example.invalid" },
    } as never);

    await expect(hasAdminPageAccess()).resolves.toBe(false);
  });

  it("allows only an exact allowlisted authenticated email", async () => {
    process.env.AUTH_SECRET = "test-only-secret";
    process.env.ADMIN_EMAILS = "admin@example.invalid";
    vi.mocked(auth).mockResolvedValue({
      user: { email: "admin@example.invalid" },
    } as never);

    await expect(hasAdminPageAccess()).resolves.toBe(true);
  });
});
