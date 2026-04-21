import Link from "next/link";

interface Props {
  planId: string;
  planName: string;
  label: string;
  variant: "amber" | "blue";
}

/**
 * 月額プランのCTA。現時点ではStripe決済は受け付けず、
 * /contact?plan=<id> へ遷移し個別相談を受ける運用（特商法対応）。
 */
export function PricingCheckout({ planId, label, variant }: Props) {
  const btnClass =
    variant === "amber"
      ? "bg-amber-500 hover:bg-amber-600 text-white"
      : "bg-blue-600 hover:bg-blue-700 text-white";

  return (
    <Link
      href={`/contact?plan=${encodeURIComponent(planId)}`}
      className={`block w-full rounded-xl py-2.5 text-center text-sm font-bold transition active:scale-[0.98] ${btnClass}`}
    >
      {label}
    </Link>
  );
}
