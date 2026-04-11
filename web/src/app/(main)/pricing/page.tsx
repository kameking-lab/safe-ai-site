import type { Metadata } from "next";
import { Check, Zap, Shield, Star } from "lucide-react";
import { PricingCheckout } from "./pricing-checkout";

export const metadata: Metadata = {
  title: "料金プラン｜ANZEN AI",
  description: "ANZEN AIのフリーミアムプラン。無料で基本機能を利用。プレミアムプランで過去問・AIチャット・法令検索が無制限に。",
  openGraph: {
    title: "料金プラン｜ANZEN AI",
    description: "ANZEN AIのフリーミアムプラン。無料で基本機能を利用。プレミアムプランで過去問・AIチャット・法令検索が無制限に。",
  },
};

const PLANS = [
  {
    id: "free",
    name: "フリープラン",
    price: 0,
    period: null,
    icon: Shield,
    iconColor: "text-slate-500",
    borderColor: "border-slate-200",
    badgeColor: "bg-slate-100 text-slate-700",
    ctaLabel: "現在のプラン",
    ctaDisabled: true,
    priceId: null,
    features: [
      "サイネージ・気象マップ（無制限）",
      "クマ出没マップ（無制限）",
      "法改正ニュース閲覧",
      "過去問クイズ 1セッション5問まで",
      "AIチャットボット 1日5回まで",
      "KY用紙（基本機能）",
    ],
    limitations: [
      "過去問クイズ 6問目以降",
      "AIチャット 6回目以降",
      "チャット履歴の保存",
      "KY用紙のPDF出力（高度機能）",
    ],
  },
  {
    id: "premium",
    name: "プレミアムプラン",
    price: 980,
    period: "月",
    icon: Zap,
    iconColor: "text-amber-600",
    borderColor: "border-amber-400",
    badgeColor: "bg-amber-500 text-white",
    ctaLabel: "プレミアムに申し込む",
    ctaDisabled: false,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM ?? "",
    features: [
      "フリープランの全機能",
      "過去問クイズ 無制限",
      "AIチャットボット 無制限",
      "法令条文AI要約 無制限",
      "チャット履歴の保存・エクスポート",
      "KY用紙のPDF出力",
      "優先サポート",
    ],
    limitations: [],
  },
  {
    id: "pro",
    name: "プロプラン",
    price: 1980,
    period: "月",
    icon: Star,
    iconColor: "text-blue-600",
    borderColor: "border-blue-400",
    badgeColor: "bg-blue-600 text-white",
    ctaLabel: "プロに申し込む",
    ctaDisabled: false,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO ?? "",
    features: [
      "プレミアムプランの全機能",
      "複数ユーザー（5アカウントまで）",
      "気象警報メール通知",
      "化学物質リスクアセスメント",
      "管理ダッシュボード（組織全体の利用状況）",
      "請求書払い対応",
      "電話・メールサポート",
    ],
    limitations: [],
  },
];

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          料金プラン
        </h1>
        <p className="mt-3 text-slate-600 text-sm leading-7 max-w-xl mx-auto">
          まずは無料でお試しください。業務が広がったらプレミアムへ。
          <br />
          月額サブスクリプション・クレジットカード払い。いつでもキャンセル可能。
        </p>
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const isPopular = plan.id === "premium";

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border-2 bg-white p-6 shadow-sm ${plan.borderColor} ${
                isPopular ? "ring-2 ring-amber-400 ring-offset-2" : ""
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-amber-500 px-4 py-1 text-xs font-bold text-white shadow">
                    おすすめ
                  </span>
                </div>
              )}

              <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl ${
                plan.id === "free" ? "bg-slate-100" : plan.id === "premium" ? "bg-amber-50" : "bg-blue-50"
              }`}>
                <Icon className={`h-5 w-5 ${plan.iconColor}`} />
              </div>

              <p className="text-sm font-semibold text-slate-600">{plan.name}</p>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-slate-900">
                  {plan.price === 0 ? "無料" : `¥${plan.price.toLocaleString()}`}
                </span>
                {plan.period && (
                  <span className="text-sm text-slate-500">/{plan.period}</span>
                )}
              </div>

              <div className="my-5 border-t border-slate-100" />

              {/* Features */}
              <ul className="flex-1 space-y-2.5 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-slate-700">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    {f}
                  </li>
                ))}
                {plan.limitations.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-slate-400 line-through">
                    <span className="mt-0.5 h-4 w-4 shrink-0 text-center text-xs">✕</span>
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                {plan.ctaDisabled ? (
                  <div className="w-full rounded-xl border border-slate-200 py-2.5 text-center text-sm font-semibold text-slate-400">
                    {plan.ctaLabel}
                  </div>
                ) : (
                  <PricingCheckout
                    planName={plan.name}
                    priceId={plan.priceId ?? ""}
                    label={plan.ctaLabel}
                    variant={plan.id === "pro" ? "blue" : "amber"}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* FAQ / notes */}
      <div className="mt-12 rounded-2xl border border-slate-100 bg-slate-50 p-6">
        <h2 className="mb-4 text-sm font-bold text-slate-700">よくある質問</h2>
        <dl className="space-y-4 text-sm">
          {[
            {
              q: "いつでもキャンセルできますか？",
              a: "はい。マイページからいつでもキャンセル可能です。キャンセル後も当月末まではご利用いただけます。",
            },
            {
              q: "支払い方法は？",
              a: "クレジットカード（Visa / Mastercard / American Express / JCB）に対応。プロプランは請求書払いも可能です。",
            },
            {
              q: "無料プランから変更した場合、データは引き継がれますか？",
              a: "はい。KY用紙・解答履歴・チャット履歴はアカウントに紐付いて保持されます。",
            },
            {
              q: "領収書は発行されますか？",
              a: "Stripeから自動でメール領収書が送付されます。マイページからの再発行も可能です。",
            },
          ].map(({ q, a }) => (
            <div key={q}>
              <dt className="font-semibold text-slate-700">{q}</dt>
              <dd className="mt-1 text-slate-500 leading-6">{a}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Cost transparency */}
      <p className="mt-6 text-center text-xs text-slate-400">
        ※ 価格は税込表示です。消費税10%が含まれます。
      </p>
    </main>
  );
}
