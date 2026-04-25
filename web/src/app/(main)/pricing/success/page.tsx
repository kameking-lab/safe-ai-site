import type { Metadata } from "next";
import Link from "next/link";
import Stripe from "stripe";
import { CheckCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "決済完了",
  description: "プランへのお申し込みありがとうございました。",
  robots: { index: false, follow: false },
  openGraph: {
    title: "決済完了｜ANZEN AI",
    description: "プランへのお申し込みありがとうございました。",
  },
};

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ session_id?: string }>;
}

function priceIdToPlanName(priceId: string | null | undefined): string {
  if (!priceId) return "プラン";
  if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO) return "プロ";
  if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM) return "スタンダード";
  return "プラン";
}

async function fetchPlan(sessionId: string | undefined): Promise<string | null> {
  if (!sessionId) return null;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  try {
    const stripe = new Stripe(key);
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items"],
    });
    const priceId = session.line_items?.data?.[0]?.price?.id ?? null;
    return priceIdToPlanName(priceId);
  } catch (err) {
    console.error("[pricing/success] failed to retrieve session", err);
    return null;
  }
}

export default async function PricingSuccessPage({ searchParams }: Props) {
  const { session_id } = await searchParams;
  const plan = await fetchPlan(session_id);

  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
        <CheckCircle className="h-9 w-9 text-emerald-500" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 mb-3">決済が完了しました</h1>
      <p className="text-slate-600 text-sm leading-7 mb-8">
        {plan ? (
          <>
            <strong>{plan}プラン</strong> へのお申し込みありがとうございます。
            <br />
            すべての機能をご利用いただけます。
          </>
        ) : (
          <>
            ご登録ありがとうございます。
            <br />
            領収書はご登録メールアドレスに届きます。
          </>
        )}
        <br />
        プランの変更・解約はマイページから行えます。
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/account"
          className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
        >
          マイページへ
        </Link>
        <Link
          href="/chatbot"
          className="rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-white hover:bg-amber-600"
        >
          AIチャットを使う
        </Link>
        <Link
          href="/"
          className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          トップへ戻る
        </Link>
      </div>
    </main>
  );
}
