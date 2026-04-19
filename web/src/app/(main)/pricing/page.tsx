import type { Metadata } from "next";
import { Check, Zap, Shield, Star } from "lucide-react";
import { PricingCheckout } from "./pricing-checkout";
import { ogImageUrl } from "@/lib/og-url";

const _title = "料金プラン｜無料で始める安全管理";
const _desc =
  "ANZEN AIの料金プラン。無料プランで基本機能を利用。プレミアムで過去問・AIチャットボット・法令検索が無制限に利用可能。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  openGraph: {
    title: `${_title}｜ANZEN AI`,
    description: _desc,
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: [ogImageUrl(_title, _desc)],
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
      "過去問クイズ（β期間中：制限なし・将来は1セッション5問まで予定）",
      "AIチャットボット（β期間中：制限なし・将来は1日5回まで予定）",
      "KY用紙（基本機能）",
    ],
    limitations: [
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

      {/* 規模別早見表 */}
      <div className="mx-auto mb-8 max-w-3xl rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
        <h2 className="text-sm font-bold text-emerald-900">
          規模別 おすすめプラン早見表
        </h2>
        <p className="mt-1 text-xs leading-5 text-emerald-900/80">
          「うちの規模ならどれを選べばいいか」を3秒で判断できる早見表です。
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[480px] text-xs sm:text-sm">
            <thead className="bg-white/70 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">事業規模</th>
                <th className="px-3 py-2 text-left font-semibold">推奨プラン</th>
                <th className="px-3 py-2 text-right font-semibold">月額</th>
                <th className="px-3 py-2 text-left font-semibold">想定用途</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-100 text-slate-800">
              <tr>
                <td className="px-3 py-2 font-semibold">個人・一人親方</td>
                <td className="px-3 py-2">フリー</td>
                <td className="px-3 py-2 text-right">0円</td>
                <td className="px-3 py-2 text-slate-600">KY用紙・法改正・事故DBを自分の勉強用に</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-semibold">〜10名（町工場・一人社労士）</td>
                <td className="px-3 py-2">フリー → プレミアム1席</td>
                <td className="px-3 py-2 text-right">0〜¥980</td>
                <td className="px-3 py-2 text-slate-600">担当者1名が無制限で使える</td>
              </tr>
              <tr className="bg-emerald-100/60 font-semibold">
                <td className="px-3 py-2">11〜30名（中小建設・介護）</td>
                <td className="px-3 py-2">プロ（5席）</td>
                <td className="px-3 py-2 text-right">¥1,980</td>
                <td className="px-3 py-2 text-slate-700">職長・安全担当複数名で共有、管理ダッシュボード付</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-semibold">31〜100名（地方ゼネコン・製造）</td>
                <td className="px-3 py-2">プロ × 複数契約 or エンタープライズ相談</td>
                <td className="px-3 py-2 text-right">¥1,980〜</td>
                <td className="px-3 py-2 text-slate-600">部署ごとに契約 or 個別相談</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-semibold">100名超</td>
                <td className="px-3 py-2">エンタープライズ（個別見積）</td>
                <td className="px-3 py-2 text-right">要相談</td>
                <td className="px-3 py-2 text-slate-600">SSO・請求書払い・カスタム教材</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] leading-5 text-emerald-900/70">
          ※ KY用紙・チャット回数に業種・人数別の制限は設けていません。β期間中は制限なし。
          助成金活用は <a href="/subsidies" className="underline hover:text-emerald-700">/subsidies</a> を参照。
        </p>
      </div>

      {/* β期間中のお知らせ */}
      <div className="mx-auto mb-8 max-w-2xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
        <p className="font-semibold">β期間中のお知らせ</p>
        <p className="mt-1">
          現在はβ運用期間のため、フリープランでも過去問クイズ・AIチャットボット・化学物質リスクアセスメントを含む全機能を制限なしでお試しいただけます。
          正式リリース以降は上記の利用制限を順次適用予定です。
        </p>
        <div className="mt-3 rounded-lg border border-amber-300/70 bg-white/60 p-3">
          <p className="font-semibold text-amber-900">β協力者特典（予定）</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-amber-900/90">
            <li>正式リリース後3ヶ月：プロプラン 50% オフ</li>
            <li>β協力者バッジをアカウントに付与</li>
            <li>フィードバック採用時はリリースノートに匿名掲載</li>
          </ul>
          <p className="mt-2 text-[11px] text-amber-900/70">
            ※ 特典適用にはβ期間中に
            <a href="/contact" className="underline hover:text-amber-950">お問い合わせフォーム</a>
            から「β協力希望」とご連絡ください。
          </p>
        </div>
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
                <Icon className={`h-5 w-5 ${plan.iconColor}`} aria-hidden="true" />
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

      {/* Cost breakdown (transparency) */}
      <div className="mt-8 rounded-2xl border border-slate-100 bg-slate-50 p-6">
        <h2 className="mb-1 text-sm font-bold text-slate-700">運営コスト試算（月額）</h2>
        <p className="mb-4 text-xs text-slate-500">
          価格設定の根拠として、主要サービスの月額コストを公開します。
          ユーザー数 100人・月間チャット 3,000回・クイズ 10,000問を想定した試算です。
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-slate-700">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="pb-2 text-left font-semibold">サービス</th>
                <th className="pb-2 text-left font-semibold">用途</th>
                <th className="pb-2 text-right font-semibold">月額概算</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                { service: "Google Gemini 2.5 Flash", use: "AIチャット・解説・要約（3,000回）", cost: "~¥1,500" },
                { service: "Vercel Pro", use: "ホスティング・Edge Functions", cost: "~¥3,000" },
                { service: "Resend", use: "メール通知（月5,000通まで無料）", cost: "~¥0" },
                { service: "Stripe", use: "決済手数料（売上の3.6%）", cost: "売上依存" },
                { service: "NextAuth / DB (将来)", use: "ユーザー管理・セッション", cost: "~¥0〜1,000" },
                { service: "合計（固定費）", use: "", cost: "~¥4,500〜5,000/月" },
              ].map((row) => (
                <tr key={row.service} className={row.service.startsWith("合計") ? "font-bold text-slate-900" : ""}>
                  <td className="py-2 pr-4">{row.service}</td>
                  <td className="py-2 pr-4 text-slate-500">{row.use}</td>
                  <td className="py-2 text-right">{row.cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-400 leading-5">
          固定費 ~¥5,000/月 をカバーするには プレミアム会員 6人以上、または Pro会員 3人以上で収支均衡。
          ¥980〜¥1,980の価格帯は「現場の安全投資として気軽に払える水準」を意識して設定しています。
        </p>
      </div>

      <p className="mt-4 text-center text-xs text-slate-400">
        ※ 価格は税込表示です。消費税10%が含まれます。
      </p>
    </main>
  );
}
