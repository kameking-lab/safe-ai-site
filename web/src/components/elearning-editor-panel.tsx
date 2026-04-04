"use client";

import { useState } from "react";
import type { LearningQuestion, LearningTheme } from "@/lib/types/operations";

type ELearningEditorPanelProps = {
  theme: LearningTheme;
  onSave: (updated: LearningTheme) => void;
  onCancel: () => void;
};

function emptyQuestion(themeId: string, index: number): LearningQuestion {
  return {
    id: `${themeId}-custom-${Date.now()}-${index}`,
    question: "",
    options: ["", "", ""],
    correctIndex: 0,
    explanation: "",
  };
}

export function ELearningEditorPanel({ theme, onSave, onCancel }: ELearningEditorPanelProps) {
  const [title, setTitle] = useState(theme.title);
  const [description, setDescription] = useState(theme.description);
  const [level, setLevel] = useState<LearningTheme["level"]>(theme.level);
  const [questions, setQuestions] = useState<LearningQuestion[]>(() =>
    theme.questions.map((q) => ({ ...q, options: [...q.options] }))
  );

  const updateQuestion = (i: number, patch: Partial<LearningQuestion>) => {
    setQuestions((prev) => {
      const next = [...prev];
      next[i] = { ...next[i]!, ...patch };
      return next;
    });
  };

  const updateOption = (qi: number, oi: number, value: string) => {
    setQuestions((prev) => {
      const next = [...prev];
      const opts = [...next[qi]!.options];
      opts[oi] = value;
      next[qi] = { ...next[qi]!, options: opts };
      return next;
    });
  };

  const addOption = (qi: number) => {
    setQuestions((prev) => {
      const next = [...prev];
      next[qi] = { ...next[qi]!, options: [...next[qi]!.options, ""] };
      return next;
    });
  };

  const removeOption = (qi: number, oi: number) => {
    setQuestions((prev) => {
      const next = [...prev];
      const opts = next[qi]!.options.filter((_, idx) => idx !== oi);
      const correctIndex = Math.min(next[qi]!.correctIndex, opts.length - 1);
      next[qi] = { ...next[qi]!, options: opts, correctIndex };
      return next;
    });
  };

  const addQuestion = () => {
    setQuestions((prev) => [...prev, emptyQuestion(theme.id, prev.length)]);
  };

  const removeQuestion = (i: number) => {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleSave = () => {
    onSave({ ...theme, title, description, level, questions });
  };

  return (
    <div className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-base font-bold text-amber-900 sm:text-lg">Eラーニング編集モード</h2>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
        >
          キャンセル
        </button>
      </div>

      {/* テーマ基本情報 */}
      <div className="rounded-xl border border-amber-200 bg-white p-3 space-y-3">
        <p className="text-xs font-bold text-slate-700">テーマ情報</p>
        <label className="block text-xs font-semibold text-slate-700">
          タイトル
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="block text-xs font-semibold text-slate-700">
          説明
          <textarea
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className="block text-xs font-semibold text-slate-700">
          レベル
          <select
            className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={level}
            onChange={(e) => setLevel(e.target.value as LearningTheme["level"])}
          >
            <option value="入門">入門</option>
            <option value="標準">標準</option>
            <option value="重点">重点</option>
          </select>
        </label>
      </div>

      {/* 問題一覧 */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-slate-700">問題（{questions.length}問）</p>
        {questions.map((q, qi) => (
          <div key={q.id} className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-600">問題 {qi + 1}</span>
              <button
                type="button"
                onClick={() => removeQuestion(qi)}
                disabled={questions.length <= 1}
                className="rounded border border-rose-200 px-2 py-0.5 text-[10px] font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-40"
              >
                削除
              </button>
            </div>
            <label className="block text-xs font-semibold text-slate-700">
              問題文
              <textarea
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                rows={2}
                value={q.question}
                onChange={(e) => updateQuestion(qi, { question: e.target.value })}
              />
            </label>
            <div>
              <p className="text-xs font-semibold text-slate-700">選択肢（正解を選択）</p>
              <div className="mt-1 space-y-1">
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${q.id}`}
                      checked={q.correctIndex === oi}
                      onChange={() => updateQuestion(qi, { correctIndex: oi })}
                      className="shrink-0"
                    />
                    <input
                      className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-1 text-sm"
                      value={opt}
                      onChange={(e) => updateOption(qi, oi, e.target.value)}
                      placeholder={`選択肢 ${oi + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeOption(qi, oi)}
                      disabled={q.options.length <= 2}
                      className="shrink-0 rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500 hover:text-rose-600 disabled:opacity-40"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => addOption(qi)}
                className="mt-1 text-[11px] font-semibold text-emerald-700 underline"
              >
                ＋ 選択肢を追加
              </button>
            </div>
            <label className="block text-xs font-semibold text-slate-700">
              解説
              <textarea
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                rows={2}
                value={q.explanation}
                onChange={(e) => updateQuestion(qi, { explanation: e.target.value })}
              />
            </label>
          </div>
        ))}
        <button
          type="button"
          onClick={addQuestion}
          className="w-full rounded-xl border-2 border-dashed border-emerald-300 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
        >
          ＋ 問題を追加
        </button>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
        >
          保存（ブラウザに記録）
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}
