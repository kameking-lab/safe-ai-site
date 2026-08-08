export const ORGANIZATION_ROLES = [
  "viewer",
  "editor",
  "reviewer",
  "approver",
  "admin",
] as const;

export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

const ROLE_RANK: Record<OrganizationRole, number> = {
  viewer: 10,
  editor: 20,
  reviewer: 30,
  approver: 40,
  admin: 50,
};

export function isOrganizationRole(value: unknown): value is OrganizationRole {
  return (
    typeof value === "string" &&
    ORGANIZATION_ROLES.includes(value as OrganizationRole)
  );
}

export function roleAllows(
  actual: OrganizationRole,
  required: OrganizationRole,
): boolean {
  return ROLE_RANK[actual] >= ROLE_RANK[required];
}
