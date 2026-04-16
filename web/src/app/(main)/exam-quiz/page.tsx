import type { Metadata } from "next";
import { BookOpen, HardHat, Factory, Briefcase } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ExamQuizClient } from "./exam-quiz-client";
import { RelatedPageCards } from "@/components/related-page-cards";

export const metadata: Metadata = {
  title: "過去問クイズ",
  description: "労働安全・衛生コンサルタント、衛生管理者、ボイラー技士など全資格対応の過去問クイズ。科目・年度別に本番形式で挑戦できます。",
  openGraph: {
    title: "過去問クイズ｜ANZEN AI",
    description: "労働安全・衛生コンサルタント、衛生管理者、ボイラー技士など全資格対応の過去問クイズ。科目・年度別に本番形式で挑戦できます。",
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
