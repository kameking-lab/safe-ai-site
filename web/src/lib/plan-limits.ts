/**
 * 旧プラン情報との互換性を保ちつつ、サイト機能に月次上限を設けない。
 * 月次カウントは利用履歴であり、機能の利用可否には使わない。
 */

import { prisma } from "@/lib/prisma";
import { PAID_MODE } from "@/lib/paid-mode";

export type PlanName = "free" | "standard" | "pro";

export type SdsSearchLimit = {
  plan: PlanName;
  monthlyLimit: number | null; // null = unlimited
  used: number;
  remaining: number | null;
};

export function planFromSession(planName: string | null | undefined): PlanName {
  const v = (planName ?? "free").toLowerCase();
  if (v === "pro" || v === "standard" || v === "free") return v;
  return "free";
}

export function sdsMonthlyLimit(plan: PlanName): number | null {
  if (!PAID_MODE) return null;
  if (plan === "pro") return null;
  if (plan === "standard") return 30;
  return 3;
}

function startOfMonth(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export async function getSdsSearchLimit(
  userId: string | null,
  plan: PlanName
): Promise<SdsSearchLimit> {
  const monthlyLimit = sdsMonthlyLimit(plan);
  if (!prisma || !userId) {
    return {
      plan,
      monthlyLimit,
      used: 0,
      remaining: monthlyLimit,
    };
  }
  const used = await prisma.sdsSearch.count({
    where: {
      userId,
      createdAt: { gte: startOfMonth() },
    },
  });
  return {
    plan,
    monthlyLimit,
    used,
    remaining: monthlyLimit === null ? null : Math.max(0, monthlyLimit - used),
  };
}

export function isOverLimit(limit: SdsSearchLimit): boolean {
  if (!PAID_MODE) return false;
  if (limit.monthlyLimit === null) return false;
  return limit.used >= limit.monthlyLimit;
}
