import "server-only";

export function isAdminEmail(email: string | null | undefined, allowlist = process.env.ADMIN_EMAILS): boolean {
  if (!email || !allowlist?.trim()) return false;
  const normalized = email.trim().toLocaleLowerCase("en-US");
  return allowlist
    .split(",")
    .map((item) => item.trim().toLocaleLowerCase("en-US"))
    .filter(Boolean)
    .includes(normalized);
}
