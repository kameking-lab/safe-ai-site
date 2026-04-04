"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { elearningThemesCatalog } from "@/data/mock/elearning-themes-data";
import type { LearningTheme } from "@/lib/types/operations";

const themes: LearningTheme[] = elearningThemesCatalog;

export function ELearningPanel() {
  const [themeId, setThemeId] = useState(themes[0].id);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const selectedTheme = useMemo(() => themes.find((theme) => theme.id === themeId) ?? themes[0], [themeId]);
  const score = selectedTheme.questions.reduce((sum, q) => sum + (answers[q.id] === q.correctIndex ? 1 : 0), 0);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900 sm:text-lg">Eラーニング</h2>
          <p className="mt-1 text-xs text-slate-600">
            12分野×各10問（計120問）。事故・法改正・現場リスクの判断を短時間で反復できます。
          </p>
        </div>
        <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-800">
          12×10問
        </span>
      </div>
      <div className="mt-3">
        <label className="block text-xs font-semibold text-slate-700" htmlFor="learning-theme">学習テーマ</label>
        <select
          id="learning-theme"
          className="mt-1 max-w-xl rounded-lg border border-slate-300 px-3 py-2 text-sm"
          onChange={(event) => {
            setThemeId(event.target.value);
            setAnswers({});
          }}
          value={themeId}
        >
          {themes.map((theme) => (
            <option key={theme.id} value={theme.id}>
              {theme.title}（{theme.sourceType} / {theme.level}）
            </option>
          ))}
        </select>
      </div>
      <article className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
        <h3 className="font-semibold text-slate-900">{selectedTheme.title}</h3>
        <p className="mt-1 text-xs text-slate-600">{selectedTheme.description}</p>
      </article>
      <div className="mt-3 space-y-3">
        {selectedTheme.questions.map((question, index) => (
          <div key={question.id} className="rounded-lg border border-slate-200 p-3">
            <p className="text-sm font-semibold text-slate-900">{index + 1}. {question.question}</p>
            <div className="mt-2 space-y-1 text-xs">
              {question.options.map((option, optionIndex) => (
                <label key={option} className="block rounded border border-slate-200 px-2 py-1">
                  <input
                    checked={answers[question.id] === optionIndex}
                    name={question.id}
                    onChange={() => setAnswers((prev) => ({ ...prev, [question.id]: optionIndex }))}
                    type="radio"
                  />{" "}
                  {option}
                </label>
              ))}
            </div>
            {answers[question.id] != null && (
              <p className="mt-2 text-xs text-slate-700">解説: {question.explanation}</p>
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800">学習チェック: {score} / {selectedTheme.questions.length}</p>
        <Link className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white" href="/ky">
          KY用紙へ
        </Link>
      </div>
    </section>
  );
}
