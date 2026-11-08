import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getEntitlement } from "@/lib/mobile/billing-service";
import { safeReturnPath, webProSalesReady } from "@/lib/pro-sales";
import { AutoCheckout } from "./auto-checkout";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "決済へ移動", robots: { index: false, follow: false } };

/**
 * 「月額980円で続ける」の行き先。読ませる画面は持たない。
 * 未ログイン → ログイン（Google/Apple）→ ここへ戻る → Stripe Checkout へ直行。
 * すでに Pro → 元の画面へ。権利確認中・別経路で手続き中 → 料金ページ（理由を出す）。
 */
export default async function StartProCheckoutPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  if (!webProSalesReady()) redirect("/pricing");
  const back = safeReturnPath((await searchParams).returnTo);
  const self = back ? `/pricing/start?returnTo=${encodeURIComponent(back)}` : "/pricing/start";
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect(`/auth/signin?callbackUrl=${encodeURIComponent(self)}`);
  let plan: "free" | "pro" = "free";
  try {
    plan = (await getEntitlement(userId)).plan;
  } catch {
    // 権利を確認できなくても、決済側（reservePurchase）が二重購入を止める。ここでは止めない。
  }
  if (plan === "pro") redirect(back ?? "/account");
  return <AutoCheckout returnTo={back} />;
}
