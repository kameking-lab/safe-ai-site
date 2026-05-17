import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, HardHat, Factory, Briefcase } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ExamQuizClient } from "./exam-quiz-client";
import { RelatedPageCards } from "@/components/related-page-cards";
import { ogImageUrl } from "@/lib/og-url";
import { CERT_QUIZZES, getTotalQuestionCount } from "@/data/mock/quiz/cert-quiz";
import {
  ExamQuizCardLabels,
  ExamQuizIndustryLabel,
  ExamQuizRecommendHeading,
  ExamQuizSectionLabels,
} from "./ExamQuizI18n";
import { PageContainer } from "@/components/layout/page-container";

import { PageJsonLd } from "@/components/page-json-ld";
const _title = "安全衛生 資格試験 学習用クイズ";
const _desc =
  "労働安全コンサルタント・衛生管理者・ボイラー技士など全資格の学習用クイズ。出題形式・法令根拠つき。当サイト独自の演習問題であり、実試験の過去問とは異なります。";

export const metadata: Metadata = {
  alternates: { canonical: "/exam-quiz" },
  title: _title,
  description: _desc,
  openGraph: {
    title: `${_title}`,
    description: _desc,
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: [ogImageUrl(_title, _desc)],
  },
};

const QUALIFICATION_GUIDES = [
  {
    icon: HardHat,
    industry: "建設業",
    industryEn: "Construction",
    color: "orange",
    qualifications: ["労働安全コンサルタント", "クレーン運転士"],
    bg: "bg-orange-50 border-orange-200",
    iconBg: "bg-orange-100 text-orange-600",
    badge: "text-orange-700 bg-orange-100",
  },
  {
    icon: Factory,
    industry: "製造業",
    industryEn: "Manufacturing",
    color: "blue",
    qualifications: ["衛生管理者", "ボイラー技士"],
    bg: "bg-blue-50 border-blue-200",
    iconBg: "bg-blue-100 text-blue-600",
    badge: "text-blue-700 bg-blue-100",
  },
  {
    icon: Briefcase,
    industry: "管理職",
    industryEn: "Managerial",
    color: "emerald",
    qualifications: ["第一種衛生管理者"],
    bg: "bg-emerald-50 border-emerald-200",
    iconBg: "bg-emerald-100 text-emerald-600",
    badge: "text-emerald-700 bg-emerald-100",
  },
] as const;

export default function ExamQuizPage() {
  return (
    <>
      <PageHeader
        title="学習用クイズ（全資格対応）"
        description="安全・衛生コンサルタント、衛生管理者、ボイラー技士など全資格の学習用問題で実力を確認"
        icon={BookOpen}
        iconColor="amber"
      />

      {/* あなたにおすすめの資格 */}
      <PageContainer paddingY="tight">
        {/* SEO: WebPage + BreadcrumbList */}
        <PageJsonLd name={_title} description={_desc} path="/exam-quiz" />

        {/* Disclaimer: original practice questions, not verbatim past-exam papers */}
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <span className="font-bold">【ご注意】</span>
          本クイズは当サイトが独自に作成した学習用問題です。実試験の過去問（公式試験問題）の逐語転載ではありません。
          実際の過去問は各試験機関の公式ページをご参照ください。
        </div>

        <section>
          <ExamQuizRecommendHeading />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {QUALIFICATION_GUIDES.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.industry}
                  className={`rounded-xl border p-4 ${item.bg}`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${item.iconBg}`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-bold text-slate-800">
                      <ExamQuizIndustryLabel ja={item.industry} en={item.industryEn} />
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {item.qualifications.map((q) => (
                      <span
                        key={q}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${item.badge}`}
                      >
                        {q}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </PageContainer>

      {/* 資格別100問クイズ（カリキュラム網羅型） */}
      <PageContainer paddingY="tight">
        <section>
          <ExamQuizSectionLabels total={getTotalQuestionCount()} />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {CERT_QUIZZES.map((c) => (
              <Link
                key={c.id}
                href={`/exam-quiz/${c.id}`}
                className="group rounded-xl border border-slate-200 bg-white p-3 transition hover:border-amber-300 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-slate-900 group-hover:text-amber-700">
                      {c.name}
                    </div>
                    <div className="mt-1 line-clamp-2 text-[11px] text-slate-500">
                      {c.description}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full bg-gradient-to-r ${c.color} px-1.5 py-0.5 text-[10px] font-bold text-white`}
                  >
                    {c.difficulty}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {c.topics.slice(0, 3).map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-600"
                    >
                      {t}
                    </span>
                  ))}
                  {c.topics.length > 3 && (
                    <span className="text-[10px] text-slate-400">
                      +{c.topics.length - 3}
                    </span>
                  )}
                </div>
                <ExamQuizCardLabels count={c.questions.length} />
              </Link>
            ))}
          </div>
        </section>
      </PageContainer>

      <ExamQuizClient />
      <RelatedPageCards
        heading={{ ja: "合わせて使う", en: "Use alongside" }}
        pages={[
          {
            href: "/e-learning",
            label: { ja: "Eラーニング", en: "E-learning" },
            description: {
              ja: "テーマ別の解説付きクイズで知識を体系的に整理。学習用クイズの前に基礎固めするのにも最適です。",
              en: "Themed quizzes with explanations organize your knowledge — perfect for shoring up basics before these practice quizzes.",
            },
            color: "emerald",
            cta: { ja: "Eラーニングで学ぶ", en: "Start e-learning" },
          },
          {
            href: "/law-search",
            label: { ja: "法令検索", en: "Law search" },
            description: {
              ja: "問題で出てきた条文を原文で確認。労安法・安衛則などをキーワード検索できます。",
              en: "Look up the original text of articles mentioned in questions. Keyword search across OSH Act and OSH Rules.",
            },
            color: "sky",
            cta: { ja: "法令を検索する", en: "Search laws" },
          },
        ]}
      />
    </>
  );
}
