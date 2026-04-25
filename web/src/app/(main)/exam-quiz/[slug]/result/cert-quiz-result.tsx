"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Award,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  RotateCcw,
  TrendingDown,
  FileDown,
  Lock,
} from "lucide-react";
import type { QuizDifficulty } from "@/data/mock/quiz/cert-quiz/types";

type PlanTier = "free" | "standard" | "pro";

interface SessionAnswer {
  questionId: string;
  selected: number;
  correct: number;
  isCorrect: boolean;
  topic: string;
  level: QuizDifficulty;
}

const RESULT_LS = (slug: string) => `cert-quiz-result:${slug}`;
const PLAN_LS = "anzen-mock-plan";

function loadPlan(): PlanTier {
  if (typeof window === "undefined") return "free";
  const v = window.localStorage.getItem(PLAN_LS);
  if (v === "standard" || v === "pro") return v;
  return "free";
}

function loadSession(slug: string): SessionAnswer[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RESULT_LS(slug));
    return raw ? (JSON.parse(raw) as SessionAnswer[]) : [];
  } catch {
    return [];
  }
}

interface CertQuizResultProps {
  slug: string;
  certName: string;
  totalQuestions: number;
  certColor: string;
}

export function CertQuizResult({
  slug,
  certName,
  totalQuestions,
  certColor,
}: CertQuizResultProps) {
  const [session, setSession] = useState<SessionAnswer[]>([]);
  const [plan, setPlan] = useState<PlanTier>("free");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSession(loadSession(slug));
    setPlan(loadPlan());
    setHydrated(true);
  }, [slug]);

  const stats = useMemo(() => {
    const total = session.length;
    const correct = session.filter((a) => a.isCorrect).length;
    const rate = total > 0 ? Math.round((correct / total) * 100) : 0;

    const byTopic: Record<string, { correct: number; total: number }> = {};
    const byLevel: Record<string, { correct: number; total: number }> = {};
    for (const a of session) {
      if (!byTopic[a.topic]) byTopic[a.topic] = { correct: 0, total: 0 };
      byTopic[a.topic].total++;
      if (a.isCorrect) byTopic[a.topic].correct++;

      const lv = a.level;
      if (!byLevel[lv]) byLevel[lv] = { correct: 0, total: 0 };
      byLevel[lv].total++;
      if (a.isCorrect) byLevel[lv].correct++;
    }

    const weakTopics = Object.entries(byTopic)
      .map(([topic, s]) => ({
        topic,
        rate: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
        ...s,
      }))
      .filter((t) => t.total >= 2 && t.rate < 70)
      .sort((a, b) => a.rate - b.rate);

    return { total, correct, rate, byTopic, byLevel, weakTopics };
  }, [session]);

  if (!hydrated) {
    return <div className="p-6 text-sm text-slate-500">結果を読み込み中…</div>;
  }

  if (session.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
          <p className="text-sm text-slate-500">
            この資格の解答結果が見つかりません。クイズに挑戦してみましょう。
          </p>
          <Link
            href={`/exam-quiz/${slug}`}
            className="mt-3 inline-flex items-center gap-1 rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-white hover:bg-amber-600"
          >
            クイズに挑戦
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
    );
  }

  const passed = stats.rate >= 70;

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <Link
        href={`/exam-quiz/${slug}`}
        className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
      >
        <ChevronLeft className="h-3 w-3" /> クイズに戻る
      </Link>

      {/* スコア */}
      <section
        className={`rounded-2xl bg-gradient-to-br ${certColor} p-5 text-white shadow-sm`}
      >
        <div className="flex items-center gap-2 text-xs font-bold opacity-90">
          <Award className="h-4 w-4" />
          {certName}
        </div>
        <div className="mt-2 flex items-end justify-between gap-3">
          <div>
            <div className="text-4xl font-bold leading-none sm:text-5xl">
              {stats.rate}
              <span className="ml-1 text-2xl">%</span>
            </div>
            <div className="mt-1 text-xs opacity-90">
              {stats.correct} / {stats.total} 問正解（全{totalQuestions}問中）
            </div>
          </div>
          <div className="rounded-lg bg-white/20 px-3 py-2 text-center backdrop-blur">
            <div className="text-[10px] font-bold uppercase tracking-wider opacity-90">
              {passed ? "合格ライン" : "もう少し"}
            </div>
            <div className="text-base font-bold">
              {passed ? "達成 🎉" : "70%目標"}
            </div>
          </div>
        </div>
      </section>

      {/* カテゴリ別正答率 */}
      <section className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-bold text-slate-900">
          カテゴリ別正答率
        </h2>
        <ul className="space-y-2">
          {Object.entries(stats.byTopic)
            .sort((a, b) => b[1].total - a[1].total)
            .map(([topic, s]) => {
              const rate = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
              const barColor =
                rate >= 80
                  ? "bg-emerald-500"
                  : rate >= 60
                    ? "bg-amber-500"
                    : "bg-rose-500";
              return (
                <li key={topic}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">{topic}</span>
                    <span className="text-slate-500">
                      {s.correct}/{s.total} 問・{rate}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full ${barColor} transition-all`}
                      style={{ width: `${rate}%` }}
                    />
                  </div>
                </li>
              );
            })}
        </ul>
      </section>

      {/* 難易度別 */}
      <section className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-bold text-slate-900">難易度別</h2>
        <div className="grid grid-cols-3 gap-2">
          {(["基礎", "標準", "応用"] as const).map((lv) => {
            const s = stats.byLevel[lv] ?? { correct: 0, total: 0 };
            const rate = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
            return (
              <div
                key={lv}
                className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-center"
              >
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  {lv}
                </div>
                <div className="mt-1 text-xl font-bold text-slate-900">{rate}%</div>
                <div className="text-[10px] text-slate-500">
                  {s.correct}/{s.total}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 弱点分野（Pro限定） */}
      <section className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-1.5">
          <TrendingDown className="h-4 w-4 text-rose-500" />
          <h2 className="text-sm font-bold text-slate-900">弱点分野の分析</h2>
          {plan !== "pro" && (
            <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">
              Pro
            </span>
          )}
        </div>
        {plan === "pro" ? (
          stats.weakTopics.length === 0 ? (
            <p className="text-sm text-slate-500">
              全分野で十分な正答率（70%以上）でした。素晴らしい！
            </p>
          ) : (
            <ul className="space-y-2">
              {stats.weakTopics.map((w) => (
                <li
                  key={w.topic}
                  className="rounded-lg border border-rose-200 bg-rose-50 p-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-rose-900">{w.topic}</span>
                    <span className="text-rose-700">
                      正答率 {w.rate}%（{w.correct}/{w.total}）
                    </span>
                  </div>
                  <Link
                    href={`/education?topic=${encodeURIComponent(w.topic)}`}
                    className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 underline hover:text-rose-800"
                  >
                    <GraduationCap className="h-3 w-3" />
                    関連教材で復習する
                  </Link>
                </li>
              ))}
            </ul>
          )
        ) : (
          <ProUpsellInline />
        )}
      </section>

      {/* PDF エクスポート（Pro限定） */}
      <section className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-1.5">
          <FileDown className="h-4 w-4 text-slate-700" />
          <h2 className="text-sm font-bold text-slate-900">結果をPDFで保存</h2>
          {plan !== "pro" && (
            <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">
              Pro
            </span>
          )}
        </div>
        {plan === "pro" ? (
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") window.print();
            }}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-700"
          >
            <FileDown className="h-3 w-3" /> PDFとして保存（印刷ダイアログ）
          </button>
        ) : (
          <p className="mt-1 text-xs text-slate-500">
            学習記録の保存・上司への提出用にPDF出力。Proプランで開放されます。
          </p>
        )}
      </section>

      {/* アクション */}
      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href={`/exam-quiz/${slug}`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-amber-600"
        >
          <RotateCcw className="h-4 w-4" /> もう一度挑戦
        </Link>
        <Link
          href="/education"
          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50"
        >
          <GraduationCap className="h-4 w-4" /> Eラーニングで復習
        </Link>
        <Link
          href="/exam-quiz"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          他の資格に挑戦
        </Link>
      </div>
    </main>
  );
}

function ProUpsellInline() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
      <div className="flex items-start gap-2">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div className="min-w-0 flex-1">
          <p className="text-xs leading-relaxed text-amber-900">
            Proプランでは、苦手分野を自動抽出し、関連するEラーニング教材へワンクリックで遷移できます。学習履歴も長期保管。
          </p>
          <Link
            href="/pricing"
            className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 underline hover:text-amber-800"
          >
            Proプランを見る <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
