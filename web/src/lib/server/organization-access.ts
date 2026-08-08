import "server-only";

import { auth, isAuthConfigured } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  isOrganizationRole,
  roleAllows,
  type OrganizationRole,
} from "@/lib/organization-roles";

export {
  ORGANIZATION_ROLES,
  isOrganizationRole,
  roleAllows,
  type OrganizationRole,
} from "@/lib/organization-roles";

type OrganizationAccessDatabase = {
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
};

type MembershipRow = {
  organizationId: string;
  organizationName: string;
  role: string;
};

export type OrganizationAccess =
  | {
      ok: true;
      userId: string;
      organizationId: string;
      organizationName: string;
      role: OrganizationRole;
    }
  | {
      ok: false;
      reason:
        | "authentication_not_configured"
        | "authentication_required"
        | "database_unavailable"
        | "membership_required"
        | "insufficient_role";
    };

export async function requireOrganizationAccess(
  organizationId: string,
  requiredRole: OrganizationRole = "viewer",
  options: {
    database?: OrganizationAccessDatabase | null;
    authConfigured?: boolean;
    sessionUserId?: string | null;
  } = {},
): Promise<OrganizationAccess> {
  const authConfigured = options.authConfigured ?? isAuthConfigured;
  if (!authConfigured) return { ok: false, reason: "authentication_not_configured" };

  let userId = options.sessionUserId;
  if (userId === undefined) {
    try {
      const session = await auth();
      const candidate = (session?.user as { id?: unknown } | undefined)?.id;
      userId = typeof candidate === "string" ? candidate.trim() : null;
    } catch {
      userId = null;
    }
  }
  if (!userId) return { ok: false, reason: "authentication_required" };

  const database =
    options.database === undefined
      ? (prisma as unknown as OrganizationAccessDatabase | null)
      : options.database;
  if (!database || typeof database.$queryRawUnsafe !== "function") {
    return { ok: false, reason: "database_unavailable" };
  }

  let rows: MembershipRow[];
  try {
    rows = await database.$queryRawUnsafe<MembershipRow[]>(
      `
        SELECT
          membership."organizationId",
          organization."name" AS "organizationName",
          membership."role"
        FROM "SafetyMembership" AS membership
        INNER JOIN "SafetyOrganization" AS organization
          ON organization."id" = membership."organizationId"
        WHERE membership."organizationId" = $1
          AND membership."userId" = $2
          AND membership."status" = 'active'
          AND organization."status" = 'active'
        LIMIT 1
      `,
      organizationId,
      userId,
    );
  } catch {
    return { ok: false, reason: "database_unavailable" };
  }

  const membership = rows[0];
  if (!membership || !isOrganizationRole(membership.role)) {
    return { ok: false, reason: "membership_required" };
  }
  if (!roleAllows(membership.role, requiredRole)) {
    return { ok: false, reason: "insufficient_role" };
  }
  return {
    ok: true,
    userId,
    organizationId: membership.organizationId,
    organizationName: membership.organizationName,
    role: membership.role,
  };
}

/**
 * Resolve a single active organization only from the authenticated user's
 * server-side membership. Client supplied organization identifiers are never
 * consulted. Multiple active memberships fail closed until the account has an
 * explicit server-side active-organization selection.
 */
export async function requireCurrentOrganizationAccess(
  requiredRole: OrganizationRole = "viewer",
  options: {
    database?: OrganizationAccessDatabase | null;
    authConfigured?: boolean;
    sessionUserId?: string | null;
  } = {},
): Promise<OrganizationAccess> {
  const authConfigured = options.authConfigured ?? isAuthConfigured;
  if (!authConfigured) return { ok: false, reason: "authentication_not_configured" };

  let userId = options.sessionUserId;
  if (userId === undefined) {
    try {
      const session = await auth();
      const candidate = (session?.user as { id?: unknown } | undefined)?.id;
      userId = typeof candidate === "string" ? candidate.trim() : null;
    } catch {
      userId = null;
    }
  }
  if (!userId) return { ok: false, reason: "authentication_required" };

  const database =
    options.database === undefined
      ? (prisma as unknown as OrganizationAccessDatabase | null)
      : options.database;
  if (!database || typeof database.$queryRawUnsafe !== "function") {
    return { ok: false, reason: "database_unavailable" };
  }

  let rows: MembershipRow[];
  try {
    rows = await database.$queryRawUnsafe<MembershipRow[]>(
      `
        SELECT
          membership."organizationId",
          organization."name" AS "organizationName",
          membership."role"
        FROM "SafetyMembership" AS membership
        INNER JOIN "SafetyOrganization" AS organization
          ON organization."id" = membership."organizationId"
        WHERE membership."userId" = $1
          AND membership."status" = 'active'
          AND organization."status" = 'active'
        ORDER BY membership."organizationId" ASC
        LIMIT 2
      `,
      userId,
    );
  } catch {
    return { ok: false, reason: "database_unavailable" };
  }

  if (rows.length !== 1) return { ok: false, reason: "membership_required" };
  const membership = rows[0];
  if (!isOrganizationRole(membership.role)) {
    return { ok: false, reason: "membership_required" };
  }
  if (!roleAllows(membership.role, requiredRole)) {
    return { ok: false, reason: "insufficient_role" };
  }
  return {
    ok: true,
    userId,
    organizationId: membership.organizationId,
    organizationName: membership.organizationName,
    role: membership.role,
  };
}

export async function requireSiteInOrganization(
  organizationId: string,
  siteId: string,
  options: { database?: OrganizationAccessDatabase | null } = {},
): Promise<boolean> {
  const database =
    options.database === undefined
      ? (prisma as unknown as OrganizationAccessDatabase | null)
      : options.database;
  if (!database || typeof database.$queryRawUnsafe !== "function") return false;
  try {
    const rows = await database.$queryRawUnsafe<Array<{ id: string }>>(
      `
        SELECT "id"
        FROM "SafetySite"
        WHERE "id" = $1
          AND "organizationId" = $2
          AND "status" = 'active'
        LIMIT 1
      `,
      siteId,
      organizationId,
    );
    return rows.length === 1;
  } catch {
    return false;
  }
}

export function organizationAccessStatus(access: OrganizationAccess): number {
  if (access.ok) return 200;
  if (
    access.reason === "authentication_not_configured" ||
    access.reason === "database_unavailable"
  ) {
    return 503;
  }
  if (access.reason === "authentication_required") return 401;
  return 403;
}
