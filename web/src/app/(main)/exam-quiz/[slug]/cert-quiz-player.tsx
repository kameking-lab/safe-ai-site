"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  ChevronRight,
  ListFilter,
  Lock,
  Sparkles,
} from "lucide-react";
import type { CertQuizQuestion, QuizDifficulty } from "@/data/mock/quiz/cert-quiz/types";

type PlanTier = "free" | "standard" | "pro";

const PLAN_LIMITS: Record<PlanTier, number | null> = {
  free: 30,
  standard: null,
  pro: null,
};

interface CertQuizPlayerProps {
  slug: string;
  certName: string;
  questions: CertQuizQuestion[];
}

interface SessionAnswer {
  questionId: string;
  selected: number;
  correct: number;
  isCorrect: boolean;
  topic: string;
  level: QuizDifficulty;
}

const SESSION_LS = (slug: string) => `cert-quiz-session:${slug}`;
const RESULT_LS = (slug: string) => `cert-quiz-result:${slug}`;
const PLAN_LS = "anzen-mock-plan";

function loadPlan(): PlanTier {
  if (typeof window === "undefined") return "free";
  const v = window.localStorage.getItem(PLAN_LS);
  if (v === "standard" || v === "pro") return v;
  return "free";
}

function savePlan(plan: PlanTier) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PLAN_LS, plan);
}

export function CertQuizPlayer({ slug, certName, questions }: CertQuizPlayerProps) {
  const router = useRouter();
  const [plan, setPlan] = useState<PlanTier>("free");
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<QuizDifficulty | "all">("all");
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [session, setSession] = useState<SessionAnswer[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- マウント直後の一度きりのlocalStorage hydration
    setPlan(loadPlan());
  }, []);

  const limit = PLAN_LIMITS[plan];
  const limitedQuestions = useMemo(() => {
    return limit === null ? questions : questions.slice(0, limit);
  }, [questions, limit]);

  const topics = useMemo(() => {
    const set = new Set<string>();
    limitedQuestions.forEach((q) => set.add(q.topic));
    return Array.from(set);
  }, [limitedQuestions]);

  const filtered = useMemo(() => {
    return limitedQuestions.filter((q) => {
      if (topicFilter !== "all" && q.topic !== topicFilter) return false;
      if (levelFilter !== "all" && q.level !== levelFilter) return false;
      return true;
    });
  }, [limitedQuestions, topicFilter, levelFilter]);

  const current = filtered[index];

  const handleAnswer = useCallback(
    (i: number) => {
      if (showAnswer || !current) return;
      setSelected(i);
      setShowAnswer(true);
      const isCorrect = i === current.correct;
      const newAnswer: SessionAnswer = {
        questionId: current.id,
        selected: i,
        correct: current.correct,
        isCorrect,
        topic: current.topic,
        level: current.level,
      };
      setSession((prev) => {
        const filtered = prev.filter((a) => a.questionId !== current.id);
        const next = [...filtered, newAnswer];
        if (typeof window !== "undefined") {
          window.localStorage.setItem(SESSION_LS(slug), JSON.stringify(next));
        }
        return next;
      });
    },
    [showAnswer, current, slug],
  );

  const handleNext = useCallback(() => {
    setSelected(null);
    setShowAnswer(false);
    if (index < filtered.length - 1) {
      setIndex((i) => i + 1);
    } else {
      // 最後の問題 → 結果ページへ
      if (typeof window !== "undefined") {
        window.localStorage.setItem(RESULT_LS(slug), JSON.stringify(session));
      }
      router.push(`/exam-quiz/${slug}/result`);
    }
  }, [index, filtered.length, slug, session, router]);

  const handleReset = useCallback(() => {
    setIndex(0);
    setSelected(null);
    setShowAnswer(false);
    setSession([]);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(SESSION_LS(slug));
    }
  }, [slug]);

  const handleFinish = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(RESULT_LS(slug), JSON.stringify(session));
    }
    router.push(`/exam-quiz/${slug}/result`);
  }, [slug, session, router]);

  const progress = filtered.length > 0 ? Math.round((index / filtered.length) * 100) : 0;
  const correctCount = session.filter((a) => a.isCorrect).length;

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      {/* プラン状態 */}
      <PlanBadge
        plan={plan}
        onChange={(p) => {
          setPlan(p);
          savePlan(p);
          setIndex(0);
          setSelected(null);
          setShowAnswer(false);
        }}
        limit={limit}
        total={questions.length}
      />

      {/* フィルター */}
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-600">
          <ListFilter className="h-3.5 w-3.5" /> 出題範囲を絞る
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip
            active={topicFilter === "all"}
            onClick={() => {
              setTopicFilter("all");
              setIndex(0);
              setSelected(null);
              setShowAnswer(false);
            }}
          >
            全分野
          </Chip>
          {topics.map((t) => (
            <Chip
              key={t}
              active={topicFilter === t}
              onClick={() => {
                setTopicFilter(t);
                setIndex(0);
                setSelected(null);
                setShowAnswer(false);
              }}
            >
              {t}
            </Chip>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(["all", "基礎", "標準", "応用"] as const).map((lv) => (
            <Chip
              key={lv}
              active={levelFilter === lv}
              onClick={() => {
                setLevelFilter(lv as QuizDifficulty | "all");
                setIndex(0);
                setSelected(null);
                setShowAnswer(false);
              }}
              variant="level"
            >
              {lv === "all" ? "全難易度" : lv}
            </Chip>
          ))}
        </div>
      </div>

      {/* 進捗 */}
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700">
            問題 {filtered.length === 0 ? 0 : index + 1} / {filtered.length}
          </span>
          <span className="text-slate-500">
            正答 {correctCount} / 解答 {session.length}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 問題 */}
      {!current ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          選択した条件に該当する問題がありません。
        </div>
      ) : (
        <article className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px]">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
              {current.topic}
            </span>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
              {current.level}
            </span>
            <span className="text-slate-400">{current.id}</span>
          </div>
          <h2 className="mb-4 text-base font-bold text-slate-900 sm:text-lg">
            {current.q}
          </h2>
          <ul className="space-y-2">
            {current.choices.map((choice, i) => {
              const isCorrect = i === current.correct;
              const isSelected = selected === i;
              const showState = showAnswer;
              const stateClass = showState
                ? isCorrect
                  ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                  : isSelected
                    ? "border-rose-400 bg-rose-50 text-rose-900"
                    : "border-slate-200 bg-white text-slate-700"
                : isSelected
                  ? "border-amber-400 bg-amber-50 text-slate-900"
                  : "border-slate-200 bg-white text-slate-700 hover:border-amber-300";
              return (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => handleAnswer(i)}
                    disabled={showAnswer}
                    className={`flex w-full items-start gap-3 rounded-lg border-2 px-3 py-2.5 text-left text-sm font-medium transition disabled:cursor-default ${stateClass}`}
                  >
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="flex-1">{choice}</span>
                    {showState && isCorrect && (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    )}
                    {showState && isSelected && !isCorrect && (
                      <XCircle className="h-5 w-5 text-rose-500" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          {showAnswer && (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="mb-1 text-[11px] font-bold text-slate-500">
                解説
              </div>
              <p className="text-sm leading-relaxed text-slate-700">
                {current.explain}
              </p>
              {current.law && (
                <div className="mt-2 text-[11px] text-slate-500">
                  根拠: <span className="font-medium text-slate-700">{current.law}</span>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {showAnswer ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-amber-600"
              >
                {index < filtered.length - 1 ? "次の問題" : "結果を見る"}
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <span className="text-xs text-slate-500">選択肢をタップして解答</span>
            )}
            <button
              type="button"
              onClick={handleReset}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:border-slate-300"
            >
              最初から
            </button>
            {session.length > 0 && (
              <button
                type="button"
                onClick={handleFinish}
                className="ml-auto rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
              >
                ここまでで結果を見る
              </button>
            )}
          </div>
        </article>
      )}

      {/* プラン制限案内 */}
      {plan === "free" && limit !== null && questions.length > limit && (
        <FreeUpsell
          certName={certName}
          freeLimit={limit}
          totalQuestions={questions.length}
        />
      )}
    </main>
  );
}

function Chip({
  children,
  active,
  onClick,
  variant = "topic",
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  variant?: "topic" | "level";
}) {
  const activeClass =
    variant === "level"
      ? "border-amber-500 bg-amber-500 text-white"
      : "border-emerald-500 bg-emerald-500 text-white";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition ${
        active
          ? activeClass
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
      }`}
    >
      {children}
    </button>
  );
}

function PlanBadge({
  plan,
  onChange,
  limit,
  total,
}: {
  plan: PlanTier;
  onChange: (p: PlanTier) => void;
  limit: number | null;
  total: number;
}) {
  const label =
    plan === "pro" ? "Proプラン" : plan === "standard" ? "Standardプラン" : "Freeプラン";
  const description =
    limit === null
      ? `全 ${total} 問にアクセス可能`
      : `Free は ${limit} 問のみ・全 ${total} 問はStandard以上`;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs">
      <Sparkles className="h-4 w-4 text-amber-600" />
      <span className="font-bold text-amber-900">{label}</span>
      <span className="text-amber-800">{description}</span>
      <div className="ml-auto flex gap-1">
        {(["free", "standard", "pro"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
              plan === p
                ? "bg-amber-600 text-white"
                : "bg-white text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100"
            }`}
            title="モック切替（実装ではStripe連携）"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

function FreeUpsell({
  certName,
  freeLimit,
  totalQuestions,
}: {
  certName: string;
  freeLimit: number;
  totalQuestions: number;
}) {
  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-amber-50 p-4">
      <div className="flex items-start gap-3">
        <Lock className="mt-1 h-5 w-5 shrink-0 text-amber-600" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-slate-900">
            {certName} の残り {totalQuestions - freeLimit} 問は Standard プランで開放
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Standard プランでは10資格×全100問・カリキュラム網羅型クイズが受け放題。
            Pro プランは加えて弱点分野分析・PDFエクスポート・進捗履歴の長期保管が可能。
          </p>
          <Link
            href="/pricing"
            className="mt-2 inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-amber-600"
          >
            プランを比較する
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
