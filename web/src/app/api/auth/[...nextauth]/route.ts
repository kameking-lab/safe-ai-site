import { handlers } from "@/auth";
import { sharedRateLimitGuard } from "@/lib/security/shared-state";
import type { NextRequest } from "next/server";

export const GET = handlers.GET;

export async function POST(request: NextRequest) {
  const limited = await sharedRateLimitGuard(request, {
    routeKey: "auth",
    limit: 20,
    windowMs: 10 * 60 * 1_000,
  });
  if (limited) return limited;
  return handlers.POST(request);
}
