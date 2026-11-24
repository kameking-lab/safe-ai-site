import "server-only";

import { notFound } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";

export function isAdminEmail(email: string | null | undefined, allowlist = process.env.ADMIN_EMAILS): boolean {
  if (!email || !allowlist?.trim()) return false;
  const normalized = email.trim().toLocaleLowerCase("en-US");
  return allowlist
    .split(",")
    .map((item) => item.trim().toLocaleLowerCase("en-US"))
    .filter(Boolean)
    .includes(normalized);
}

export const hasAdminPageAccess = cache(async (): Promise<boolean> => {
  if (!process.env.AUTH_SECRET?.trim()) return false;
  const session = await auth({ identityOnly: true });
  return isAdminEmail(session?.user?.email);
});

export async function requireAdminPageAccess(): Promise<void> {
  if (!(await hasAdminPageAccess())) notFound();
}

export async function getAdminAccess(): Promise<
  | { ok: true; userId: string }
  | { ok: false }
> {
  if (!process.env.AUTH_SECRET?.trim()) return { ok: false };
  try {
    const session = await auth({ identityOnly: true });
    if (!isAdminEmail(session?.user?.email)) return { ok: false };
    const userId = (session?.user as { id?: unknown } | undefined)?.id;
    return typeof userId === "string" && userId.trim()
      ? { ok: true, userId: userId.trim() }
      : { ok: false };
  } catch {
    return { ok: false };
  }
}
