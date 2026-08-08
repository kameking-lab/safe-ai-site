import { describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
  isAuthConfigured: false,
}));
vi.mock("@/lib/prisma", () => ({ prisma: null }));

import {
  organizationAccessStatus,
  requireCurrentOrganizationAccess,
  requireOrganizationAccess,
  requireSiteInOrganization,
  roleAllows,
} from "./organization-access";

describe("organization access", () => {
  it("fails closed when authentication or database is unavailable", async () => {
    await expect(
      requireOrganizationAccess("org-1", "viewer", {
        authConfigured: false,
        sessionUserId: null,
        database: null,
      }),
    ).resolves.toEqual({
      ok: false,
      reason: "authentication_not_configured",
    });

    const unavailable = await requireOrganizationAccess("org-1", "viewer", {
      authConfigured: true,
      sessionUserId: "user-1",
      database: null,
    });
    expect(unavailable).toEqual({ ok: false, reason: "database_unavailable" });
    expect(organizationAccessStatus(unavailable)).toBe(503);
  });

  it("uses only the server-side membership role", async () => {
    const database = {
      $queryRawUnsafe: vi.fn().mockResolvedValue([
        {
          organizationId: "org-1",
          organizationName: "安全第一工業",
          role: "editor",
        },
      ]),
    };
    const access = await requireOrganizationAccess("org-1", "reviewer", {
      authConfigured: true,
      sessionUserId: "user-1",
      database,
    });
    expect(access).toEqual({ ok: false, reason: "insufficient_role" });
    expect(database.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('"SafetyMembership"'),
      "org-1",
      "user-1",
    );
  });

  it("derives one organization from the authenticated membership only", async () => {
    const database = {
      $queryRawUnsafe: vi.fn().mockResolvedValue([
        {
          organizationId: "org-1",
          organizationName: "Safety Works",
          role: "viewer",
        },
      ]),
    };
    await expect(
      requireCurrentOrganizationAccess("viewer", {
        authConfigured: true,
        sessionUserId: "user-1",
        database,
      }),
    ).resolves.toMatchObject({ ok: true, organizationId: "org-1" });
    expect(database.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('WHERE membership."userId" = $1'),
      "user-1",
    );
  });

  it("fails closed when more than one active membership is available", async () => {
    const database = {
      $queryRawUnsafe: vi.fn().mockResolvedValue([
        { organizationId: "org-1", organizationName: "One", role: "viewer" },
        { organizationId: "org-2", organizationName: "Two", role: "admin" },
      ]),
    };
    await expect(
      requireCurrentOrganizationAccess("viewer", {
        authConfigured: true,
        sessionUserId: "user-1",
        database,
      }),
    ).resolves.toEqual({ ok: false, reason: "membership_required" });
  });

  it("enforces the role hierarchy", () => {
    expect(roleAllows("viewer", "editor")).toBe(false);
    expect(roleAllows("reviewer", "reviewer")).toBe(true);
    expect(roleAllows("admin", "approver")).toBe(true);
  });

  it("checks that a site belongs to the authorized organization", async () => {
    const database = {
      $queryRawUnsafe: vi
        .fn()
        .mockResolvedValueOnce([{ id: "site-1" }])
        .mockResolvedValueOnce([]),
    };
    await expect(
      requireSiteInOrganization("org-1", "site-1", { database }),
    ).resolves.toBe(true);
    await expect(
      requireSiteInOrganization("org-2", "site-1", { database }),
    ).resolves.toBe(false);
  });
});
