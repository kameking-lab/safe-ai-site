"use client";

import { useState, useEffect, useCallback } from "react";
import type { ELearningQuestion } from "@/data/e-learning/types";
import { ELEARNING_CATEGORIES } from "@/data/e-learning/types";

const LS_KEY = "elearning-history";

interface CategoryRecord {
  correct: number;
  total: number;
}

function loadHistory(): Record<string, CategoryRecord> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, CategoryRecord>) : {};
  } catch {
    return {};
  }
}

function saveResult(category: string, isCorrect: boolean) {
  const history = loadHistory();
  if (!history[category]) history[category] = { correct: 0, total: 0 };
  history[category].total++;
  if (isCorrect) history[category].correct++;
  localStorage.setItem(LS_KEY, JSON.stringify(history));
}

function RateBar({ correct, total }: { correct: number; total: number }) {
  const rate = total > 0 ? Math.round((correct / total) * 100) : 0;
  const color =
    rate >= 80 ? "bg-emerald-500" : rate >= 60 ? "bg-amber-400" : "bg-red-400";
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-slate-500">
        <span>{total > 0 ? `${correct}/${total}問 正解` : "未受講"}</span>
        {total > 0 && <span className="font-semibold">{rate}%</span>}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        {total > 0 && (
          <div
            className={`h-full rounded-full ${color} transition-all`}
            style={{ width: `${rate}%` }}
          />
        )}
      </div>
    </div>
  );
}

// --- Category Grid ---
function CategoryGrid({
  questions,
  onSelectCategory,
  history,
}: {
  questions: ELearningQuestion[];
  onSelectCategory: (key: string) => void;
  history: Record<string, CategoryRecord>;
}) {
  return (
    <div className="px-4 py-5 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-800">災害の型別学習</h2>
          <p className="mt-1 text-sm text-slate-500">
            厚労省分類の20分野から選択して問題を解きましょう
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {ELEARNING_CATEGORIES.map((cat) => {
            const catQuestions = questions.filter((q) => q.category === cat.key);
            const hist = history[cat.key] ?? { correct: 0, total: 0 };
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => onSelectCategory(cat.key)}
                className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-400 hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between">
                  <span className="text-2xl">{cat.icon}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                    {catQuestions.length}問
                  </span>
                </div>
                <p className="mb-1 text-sm font-bold text-slate-800 group-hover:text-emerald-700">
                  {cat.label}
                </p>
                <p className="mb-3 text-xs text-slate-500 leading-relaxed">
                  {cat.description}
                </p>
                <RateBar correct={hist.correct} total={hist.total} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// --- Quiz Mode ---
function QuizMode({
  categoryKey,
  questions,
  onBack,
  onSaveResult,
}: {
  categoryKey: string;
  questions: ELearningQuestion[];
  onBack: () => void;
  onSaveResult: (isCorrect: boolean) => void;
}) {
  const catQuestions = questions.filter((q) => q.category === categoryKey);
  const cat = ELEARNING_CATEGORIES.find((c) => c.key === categoryKey);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const q = catQuestions[index];

  const handleSelect = useCallback(
    (label: string) => {
      if (selected !== null || !q) return;
      const choice = q.choices.find((c) => c.label === label);
      const isCorrect = choice?.isCorrect ?? false;
      onSaveResult(isCorrect);
      setSelected(label);
    },
    [selected, q, onSaveResult]
  );

  const goNext = () => {
    setIndex((i) => i + 1);
    setSelected(null);
    setShowAll(false);
  };

  if (!q || index >= catQuestions.length) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 text-center">
        <p className="text-3xl font-bold text-emerald-600">完了！</p>
        <p className="mt-2 text-slate-600">{catQuestions.length}問すべて解答しました</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => { setIndex(0); setSelected(null); setShowAll(false); }}
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            もう一度
          </button>
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            分野一覧に戻る
          </button>
        </div>
      </div>
    );
  }

  const correctChoice = q.choices.find((c) => c.isCorrect);
  const selectedChoice = selected ? q.choices.find((c) => c.label === selected) : null;
  const isCorrect = selectedChoice?.isCorrect ?? false;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← 一覧
        </button>
        <span className="text-sm font-semibold text-slate-700">
          {cat?.icon} {cat?.label}
        </span>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="mb-1 flex justify-between text-xs text-slate-500">
          <span>{index + 1} / {catQuestions.length}問</span>
          <span className={`font-medium ${
            q.difficulty === "basic" ? "text-emerald-600" :
            q.difficulty === "intermediate" ? "text-amber-600" : "text-red-600"
          }`}>
            {q.difficulty === "basic" ? "基礎" : q.difficulty === "intermediate" ? "中級" : "上級"}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-emerald-400 transition-all"
            style={{ width: `${((index + 1) / catQuestions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-bold text-slate-500">問{index + 1}</p>
        <p className="mt-2 text-base leading-relaxed text-slate-900">{q.questionText}</p>

        {/* Choices */}
        <div className="mt-4 space-y-2">
          {q.choices.map((choice) => {
            let cls = "w-full rounded-xl border px-4 py-3 text-left text-sm transition";
            if (selected === null) {
              cls += " border-slate-200 hover:border-emerald-300 hover:bg-emerald-50";
            } else if (choice.isCorrect) {
              cls += " border-emerald-400 bg-emerald-50 text-emerald-900 font-semibold";
            } else if (choice.label === selected && !choice.isCorrect) {
              cls += " border-red-400 bg-red-50 text-red-900";
            } else {
              cls += " border-slate-100 bg-slate-50 text-slate-500";
            }

            return (
              <button
                key={choice.label}
                type="button"
                disabled={selected !== null}
                className={cls}
                onClick={() => handleSelect(choice.label)}
              >
                <div className="flex items-start gap-3">
                  <span className="shrink-0 font-bold text-slate-600">{choice.label}.</span>
                  <div className="flex-1">
                    <p>{choice.text}</p>
                    {/* 解説（選択後に表示） */}
                    {selected !== null && (showAll || choice.label === selected || choice.isCorrect) && (
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-600 border-t border-slate-200 pt-1.5">
                        {choice.explanation}
                      </p>
                    )}
                  </div>
                  {selected !== null && choice.isCorrect && (
                    <span className="shrink-0 text-emerald-600">✓</span>
                  )}
                  {selected !== null && choice.label === selected && !choice.isCorrect && (
                    <span className="shrink-0 text-red-500">✗</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Result */}
        {selected !== null && (
          <div className={`mt-4 rounded-xl p-3 text-sm ${
            isCorrect ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"
          }`}>
            {isCorrect ? (
              <span className="font-bold">正解！ — {correctChoice?.text} が不適切です。</span>
            ) : (
              <span>
                <span className="font-bold">不正解。</span> 正答は「{correctChoice?.label}. {correctChoice?.text}」です。
              </span>
            )}
          </div>
        )}

        {/* 全解説ボタン */}
        {selected !== null && !showAll && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="mt-3 text-sm font-semibold text-emerald-600 hover:text-emerald-700"
          >
            全選択肢の解説を見る ▼
          </button>
        )}
      </div>

      {/* Next */}
      {selected !== null && (
        <div className="mt-4 flex justify-end">
          {index < catQuestions.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              次の問題 →
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              結果を見る
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// --- Main Component ---
export function ELearningClient({ questions }: { questions: ELearningQuestion[] }) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, CategoryRecord>>({});

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const handleSaveResult = useCallback((categoryKey: string, isCorrect: boolean) => {
    saveResult(categoryKey, isCorrect);
    setHistory(loadHistory());
  }, []);

  if (selectedCategory) {
    return (
      <QuizMode
        categoryKey={selectedCategory}
        questions={questions}
        onBack={() => setSelectedCategory(null)}
        onSaveResult={(isCorrect) => handleSaveResult(selectedCategory, isCorrect)}
      />
    );
  }

  return (
    <CategoryGrid
      questions={questions}
      onSelectCategory={setSelectedCategory}
      history={history}
    />
  );
}
