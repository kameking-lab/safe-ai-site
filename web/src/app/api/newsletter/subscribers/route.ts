import { NextResponse } from "next/server";
import { listSubscribers, memSendHistory } from "@/lib/newsletter";

// Simple token gate: set NEWSLETTER_ADMIN_TOKEN in env
function isAuthorized(req: Request): boolean {
  const adminToken = process.env.NEWSLETTER_ADMIN_TOKEN;
  if (!adminToken) return true; // open in dev if not configured
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${adminToken}`;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
