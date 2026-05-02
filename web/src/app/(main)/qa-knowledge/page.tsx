import type { Metadata } from "next";
import Link from "next/link";
import { HelpCircle, MessageSquarePlus } from "lucide-react";
import { COMMUNITY_CASES_SEED } from "@/data/mock/community-cases";
import { UGC_INDUSTRY_OPTIONS } from "@/lib/ugc-types";
import { ogImageUrl } from "@/lib/og-url";

import { PageJsonLd } from "@/components/page-json-ld";
import { JsonLd, faqPageSchema } from "@/components/json-ld";
const TITLE = "Q&Aナレッジベース";
const DESCRIPTION =
  "現場担当者から寄せられた質問と、労働安全コンサルタントの回答をまとめたナレッジベース。";

export const metadata: Metadata = {
  title: `${TITLE}｜ANZEN AI`,
  description: DESCRIPTION,
  alternates: { canonical: "/qa-knowledge" },
  openGraph: {
    title: `${TITLE}｜ANZEN AI`,
    description: DESCRIPTION,
    images: [{ url: ogImageUrl(TITLE, DESCRIPTION), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: [ogImageUrl(TITLE, DESCRIPTION)],
  },
};

export default function QaKnowledgePage() {
  const questions = COMMUNITY_CASES_SEED.filter(
    (c) => c.category === "question" && c.status === "approved"
  );

  const faq = questions
    .map((q) => ({
      question: q.title,
      answer: q.body || "（コミュニティから回答受付中）",
    }))
    .slice(0, 20);

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      {/* SEO: WebPage + BreadcrumbList + FAQPage */}
      <PageJsonLd name={TITLE} description={DESCRIPTION} path="/qa-knowledge" />
      {faq.length > 0 ? <JsonLd schema={faqPageSchema(faq)} /> : null}
      <header className="mb-6">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700 border border-sky-200">
          <HelpCircle className="h-3.5 w-3.5" />
          Q&Aナレッジベース
        </p>
        <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">{TITLE}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">{DESCRIPTION}</p>

        <div className="mt-5">
          <Link
            href="/community-cases/submit"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700"
          >
            <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
            質問を投稿する
          </Link>
        </div>
      </header>

      {questions.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
          まだ質問はありません。最初の質問を投稿してみませんか？
        </p>
      ) : (
        <ul className="space-y-4">
          {questions.map((q) => {
            const industryLabel =
              UGC_INDUSTRY_OPTIONS.find((i) => i.value === q.industry)?.label ?? q.industry;
            return (
              <li
                key={q.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 font-bold text-sky-700">
                    Q. 質問
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-600">
                    {industryLabel}
                  </span>
                  <span className="text-slate-400">{q.authorAlias}</span>
                </div>

                <Link
                  href={`/community-cases/${q.id}`}
                  className="mt-3 block text-base font-bold leading-snug text-slate-900 hover:text-emerald-700"
                >
                  {q.title}
                </Link>

                <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">{q.body}</p>

                {q.supervisorComment && (
                  <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                    <p className="text-[11px] font-bold text-emerald-700">A. コンサルタント回答</p>
                    <p className="mt-1 text-xs leading-5 text-emerald-900 line-clamp-3">
                      {q.supervisorComment}
                    </p>
                  </div>
                )}

                <Link
                  href={`/community-cases/${q.id}`}
                  className="mt-3 inline-block text-xs font-semibold text-emerald-700 hover:underline"
                >
                  詳細を読む →
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
