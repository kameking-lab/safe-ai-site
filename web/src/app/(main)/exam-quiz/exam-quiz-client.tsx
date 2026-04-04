"use client";

import { useCallback, useEffect, useState } from "react";
import {
  filterQuestions,
  AVAILABLE_YEARS,
  SUBJECT_LABELS,
  CATEGORY_LABELS,
  CATEGORY_SUBJECTS,
} from "@/data/exam-questions";
import type { ExamQuestion, ExamSubject, ExamCategory } from "@/data/exam-questions";

const LS_KEY = "exam-quiz-history";

interface AnswerRecord {
  questionId: string;
  selected: string;
  correct: string;
  isCorrect: boolean;
  timestamp: number;
}

function loadHistory(): AnswerRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as AnswerRecord[]) : [];
  } catch {
    return [];
  }
}

function saveAnswer(record: AnswerRecord) {
  const history = loadHistory();
  history.push(record);
  localStorage.setItem(LS_KEY, JSON.stringify(history));
}

function calcStats(history: AnswerRecord[]) {
  if (history.length === 0) return { total: 0, correct: 0, rate: 0, byCategory: {} };

  const latestByQuestion = new Map<string, AnswerRecord>();
  for (const rec of history) {
    latestByQuestion.set(rec.questionId, rec);
  }

  const records = Array.from(latestByQuestion.values());
  const correct = records.filter((r) => r.isCorrect).length;
  const total = records.length;
  const rate = total > 0 ? Math.round((correct / total) * 100) : 0;

  // Group by category code (2nd segment of id like "2024-hm1g-001" → "hm1g")
  const categoryMap: Record<string, { correct: number; total: number; label: string }> = {};
  for (const rec of records) {
    const parts = rec.questionId.split("-");
    const code = parts[1] ?? "other";
    const label = getCategoryLabelFromCode(code);
    if (!categoryMap[code]) categoryMap[code] = { correct: 0, total: 0, label };
    categoryMap[code].total++;
    if (rec.isCorrect) categoryMap[code].correct++;
  }

  return { total, correct, rate, byCategory: categoryMap };
}

function getCategoryLabelFromCode(code: string): string {
  if (code === "sg") return "産業安全一般";
  if (code === "sl") return "産業安全関係法令";
  if (code === "hm1g") return "衛生管理者1種・労働衛生";
  if (code === "hm1lh") return "衛生管理者1種・法令（有害）";
  if (code === "hm1lo") return "衛生管理者1種・法令（その他）";
  if (code === "hm1p") return "衛生管理者1種・労働生理";
  if (code === "hm2g") return "衛生管理者2種・労働衛生";
  if (code === "hm2l") return "衛生管理者2種・法令";
  if (code === "hm2p") return "衛生管理者2種・労働生理";
  if (code === "hcg") return "衛生コンサルタント・一般";
  if (code === "hcl") return "衛生コンサルタント・法令";
  if (code === "b1s") return "ボイラー1級・構造";
  if (code === "b1o") return "ボイラー1級・取扱い";
  if (code === "b1f") return "ボイラー1級・燃料燃焼";
  if (code === "b1l") return "ボイラー1級・法令";
  if (code === "crk") return "クレーン・知識";
  if (code === "cre") return "クレーン・電気";
  if (code === "crl") return "クレーン・法令";
  if (code === "crm") return "クレーン・力学";
  return code;
}

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as ExamCategory[];

function FilterBtn({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
        active
          ? "border-amber-500 bg-amber-500 text-white"
          : "border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50"
      }`}
    >
      {label}
    </button>
  );
}

function StatRow({
  label,
  correct,
  total,
}: {
  label: string;
  correct: number;
  total: number;
}) {
  const rate = total > 0 ? Math.round((correct / total) * 100) : 0;
  const color =
    rate >= 80 ? "bg-emerald-500" : rate >= 60 ? "bg-amber-400" : "bg-red-400";

  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-slate-600">
        <span>{label}</span>
        <span>
          {correct}/{total}問 ({rate}%)
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${rate}%` }}
        />
      </div>
    </div>
  );
}

export function ExamQuizClient() {
  const [category, setCategory] = useState<ExamCategory | "all">("all");
  const [subject, setSubject] = useState<ExamSubject | "all">("all");
  const [year, setYear] = useState<number | "all">("all");
  const [mode, setMode] = useState<"sequential" | "random">("sequential");
  const [started, setStarted] = useState(false);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [history, setHistory] = useState<AnswerRecord[]>([]);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  // 資格種別が変わったら科目をリセット
  const handleCategoryChange = (cat: ExamCategory | "all") => {
    setCategory(cat);
    setSubject("all");
  };

  // 選択中のカテゴリの科目リスト
  const subjectOptions: Array<{ value: ExamSubject | "all"; label: string }> =
    category === "all"
      ? [{ value: "all", label: "すべての科目" }]
      : [
          { value: "all", label: "すべての科目" },
          ...CATEGORY_SUBJECTS[category].map((s) => ({
            value: s as ExamSubject,
            label: SUBJECT_LABELS[s],
          })),
        ];

  // フィルター後の問題数プレビュー
  const previewCount = filterQuestions({
    category: category === "all" ? undefined : category,
    subject: subject === "all" ? undefined : subject,
    year: year === "all" ? undefined : year,
  }).length;

  const startQuiz = useCallback(() => {
    const qs = filterQuestions({
      category: category === "all" ? undefined : category,
      subject: subject === "all" ? undefined : subject,
      year: year === "all" ? undefined : year,
      shuffle: mode === "random",
    });
    setQuestions(qs);
    setIndex(0);
    setSelected(null);
    setShowExplanation(false);
    setAiExplanation(null);
    setStarted(true);
  }, [category, subject, year, mode]);

  const handleSelect = useCallback(
    (choice: string) => {
      if (selected !== null) return;
      const q = questions[index];
      if (!q) return;
      const isCorrect = choice === q.correctAnswer;
      const record: AnswerRecord = {
        questionId: q.id,
        selected: choice,
        correct: q.correctAnswer,
        isCorrect,
        timestamp: Date.now(),
      };
      saveAnswer(record);
      setHistory(loadHistory());
      setSelected(choice);
    },
    [selected, questions, index]
  );

  const fetchAiExplanation = useCallback(async () => {
    const q = questions[index];
    if (!q || aiLoading) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/quiz-explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionText: q.questionText,
          choices: q.choices,
          correctAnswer: q.correctAnswer,
          selectedAnswer: selected,
          relatedLaw: q.relatedLaw,
          fallbackExplanation: q.explanation,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { explanation: string };
        setAiExplanation(data.explanation);
      }
    } catch {
      // no-op; will show fallback explanation
    } finally {
      setAiLoading(false);
    }
  }, [questions, index, selected, aiLoading]);

  const goNext = () => {
    setIndex((i) => i + 1);
    setSelected(null);
    setShowExplanation(false);
    setAiExplanation(null);
  };

  const goPrev = () => {
    setIndex((i) => Math.max(0, i - 1));
    setSelected(null);
    setShowExplanation(false);
    setAiExplanation(null);
  };

  const resetHistory = () => {
    localStorage.removeItem(LS_KEY);
    setHistory([]);
  };

  const stats = calcStats(history);

  // --- Finished screen ---
  if (started && index >= questions.length) {
    const sessionCorrect = questions.filter((q) => {
      const rec = [...history].reverse().find((r) => r.questionId === q.id);
      return rec?.isCorrect;
    }).length;

    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="text-4xl font-bold text-amber-500">
            {sessionCorrect}/{questions.length}
          </p>
          <p className="mt-2 text-slate-600">
            正答率 {Math.round((sessionCorrect / questions.length) * 100)}%
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={startQuiz}
              className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600"
            >
              もう一度
            </button>
            <button
              type="button"
              onClick={() => setStarted(false)}
              className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              設定に戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Quiz screen ---
  if (started && questions.length > 0) {
    const q = questions[index];
    if (!q) return null;

    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        {/* Progress */}
        <div className="mb-4">
          <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
            <span>
              {index + 1} / {questions.length}問
            </span>
            <span>{q.subjectLabel} {q.year}年</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-amber-400 transition-all"
              style={{ width: `${((index + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-slate-500">問{q.questionNumber}</p>
          <p className="mt-2 text-base leading-relaxed text-slate-900">{q.questionText}</p>

          {/* Choices */}
          <div className="mt-4 space-y-2">
            {q.choices.map((choice) => {
              let btnClass =
                "flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition";
              if (selected === null) {
                btnClass += " border-slate-200 hover:border-amber-300 hover:bg-amber-50";
              } else if (choice.label === q.correctAnswer) {
                btnClass += " border-emerald-400 bg-emerald-50 text-emerald-900 font-semibold";
              } else if (choice.label === selected && selected !== q.correctAnswer) {
                btnClass += " border-red-400 bg-red-50 text-red-900";
              } else {
                btnClass += " border-slate-100 bg-slate-50 text-slate-500";
              }

              return (
                <button
                  key={choice.label}
                  type="button"
                  disabled={selected !== null}
                  className={btnClass}
                  onClick={() => handleSelect(choice.label)}
                >
                  <span className="shrink-0 font-bold">{choice.label}</span>
                  <span>{choice.text}</span>
                </button>
              );
            })}
          </div>

          {/* Result feedback */}
          {selected !== null && (
            <div
              className={`mt-4 rounded-xl p-3 text-sm ${
                selected === q.correctAnswer
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-red-50 text-red-800"
              }`}
            >
              {selected === q.correctAnswer ? (
                <span className="font-bold">正解！</span>
              ) : (
                <span>
                  <span className="font-bold">不正解。</span> 正答：{q.correctAnswer}
                </span>
              )}
            </div>
          )}

          {/* Explanation */}
          {selected !== null && (
            <div className="mt-3">
              {!showExplanation ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowExplanation(true);
                    void fetchAiExplanation();
                  }}
                  className="text-sm font-semibold text-amber-600 hover:text-amber-700"
                >
                  解説を見る ▼
                </button>
              ) : (
                <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-slate-700">
                  <p className="mb-1 font-semibold text-amber-800">解説</p>
                  {aiLoading ? (
                    <p className="animate-pulse text-slate-500">AI解説を生成中…</p>
                  ) : (
                    <p className="whitespace-pre-line leading-relaxed">
                      {aiExplanation ?? q.explanation ?? "解説は準備中です。"}
                    </p>
                  )}
                  {q.relatedLaw && (
                    <p className="mt-2 text-xs text-amber-700">
                      <span className="font-semibold">関連法令：</span>
                      {q.relatedLaw}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="mt-4 flex justify-between gap-2">
          <button
            type="button"
            onClick={goPrev}
            disabled={index === 0}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-30 hover:bg-slate-50"
          >
            ← 前の問題
          </button>
          {index < questions.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
            >
              次の問題 →
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              結果を見る
            </button>
          )}
        </div>
      </div>
    );
  }

  // --- Start screen ---
  return (
    <div className="px-4 py-5 sm:px-6">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Filters */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-slate-800">出題設定</h2>

          <div className="space-y-4">
            {/* Step 1: 資格種別 */}
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-500">① 資格種別</p>
              <div className="flex flex-wrap gap-2">
                <FilterBtn
                  label="すべての資格"
                  active={category === "all"}
                  onClick={() => handleCategoryChange("all")}
                />
                {ALL_CATEGORIES.map((cat) => (
                  <FilterBtn
                    key={cat}
                    label={CATEGORY_LABELS[cat]}
                    active={category === cat}
                    onClick={() => handleCategoryChange(cat)}
                  />
                ))}
              </div>
            </div>

            {/* Step 2: 科目 */}
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-500">② 科目</p>
              <div className="flex flex-wrap gap-2">
                {subjectOptions.map((opt) => (
                  <FilterBtn
                    key={opt.value}
                    label={opt.label}
                    active={subject === opt.value}
                    onClick={() => setSubject(opt.value)}
                  />
                ))}
              </div>
            </div>

            {/* Step 3: 年度 */}
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-500">③ 年度</p>
              <div className="flex flex-wrap gap-2">
                <FilterBtn
                  label="すべての年度"
                  active={year === "all"}
                  onClick={() => setYear("all")}
                />
                {AVAILABLE_YEARS.map((y) => (
                  <FilterBtn
                    key={y}
                    label={`${y}年`}
                    active={year === y}
                    onClick={() => setYear(y)}
                  />
                ))}
              </div>
            </div>

            {/* 出題順 */}
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-500">出題順</p>
              <div className="flex gap-2">
                <FilterBtn
                  label="順番通り"
                  active={mode === "sequential"}
                  onClick={() => setMode("sequential")}
                />
                <FilterBtn
                  label="ランダム"
                  active={mode === "random"}
                  onClick={() => setMode("random")}
                />
              </div>
            </div>
          </div>

          {/* 問題数プレビュー */}
          <div className="mt-4 rounded-lg bg-slate-50 px-4 py-2.5 text-sm text-slate-600">
            対象問題数：<span className="font-bold text-amber-600">{previewCount}問</span>
          </div>

          <button
            type="button"
            onClick={startQuiz}
            disabled={previewCount === 0}
            className="mt-4 w-full rounded-xl bg-amber-500 py-3 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-40"
          >
            クイズを開始する
          </button>
        </div>

        {/* Stats panel */}
        {stats.total > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800">
                解答履歴 ({stats.total}問)
              </h2>
              <button
                type="button"
                onClick={resetHistory}
                className="text-xs text-slate-400 hover:text-red-500"
              >
                リセット
              </button>
            </div>

            <StatRow label="全体" correct={stats.correct} total={stats.total} />

            {Object.entries(stats.byCategory).map(([code, data]) => (
              <div key={code} className="mt-3">
                <StatRow label={data.label} correct={data.correct} total={data.total} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
