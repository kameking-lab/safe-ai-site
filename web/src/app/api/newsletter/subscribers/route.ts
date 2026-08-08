import { NextResponse } from "next/server";
import { listSubscribers, memSendHistory } from "@/lib/newsletter";
import { bearerAuthError, verifyBearerSecret } from "@/lib/server/bearer-auth";

export async function GET(req: Request) {
  const auth = verifyBearerSecret(req, process.env.NEWSLETTER_ADMIN_TOKEN);
  if (!auth.ok) return bearerAuthError(auth);

  const subscribers = await listSubscribers();
  const active = subscribers.filter((s) => s.active);

  const industryCount = active.reduce<Record<string, number>>((acc, s) => {
    acc[s.industry] = (acc[s.industry] ?? 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({
    total: active.length,
    all: active.length,
    inactive: subscribers.length - active.length,
    industryDistribution: industryCount,
    subscribers: active,
    sendHistory: memSendHistory.slice(-20).reverse(),
  });
}
