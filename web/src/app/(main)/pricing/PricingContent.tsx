"use client";

import Link from "next/link";
import { Check, Zap, Shield, Star, Briefcase, Building2 } from "lucide-react";
import { PricingCheckout } from "./pricing-checkout";
import { useTranslation } from "@/contexts/language-context";
import { PricingMatrix } from "@/components/PricingMatrix";

const PLAN_FEATURES = {
  free: {
    icon: Shield,
    iconColor: "text-slate-600",
    borderColor: "border-slate-300",
    price: 0,
    period: { ja: "月", en: "/mo" },
    features: [
      { ja: "事故データベース検索（全件）", en: "Accident DB search (all records)" },
      { ja: "法改正一覧・AI要約（月30回まで）", en: "Law update list + AI summary (30/mo)" },
      { ja: "KY用紙シンプルモード", en: "KY form (simple mode)" },
      { ja: "特別教育 過去問クイズ（一部）", en: "Special education quizzes (partial)" },
      { ja: "気象リスク（1地域）", en: "Weather risk (1 region)" },
    ],
    limitations: [
      { ja: "AIチャット（無制限）", en: "AI chat (unlimited)" },
      { ja: "KY用紙PDF出力", en: "KY form PDF export" },
      { ja: "サイネージ表示", en: "Signage display" },
    ],
  },
  standard: {
    icon: Zap,
    iconColor: "text-emerald-600",
    borderColor: "border-emerald-400",
    price: 980,
    period: { ja: "月（税込）", en: "/mo (tax incl.)" },
    features: [
      { ja: "フリーの全機能", en: "All Free features" },
      { ja: "AIチャット・リスク予測（無制限）", en: "AI chat & risk prediction (unlimited)" },
      { ja: "法改正AI要約（無制限）", en: "Law update AI summaries (unlimited)" },
      { ja: "KY用紙 詳細モード・PDF出力", en: "KY form detailed mode + PDF export" },
      { ja: "特別教育 過去問クイズ（全種）", en: "Special education quizzes (all types)" },
      { ja: "気象リスク警報メール通知", en: "Weather alert email notifications" },
      { ja: "メールサポート", en: "Email support" },
    ],
    limitations: [
      { ja: "サイネージ多拠点表示", en: "Multi-site signage" },
      { ja: "LMS（進捗管理）", en: "LMS (progress management)" },
    ],
  },
  pro: {
    icon: Star,
    iconColor: "text-amber-600",
    borderColor: "border-amber-400",
    price: 2980,
    period: { ja: "月（税込）", en: "/mo (tax incl.)" },
    popular: true,
    features: [
      { ja: "スタンダードの全機能", en: "All Standard features" },
      { ja: "利用アカウント：最大10名", en: "Up to 10 user accounts" },
      { ja: "サイネージ多拠点表示（3拠点）", en: "Multi-site signage (3 locations)" },
      { ja: "LMS（学習進捗・修了証）", en: "LMS (progress tracking + certificates)" },
      { ja: "化学物質リスクアセスメント", en: "Chemical substance risk assessment" },
      { ja: "KY用紙テンプレート共有", en: "KY form template sharing" },
      { ja: "電話・メールサポート", en: "Phone & email support" },
      { ja: "請求書払い対応", en: "Invoice payment available" },
    ],
    limitations: [],
  },
  business: {
    icon: Building2,
    iconColor: "text-violet-600",
    borderColor: "border-violet-400",
    price: 29800,
    period: { ja: "月（税込）", en: "/mo (tax incl.)" },
    features: [
      { ja: "プロの全機能", en: "All Pro features" },
      { ja: "利用アカウント：最大100名", en: "Up to 100 user accounts" },
      { ja: "多拠点サイネージ表示（無制限）", en: "Multi-site signage (unlimited)" },
      { ja: "LMS βアクセス（先行招待）", en: "LMS β early access" },
      { ja: "法令通知の業種別カスタムルール", en: "Industry-specific law alert rules" },
      { ja: "請求書払い・年契払い割引（−10%）", en: "Invoice payment + annual discount (−10%)" },
      { ja: "初期サポート（ハンズオン1回／導入時）", en: "Onboarding hands-on session (×1)" },
      { ja: "SSO（Google Workspace）対応", en: "SSO (Google Workspace)" },
    ],
    limitations: [
      { ja: "SAML/OIDC SSO（受託扱いで別途）", en: "SAML/OIDC SSO (custom contract)" },
      { ja: "オンプレ／専用環境（受託扱いで別途）", en: "On-premises / dedicated env (custom)" },
    ],
  },
  custom: {
    icon: Briefcase,
    iconColor: "text-blue-600",
    borderColor: "border-blue-400",
    price: null,
    period: null,
    features: [
      { ja: "KY・安全書類のデジタル化", en: "KY & safety document digitization" },
      { ja: "Excel VBA・ルーティン業務の自動化", en: "Excel VBA / routine task automation" },
      { ja: "特別教育・安全衛生教育の講師派遣", en: "Special education instructor dispatch" },
      { ja: "労働安全コンサル・月額顧問", en: "Occupational safety consulting / monthly retainer" },
      { ja: "Claude Code による受託開発", en: "Custom development via Claude Code" },
      { ja: "要件ヒアリング → 個別見積", en: "Requirements → custom quote" },
      { ja: "無料相談30分（オンライン）", en: "Free 30-min consultation (online)" },
    ],
    limitations: [],
  },
};

type PlanId = keyof typeof PLAN_FEATURES;

const PLAN_IDS: PlanId[] = ["free", "standard", "pro", "business", "custom"];

const FAQ_JA = [
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
];

const FAQ_EN = [
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel anytime from 'Plan Management' (Stripe Customer Portal) in your account. You can continue using the service until the end of the current billing period. No pro-rated refunds.",
  },
  {
    q: "Can I stay on the free plan indefinitely?",
    a: "Yes. No ads, no expiry. Upgrade to a paid plan whenever you need more features.",
  },
  {
    q: "What payment methods are accepted?",
    a: "Credit card (Visa / Mastercard / American Express / JCB) via Stripe. Invoice payment is available for Pro and above — contact us.",
  },
  {
    q: "What can I request under Custom?",
    a: "KY form digitization, Excel VBA automation, web/LP development, AI training, safety consulting retainer, and more. We provide a custom quote after a requirements interview.",
  },
  {
    q: "Is corporate contract / invoice payment available?",
    a: "Yes for Pro / Business / Custom plans. Business plan includes 10% discount on annual billing. Contact us via the inquiry form.",
  },
  {
    q: "Do you offer discounts for educational institutions?",
    a: "Yes. Colleges, universities, and professional associations can apply for an Educational License (free or discounted). We reply within 3 business days after verifying enrollment/employment proof.",
  },
  {
    q: "May I cite charts or statistics from this site in lectures or papers?",
    a: "Yes, for educational/research/non-commercial use under CC BY-NC 4.0. Cite as 'Source: ANZEN AI (safe-ai-site.vercel.app) / accessed [date]'. Contact us for commercial use.",
  },
];

export function PricingContent() {
  const { t, language } = useTranslation();
  const isEn = language === "en";
  const faq = isEn ? FAQ_EN : FAQ_JA;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          {t("pricing.title")}
        </h1>
        <p className="mt-3 text-slate-600 text-sm leading-7 max-w-2xl mx-auto">
          {t("pricing.description")}
        </p>
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {PLAN_IDS.map((planId) => {
          const plan = PLAN_FEATURES[planId];
          const Icon = plan.icon;
          const isPopular = "popular" in plan && plan.popular;
          const isFree = planId === "free";
          const isCustom = planId === "custom";
          const isBusiness = planId === "business";

          return (
            <div
              key={planId}
              className={`relative flex flex-col rounded-2xl border-2 bg-white p-5 shadow-sm ${plan.borderColor} ${
                isPopular ? "ring-2 ring-amber-400 ring-offset-2" : ""
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-amber-500 px-4 py-1 text-xs font-bold text-white shadow">
                    {t("pricing.popular")}
                  </span>
                </div>
              )}

              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50">
                <Icon className={`h-5 w-5 ${plan.iconColor}`} aria-hidden="true" />
              </div>

              <p className="text-sm font-bold text-slate-800">
                {t(`pricing.plan.${planId}.name` as Parameters<typeof t>[0])}
              </p>

              <div className="mt-2 flex items-baseline gap-1">
                {plan.price === null ? (
                  <span className="text-2xl font-bold text-slate-900">{t("pricing.custom_price")}</span>
                ) : (
                  <>
                    <span className="text-3xl font-bold text-slate-900">
                      {plan.price === 0 ? "¥0" : `¥${plan.price.toLocaleString()}`}
                    </span>
                    {plan.period && (
                      <span className="text-sm text-slate-500">
                        {isEn ? plan.period.en : plan.period.ja}
                      </span>
                    )}
                  </>
                )}
              </div>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                {t("pricing.target_label")}:{" "}
                {t(`pricing.plan.${planId}.target` as Parameters<typeof t>[0])}
              </p>

              <div className="my-4 border-t border-slate-100" />

              <ul className="flex-1 space-y-2 text-xs">
                {plan.features.map((f) => (
                  <li key={f.ja} className="flex items-start gap-2 text-slate-700">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    {isEn ? f.en : f.ja}
                  </li>
                ))}
                {plan.limitations.map((f) => (
                  <li key={f.ja} className="flex items-start gap-2 text-slate-400 line-through">
                    <span className="mt-0.5 h-3.5 w-3.5 shrink-0 text-center text-xs">✕</span>
                    {isEn ? f.en : f.ja}
                  </li>
                ))}
              </ul>

              <div className="mt-5">
                {isFree ? (
                  <Link
                    href="/api/auth/signin?callbackUrl=%2F"
                    className="block w-full rounded-xl bg-slate-800 py-2.5 text-center text-sm font-bold text-white transition hover:bg-slate-700 active:scale-[0.98]"
                  >
                    {t("pricing.plan.free.cta")}
                  </Link>
                ) : isCustom ? (
                  <Link
                    href="/contact?category=enterprise"
                    className="block w-full rounded-xl bg-blue-600 py-2.5 text-center text-sm font-bold text-white transition hover:bg-blue-700 active:scale-[0.98]"
                  >
                    {t("pricing.plan.custom.cta")}
                  </Link>
                ) : isBusiness ? (
                  <Link
                    href="/contact?category=business-plan"
                    className="block w-full rounded-xl bg-violet-600 py-2.5 text-center text-sm font-bold text-white transition hover:bg-violet-700 active:scale-[0.98]"
                  >
                    {t("pricing.plan.business.cta")}
                  </Link>
                ) : (
                  <PricingCheckout
                    planId={planId}
                    planName={t(`pricing.plan.${planId}.name` as Parameters<typeof t>[0])}
                    label={t(`pricing.plan.${planId}.cta` as Parameters<typeof t>[0])}
                    variant={planId === "pro" ? "amber" : "emerald"}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Plan feature comparison matrix */}
      <PricingMatrix />

      {/* Free consultation banner */}
      <div className="mt-10 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 text-center">
        <p className="text-sm font-bold text-emerald-800">{t("pricing.consult.title")}</p>
        <p className="mt-2 text-xs leading-5 text-slate-600">{t("pricing.consult.description")}</p>
        <Link
          href="/contact"
          className="mt-4 inline-block rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition-colors"
        >
          {t("pricing.consult.cta")}
        </Link>
      </div>

      {/* FAQ */}
      <div className="mt-10 rounded-2xl border border-slate-100 bg-slate-50 p-6">
        <h2 className="mb-4 text-sm font-bold text-slate-700">{t("pricing.faq.title")}</h2>
        <dl className="space-y-4 text-sm">
          {faq.map(({ q, a }) => (
            <div key={q}>
              <dt className="font-semibold text-slate-700">{q}</dt>
              <dd className="mt-1 text-slate-500 leading-6">{a}</dd>
            </div>
          ))}
        </dl>
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">{t("pricing.note")}</p>
    </main>
  );
}
