import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, HardHat, Factory, Briefcase, ChevronRight, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ExamQuizClient } from "./exam-quiz-client";
import { RelatedPageCards } from "@/components/related-page-cards";
import { ogImageUrl } from "@/lib/og-url";
import { CERT_QUIZZES, getTotalQuestionCount } from "@/data/mock/quiz/cert-quiz";

import { PageJsonLd } from "@/components/page-json-ld";
const _title = "安全衛生 資格試験 過去問クイズ";
const _desc =
  "労働安全コンサルタント・衛生管理者・ボイラー技士など全資格の過去問クイズ。科目・年度別に本番形式で挑戦できます。";

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

const QUALIFICATION_GUIDES = [
  {
    icon: HardHat,
    industry: "建設業",
    color: "orange",
    qualifications: ["労働安全コンサルタント", "クレーン運転士"],
    bg: "bg-orange-50 border-orange-200",
    iconBg: "bg-orange-100 text-orange-600",
    badge: "text-orange-700 bg-orange-100",
  },
  {
    icon: Factory,
    industry: "製造業",
    color: "blue",
    qualifications: ["衛生管理者", "ボイラー技士"],
    bg: "bg-blue-50 border-blue-200",
    iconBg: "bg-blue-100 text-blue-600",
    badge: "text-blue-700 bg-blue-100",
  },
  {
    icon: Briefcase,
    industry: "管理職",
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
        title="過去問クイズ（全資格対応）"
        description="安全・衛生コンサルタント、衛生管理者、ボイラー技士など全資格の過去問で実力を確認"
        icon={BookOpen}
        iconColor="amber"
      />

      {/* あなたにおすすめの資格 */}
      <section className="mx-auto max-w-7xl px-4 py-4 lg:px-8">
        <h2 className="mb-3 text-sm font-bold text-slate-700">
          あなたにおすすめの資格
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {QUALIFICATION_GUIDES.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.industry}
                className={`rounded-xl border p-4 ${item.bg}`}
              >
      {/* SEO: WebPage + BreadcrumbList */}
      <PageJsonLd name={_title} description={_desc} path="/exam-quiz" />
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${item.iconBg}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-bold text-slate-800">
                    {item.industry}
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

      {/* 資格別100問クイズ（カリキュラム網羅型） */}
      <section className="mx-auto max-w-7xl px-4 py-4 lg:px-8">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
              <Sparkles className="h-4 w-4 text-amber-500" />
              資格別100問クイズ（解説・法令根拠つき）
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              10資格 × 100問 = {getTotalQuestionCount()}問のカリキュラム網羅型クイズ。Free=各資格30問、Standard以上で全問。
            </p>
          </div>
        </div>
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
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">{c.questions.length}問</span>
                <span className="inline-flex items-center gap-0.5 font-bold text-amber-600 group-hover:text-amber-700">
                  挑戦する <ChevronRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <ExamQuizClient />
      <RelatedPageCards
        heading="合わせて使う"
        pages={[
          {
            href: "/e-learning",
            label: "Eラーニング",
            description: "テーマ別の解説付きクイズで知識を体系的に整理。過去問の前に基礎固めするのにも最適です。",
            color: "emerald",
            cta: "Eラーニングで学ぶ",
          },
          {
            href: "/law-search",
            label: "法令検索",
            description: "問題で出てきた条文を原文で確認。労安法・安衛則などをキーワード検索できます。",
            color: "sky",
            cta: "法令を検索する",
          },
        ]}
      />
    </>
  );
}
