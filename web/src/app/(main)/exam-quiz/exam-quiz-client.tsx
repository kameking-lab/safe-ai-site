"use client";

import { useCallback, useState } from "react";
import { filterQuestions, AVAILABLE_YEARS, EXAM_CATEGORIES } from "@/data/exam-questions";
import type { ExamQuestion } from "@/data/exam-questions";

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
  if (history.length === 0) return { total: 0, correct: 0, rate: 0, byCert: {} };

  const latestByQuestion = new Map<string, AnswerRecord>();
  for (const rec of history) {
    latestByQuestion.set(rec.questionId, rec);
  }

  const records = Array.from(latestByQuestion.values());
  const correct = records.filter((r) => r.isCorrect).length;
  const total = records.length;
  const rate = total > 0 ? Math.round((correct / total) * 100) : 0;

  // Group by certification prefix in questionId
  const byCert: Record<string, { correct: number; total: number }> = {};
  for (const rec of records) {
    const parts = rec.questionId.split("-");
    const certKey = parts.slice(0, 2).join("-");
    if (!byCert[certKey]) byCert[certKey] = { correct: 0, total: 0 };
    byCert[certKey].total++;
    if (rec.isCorrect) byCert[certKey].correct++;
  }

  return { total, correct, rate, byCert };
}

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

const CATEGORY_LABELS: Record<string, string> = {
  consultant: "安全コンサルタント",
  health: "衛生管理者",
  boiler: "ボイラー・圧力容器",
  crane: "クレーン・デリック",
  special: "特殊作業",
  radiation: "放射線・X線",
  environment: "作業環境測定",
};

type DifficultyLevel = "入門" | "中級" | "上級" | "最上級";

const DIFFICULTY_LEVEL: Record<string, DifficultyLevel> = {
  health: "入門",
  special: "入門",
  boiler: "中級",
  crane: "中級",
  radiation: "中級",
  environment: "中級",
  consultant: "最上級",
};

const DIFFICULTY_ORDER: DifficultyLevel[] = ["入門", "中級", "上級", "最上級"];

const DIFFICULTY_BADGE_CLASS: Record<DifficultyLevel, string> = {
  入門: "bg-green-100 text-green-700",
  中級: "bg-yellow-100 text-yellow-700",
  上級: "bg-orange-100 text-orange-700",
  最上級: "bg-red-100 text-red-700",
};

const DIFFICULTY_QUICK: Array<{ level: DifficultyLevel; certId: string; label: string }> = [
  { level: "入門", certId: "health-2nd", label: "第二種衛生管理者" },
  { level: "中級", certId: "boiler-2nd", label: "二級ボイラー技士" },
  { level: "上級", certId: "health-1st", label: "第一種衛生管理者" },
  { level: "最上級", certId: "anzen-consultant", label: "労働安全コンサルタント" },
];

export function ExamQuizClient() {
  const [certId, setCertId] = useState<string>("health-2nd");
  const [subject, setSubject] = useState<string>("all");
  const [year, setYear] = useState<number | "all">("all");
  const [mode, setMode] = useState<"sequential" | "random">("sequential");
  const [started, setStarted] = useState(false);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [history, setHistory] = useState<AnswerRecord[]>(() => loadHistory());

  const selectedCert = EXAM_CATEGORIES.find((c) => c.id === certId);

  const startQuiz = useCallback(() => {
    const qs = filterQuestions({
      certificationId: certId === "all" ? undefined : certId,
      subject: subject === "all" ? undefined : subject,
      year: year === "all" ? undefined : year,
      shuffle: mode === "random",
    });
    setQuestions(qs);
    setIndex(0);
    setSelected(null);
    setShowExplanation(false);
    setStarted(true);
  }, [certId, subject, year, mode]);

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

  const goNext = () => {
    setIndex((i) => i + 1);
    setSelected(null);
    setShowExplanation(false);
  };

  const goPrev = () => {
    setIndex((i) => Math.max(0, i - 1));
    setSelected(null);
    setShowExplanation(false);
  };

  const resetHistory = () => {
    localStorage.removeItem(LS_KEY);
    setHistory([]);
  };

  const stats = calcStats(history);

  // Group certifications by category, sorted by difficulty (入門→最上級)
  const categories = Object.entries(CATEGORY_LABELS)
    .map(([key, label]) => ({
      key,
      label,
      difficulty: DIFFICULTY_LEVEL[key] ?? ("上級" as DifficultyLevel),
      certs: EXAM_CATEGORIES.filter((c) => c.category === key),
    }))
    .sort(
      (a, b) =>
        DIFFICULTY_ORDER.indexOf(a.difficulty) - DIFFICULTY_ORDER.indexOf(b.difficulty)
    );

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
                  onClick={() => setShowExplanation(true)}
                  className="text-sm font-semibold text-amber-600 hover:text-amber-700"
                >
                  解説を見る ▼
                </button>
              ) : (
                <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-slate-700">
                  <p className="mb-1 font-semibold text-amber-800">解説</p>
                  <p className="whitespace-pre-line leading-relaxed">
                    {q.explanation ?? "解説は準備中です。"}
                  </p>
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
            {/* Difficulty quick-select */}
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-500">
                難易度クイック選択（入門から始めましょう）
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {DIFFICULTY_QUICK.map(({ level, certId: qCertId, label }) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => { setCertId(qCertId); setSubject("all"); }}
                    className={`flex flex-col items-center gap-1 rounded-xl border py-2.5 px-2 text-center transition ${
                      certId === qCertId
                        ? "border-amber-400 bg-amber-50 ring-1 ring-amber-300"
                        : "border-slate-200 bg-white hover:border-amber-200 hover:bg-amber-50"
                    }`}
                  >
                    <span className={`text-xs rounded-full px-2 py-0.5 font-semibold ${DIFFICULTY_BADGE_CLASS[level]}`}>
                      {level}
                    </span>
                    <span className="text-[10px] text-slate-600 leading-tight">{label}</span>
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[10px] text-slate-400">
                ※ 初めての方は「入門」からスタートしてください
              </p>
            </div>

            {/* Certification selector */}
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-500">資格（詳細選択）</p>
              <select
                value={certId}
                onChange={(e) => { setCertId(e.target.value); setSubject("all"); }}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-amber-400 focus:outline-none"
              >
                <option value="all">すべての資格（混合）</option>
                {categories.map(
                  ({ key, label, difficulty, certs }) =>
                    certs.length > 0 && (
                      <optgroup key={key} label={`${label}（${difficulty}）`}>
                        {certs.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </optgroup>
                    )
                )}
              </select>
            </div>

            {/* Subject filter (only shown when a specific cert is selected) */}
            {selectedCert && (
              <div>
                <p className="mb-2 text-xs font-semibold text-slate-500">科目</p>
                <div className="flex flex-wrap gap-2">
                  <FilterBtn
                    label="すべての科目"
                    active={subject === "all"}
                    onClick={() => setSubject("all")}
                  />
                  {selectedCert.subjects.map((s) => (
                    <FilterBtn
                      key={s.id}
                      label={s.label}
                      active={subject === s.id}
                      onClick={() => setSubject(s.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="mb-2 text-xs font-semibold text-slate-500">年度</p>
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

          <button
            type="button"
            onClick={startQuiz}
            className="mt-5 w-full rounded-xl bg-amber-500 py-3 text-sm font-bold text-white hover:bg-amber-600"
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

            {Object.entries(stats.byCert).map(([certKey, data]) => {
              const cert = EXAM_CATEGORIES.find(
                (c) => c.id.startsWith(certKey) || certKey.startsWith(c.id.split("-")[0] ?? "")
              );
              return (
                <div key={certKey} className="mt-3">
                  <StatRow
                    label={cert?.shortName ?? certKey}
                    correct={data.correct}
                    total={data.total}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
