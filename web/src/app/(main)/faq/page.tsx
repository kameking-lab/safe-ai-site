import type { Metadata } from "next";
import Link from "next/link";
import { HelpCircle, Scale, Users, FlaskConical, Heart, Search } from "lucide-react";
import { PageJsonLd } from "@/components/page-json-ld";
import { JsonLd, faqPageSchema, breadcrumbSchema } from "@/components/json-ld";
import { SupervisorByline } from "@/components/SupervisorByline";
import { ALL_FAQS, getFAQsByCategory } from "@/data/faqs";
import { FAQ_CATEGORY_LABELS, FAQ_CATEGORY_DESCRIPTIONS, type FAQCategory } from "@/types/faq";
import { ogImageUrl } from "@/lib/og-url";

const TITLE = "労働安全衛生FAQ 200問";
const DESCRIPTION =
  "労働安全衛生法・化学物質管理・健康診断・特別教育などよくある質問200問を法令根拠付きで解説。現場担当者・安全管理者・衛生管理者必携のQ&A集。";

// exp-03 (autonomous-loop 2026-05-30): TITLE/DESCRIPTION 定数は JSON-LD でのみ使われ、
// ページの <title>/meta description を出力する metadata export が欠落していた（SEO/タブ名の取りこぼし）。
// 既存定数をそのまま使って補完する。
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/faq" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: ogImageUrl(TITLE, "法令根拠付き Q&A 200問"), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: [ogImageUrl(TITLE, "法令根拠付き Q&A 200問")],
  },
};

const CATEGORY_ICONS: Record<FAQCategory, React.ComponentType<{ className?: string }>> = {
  "law-system": Scale,
  management: Users,
  chemical: FlaskConical,
  "health-education": Heart,
};

const CATEGORY_COLORS: Record<FAQCategory, string> = {
  "law-system": "bg-blue-50 border-blue-200 text-blue-700",
  management: "bg-emerald-50 border-emerald-200 text-emerald-700",
  chemical: "bg-orange-50 border-orange-200 text-orange-700",
  "health-education": "bg-pink-50 border-pink-200 text-pink-700",
};

const CATEGORY_ICON_COLORS: Record<FAQCategory, string> = {
  "law-system": "text-blue-600",
  management: "text-emerald-600",
  chemical: "text-orange-600",
  "health-education": "text-pink-600",
};

const CATEGORIES: FAQCategory[] = ["law-system", "management", "chemical", "health-education"];

export default function FAQHubPage() {
  const topFaqs = ALL_FAQS.slice(0, 10).map((faq) => ({
    question: faq.question,
    answer: faq.answer,
  }));

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
      <PageJsonLd name={TITLE} description={DESCRIPTION} path="/faq" />
      <JsonLd schema={faqPageSchema(topFaqs, { contributor: true })} />
      <JsonLd
        schema={breadcrumbSchema([
          { name: "ホーム", url: "https://www.anzen-ai-portal.jp" },
          { name: "FAQ", url: "https://www.anzen-ai-portal.jp/faq" },
        ])}
      />

      {/* Header */}
      <header className="mb-8">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700 border border-sky-200">
          <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
          よくある質問
        </p>
        <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">{TITLE}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">{DESCRIPTION}</p>
        <p className="mt-1.5 text-xs text-slate-500">
          監修: <SupervisorByline className="text-sky-700 hover:underline" />
        </p>

        {/* Search link */}
        <div className="mt-4">
          <Link
            href="/faq/search"
            className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-slate-700 transition-colors"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            FAQを検索する
          </Link>
        </div>
      </header>

      {/* Stats */}
      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="FAQ統計">
        {CATEGORIES.map((cat) => {
          const count = getFAQsByCategory(cat).length;
          const Icon = CATEGORY_ICONS[cat];
          return (
            <div
              key={cat}
              className="rounded-xl border bg-white p-4 text-center shadow-sm"
            >
              <Icon className={`mx-auto mb-1.5 h-6 w-6 ${CATEGORY_ICON_COLORS[cat]}`} aria-hidden="true" />
              <p className="text-xl font-bold text-slate-900">{count}</p>
              <p className="text-xs text-slate-500">{FAQ_CATEGORY_LABELS[cat]}</p>
            </div>
          );
        })}
      </section>

      {/* Category cards */}
      <section aria-label="カテゴリ別FAQ">
        <h2 className="mb-4 text-lg font-bold text-slate-800">カテゴリから探す</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {CATEGORIES.map((cat) => {
            const Icon = CATEGORY_ICONS[cat];
            const faqs = getFAQsByCategory(cat);
            const preview = faqs.slice(0, 3);
            return (
              <div
                key={cat}
                className="rounded-xl border bg-white shadow-sm overflow-hidden flex flex-col"
              >
                <div className={`flex items-center gap-2 border-b px-4 py-3 ${CATEGORY_COLORS[cat]}`}>
                  <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span className="font-bold text-sm">{FAQ_CATEGORY_LABELS[cat]}</span>
                  <span className="ml-auto text-xs font-semibold opacity-80">{faqs.length}問</span>
                </div>
                <p className="px-4 pt-3 pb-2 text-xs text-slate-500 leading-relaxed">
                  {FAQ_CATEGORY_DESCRIPTIONS[cat]}
                </p>
                <ul className="px-4 pb-3 space-y-1.5 flex-1">
                  {preview.map((faq) => (
                    <li key={faq.id} className="text-xs text-slate-700 leading-snug flex gap-1.5">
                      <span className="text-slate-400 shrink-0">Q.</span>
                      <span>{faq.question}</span>
                    </li>
                  ))}
                  <li className="text-xs text-slate-400">… 他{faqs.length - 3}問</li>
                </ul>
                <div className="px-4 pb-4">
                  <Link
                    href={`/faq/${cat}`}
                    className="flex w-full min-h-[44px] items-center justify-center rounded-lg bg-slate-800 py-2 text-center text-xs font-bold text-white hover:bg-slate-700 transition-colors"
                  >
                    {FAQ_CATEGORY_LABELS[cat]}の質問一覧を見る →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Related tools */}
      <section className="mt-10 rounded-xl border border-slate-200 bg-slate-50 p-5" aria-label="関連ツール">
        <h2 className="mb-3 text-sm font-bold text-slate-700">このFAQに関連する実務ツール</h2>
        <div className="flex flex-wrap gap-2">
          {[
            { href: "/chatbot", label: "法令チャット（AI）" },
            { href: "/chemical-ra", label: "化学物質RA" },
            { href: "/law-search", label: "法令検索" },
            { href: "/education", label: "特別教育・資格" },
            { href: "/organization", label: "管理体制チェック" },
            { href: "/mental-health", label: "メンタルヘルス" },
          ].map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="inline-flex min-h-[44px] items-center rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              {tool.label}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
