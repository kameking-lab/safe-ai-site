import type { Metadata } from "next";
import Link from "next/link";
import { Check, Zap, Shield, Star, Briefcase, Building2 } from "lucide-react";
import { PricingCheckout } from "./pricing-checkout";
import { ogImageUrl } from "@/lib/og-url";

const _title = "料金プラン｜無料・月額・受託までの5プラン";
const _desc =
  "ANZEN AI の料金プラン。無料¥0／スタンダード¥980／プロ¥2,980／ビジネス¥29,800／受託（個別見積）の5層。個人から500名規模まで、段階的に導入できます。";

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
    name: "フリー",
    price: 0,
    period: "月",
    icon: Shield,
    iconColor: "text-slate-600",
    borderColor: "border-slate-300",
    ctaLabel: "ログインして使う",
    ctaDisabled: false,
    target: "まずは試したい個人・一人親方",
    features: [
      "事故データベース検索（全件）",
      "法改正一覧・AI要約（月30回まで）",
      "KY用紙シンプルモード",
      "特別教育 過去問クイズ（一部）",
      "気象リスク（1地域）",
    ],
    limitations: [
      "AIチャット（無制限）",
      "KY用紙PDF出力",
      "サイネージ表示",
    ],
  },
  {
    id: "standard",
    name: "スタンダード",
    price: 980,
    period: "月（税込）",
    icon: Zap,
    iconColor: "text-emerald-600",
    borderColor: "border-emerald-400",
    ctaLabel: "スタンダードを試す",
    ctaDisabled: false,
    target: "現場責任者・安全担当1名",
    features: [
      "フリーの全機能",
      "AIチャット・リスク予測（無制限）",
      "法改正AI要約（無制限）",
      "KY用紙 詳細モード・PDF出力",
      "特別教育 過去問クイズ（全種）",
      "気象リスク警報メール通知",
      "メールサポート",
    ],
    limitations: [
      "サイネージ多拠点表示",
      "LMS（進捗管理）",
    ],
  },
  {
    id: "pro",
    name: "プロ",
    price: 2980,
    period: "月（税込）",
    icon: Star,
    iconColor: "text-amber-600",
    borderColor: "border-amber-400",
    ctaLabel: "プロを試す",
    ctaDisabled: false,
    target: "事業所・10名以上のチーム",
    popular: true,
    features: [
      "スタンダードの全機能",
      "利用アカウント：最大10名",
      "サイネージ多拠点表示（3拠点）",
      "LMS（学習進捗・修了証）",
      "化学物質リスクアセスメント",
      "KY用紙テンプレート共有",
      "電話・メールサポート",
      "請求書払い対応",
    ],
    limitations: [],
  },
  {
    id: "business",
    name: "ビジネス",
    price: 29800,
    period: "月（税込）",
    icon: Building2,
    iconColor: "text-violet-600",
    borderColor: "border-violet-400",
    ctaLabel: "ビジネスを相談する",
    ctaDisabled: false,
    target: "中規模法人（50〜500名）",
    features: [
      "プロの全機能",
      "利用アカウント：最大100名",
      "多拠点サイネージ表示（無制限）",
      "LMS βアクセス（先行招待）",
      "法令通知の業種別カスタムルール",
      "請求書払い・年契払い割引（−10%）",
      "初期サポート（ハンズオン1回／導入時）",
      "SSO（Google Workspace）対応",
    ],
    limitations: [
      "SAML/OIDC SSO（受託扱いで別途）",
      "オンプレ／専用環境（受託扱いで別途）",
    ],
  },
  {
    id: "custom",
    name: "受託（カスタム）",
    price: null,
    period: null,
    icon: Briefcase,
    iconColor: "text-blue-600",
    borderColor: "border-blue-400",
    ctaLabel: "業務のご相談",
    ctaDisabled: false,
    target: "システム開発・研修・顧問契約",
    features: [
      "KY・安全書類のデジタル化",
      "Excel VBA・ルーティン業務の自動化",
      "特別教育・安全衛生教育の講師派遣",
      "労働安全コンサル・月額顧問",
      "Claude Code による受託開発",
      "要件ヒアリング → 個別見積",
      "無料相談30分（オンライン）",
    ],
    limitations: [],
  },
] as const;

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          料金プラン
        </h1>
        <p className="mt-3 text-slate-600 text-sm leading-7 max-w-2xl mx-auto">
          <strong>無料¥0</strong> から始めて、必要に応じて
          <strong> ¥980／¥2,980 </strong>
          の月額プラン、または <strong>ビジネス¥29,800（〜100名）</strong>・受託（個別見積）にステップアップできます。
          <br />
          最低契約期間なし・いつでもキャンセル可能。
        </p>
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const isPopular = "popular" in plan && plan.popular;
          const isFree = plan.id === "free";
          const isCustom = plan.id === "custom";
          const isBusiness = plan.id === "business";

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border-2 bg-white p-5 shadow-sm ${plan.borderColor} ${
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

              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50">
                <Icon className={`h-5 w-5 ${plan.iconColor}`} aria-hidden="true" />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-bold text-slate-800">{plan.name}</p>
              </div>

              <div className="mt-2 flex items-baseline gap-1">
                {plan.price === null ? (
                  <span className="text-2xl font-bold text-slate-900">個別見積</span>
                ) : (
                  <>
                    <span className="text-3xl font-bold text-slate-900">
                      {plan.price === 0 ? "¥0" : `¥${plan.price.toLocaleString()}`}
                    </span>
                    {plan.period && (
                      <span className="text-sm text-slate-500">/{plan.period}</span>
                    )}
                  </>
                )}
              </div>

              <p className="mt-2 text-xs leading-5 text-slate-500">想定: {plan.target}</p>

              <div className="my-4 border-t border-slate-100" />

              {/* Features */}
              <ul className="flex-1 space-y-2 text-xs">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-slate-700">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    {f}
                  </li>
                ))}
                {plan.limitations.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-slate-400 line-through">
                    <span className="mt-0.5 h-3.5 w-3.5 shrink-0 text-center text-xs">✕</span>
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-5">
                {isFree ? (
                  <Link
                    href="/api/auth/signin?callbackUrl=%2F"
                    className="block w-full rounded-xl bg-slate-800 py-2.5 text-center text-sm font-bold text-white transition hover:bg-slate-700 active:scale-[0.98]"
                  >
                    {plan.ctaLabel}
                  </Link>
                ) : isCustom ? (
                  <Link
                    href="/contact?category=enterprise"
                    className="block w-full rounded-xl bg-blue-600 py-2.5 text-center text-sm font-bold text-white transition hover:bg-blue-700 active:scale-[0.98]"
                  >
                    {plan.ctaLabel}
                  </Link>
                ) : isBusiness ? (
                  <Link
                    href="/contact?category=business-plan"
                    className="block w-full rounded-xl bg-violet-600 py-2.5 text-center text-sm font-bold text-white transition hover:bg-violet-700 active:scale-[0.98]"
                  >
                    {plan.ctaLabel}
                  </Link>
                ) : (
                  <PricingCheckout
                    planId={plan.id}
                    planName={plan.name}
                    label={plan.ctaLabel}
                    variant={plan.id === "pro" ? "amber" : "emerald"}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 無料相談バナー */}
      <div className="mt-10 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 text-center">
        <p className="text-sm font-bold text-emerald-800">迷ったらまず無料相談30分</p>
        <p className="mt-2 text-xs leading-5 text-slate-600">
          現在の課題・目指すゴールを伺い、最適なプラン（またはスポット受託）をご提案します。
          オンライン／対面どちらも対応。強引な営業は一切ありません。
        </p>
        <Link
          href="/contact"
          className="mt-4 inline-block rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition-colors"
        >
          無料相談を申し込む
        </Link>
      </div>

      {/* FAQ */}
      <div className="mt-10 rounded-2xl border border-slate-100 bg-slate-50 p-6">
        <h2 className="mb-4 text-sm font-bold text-slate-700">よくある質問</h2>
        <dl className="space-y-4 text-sm">
          {[
            {
              q: "いつでもキャンセルできますか？",
              a: "はい。マイページの「プラン管理」（Stripe Customer Portal）からいつでも解約可能です。解約後も当該請求期間の末日まではご利用いただけます。日割り返金はありません。",
            },
            {
              q: "無料プランのまま使い続けられますか？",
              a: "はい。広告表示もなく、期限なしでお使いいただけます。必要に応じて月額プランへアップグレードしてください。",
            },
            {
              q: "支払い方法は？",
              a: "クレジットカード（Visa / Mastercard / American Express / JCB）に対応。決済処理はStripeに委託しています。プロプランは請求書払いもご相談ください。",
            },
            {
              q: "受託（カスタム）はどんな内容まで依頼できますか？",
              a: "KYシートのデジタル化、Excel VBA 自動化、Web・LP 制作、AI 研修、労働安全コンサル顧問契約など。要件ヒアリング後に個別見積を提示します。",
            },
            {
              q: "法人契約・請求書払いは可能ですか？",
              a: "プロ／ビジネス／受託は請求書払い対応可能。ビジネスは年契で10%割引。お問い合わせフォームからご連絡ください。",
            },
            {
              q: "教育機関（高専・専門学校・大学）向けの割引はありますか？",
              a: "高専・専門学校・大学・労安コンサル協会等の非営利教育用途は、申請内容を個別審査のうえ「教育機関ライセンス」を優待価格で提供する場合があります（無償提供は授業実施・研究等の条件を満たす場合に限定）。学籍簿・在職証明等の確認後、3営業日以内にご返信。問い合わせは category=education でお送りください。",
            },
            {
              q: "授業や講演で本サイトの図表・統計データを引用してもよいですか？",
              a: "教育・研究・非営利目的の引用は CC BY-NC 4.0（出典明記・非営利）で許諾します。スライド・教科書・論文に「出典：ANZEN AI（safe-ai-site.vercel.app）／取得日」を明記してください。商用利用・転載は別途ご相談ください。",
            },
          ].map(({ q, a }) => (
            <div key={q}>
              <dt className="font-semibold text-slate-700">{q}</dt>
              <dd className="mt-1 text-slate-500 leading-6">{a}</dd>
            </div>
          ))}
        </dl>
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">
        ※ 月額プランは税込表示です。受託業務は税抜見積となります（別途消費税10%）。
      </p>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: "いつでもキャンセルできますか？",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "はい。マイページの「プラン管理」（Stripe Customer Portal）からいつでも解約可能です。解約後も当該請求期間の末日まではご利用いただけます。日割り返金はありません。",
                },
              },
              {
                "@type": "Question",
                name: "無料プランのまま使い続けられますか？",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "はい。広告表示もなく、期限なしでお使いいただけます。必要に応じて月額プランへアップグレードしてください。",
                },
              },
              {
                "@type": "Question",
                name: "支払い方法は？",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "クレジットカード（Visa / Mastercard / American Express / JCB）に対応。決済処理はStripeに委託しています。プロプランは請求書払いもご相談ください。",
                },
              },
              {
                "@type": "Question",
                name: "受託（カスタム）はどんな内容まで依頼できますか？",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "KYシートのデジタル化、Excel VBA 自動化、Web・LP 制作、AI 研修、労働安全コンサル顧問契約など。要件ヒアリング後に個別見積を提示します。",
                },
              },
              {
                "@type": "Question",
                name: "法人契約・請求書払いは可能ですか？",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "プロ／ビジネス／受託は請求書払い対応可能。ビジネスは年契で10%割引。お問い合わせフォームからご連絡ください。",
                },
              },
              {
                "@type": "Question",
                name: "教育機関（高専・専門学校・大学）向けの割引はありますか？",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "あります。高専・専門学校・大学・労安コンサル協会等の教育用途は、申請のうえ承認後に「教育機関ライセンス」を無償または優待価格で発行します。学籍簿・在職証明等の確認後、3営業日以内にご返信。",
                },
              },
              {
                "@type": "Question",
                name: "授業や講演で本サイトの図表・統計データを引用してもよいですか？",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "教育・研究・非営利目的の引用は CC BY-NC 4.0（出典明記・非営利）で許諾します。スライド・教科書・論文に「出典：ANZEN AI（safe-ai-site.vercel.app）／取得日」を明記してください。商用利用・転載は別途ご相談ください。",
                },
              },
            ],
          }),
        }}
      />
    </main>
  );
}
