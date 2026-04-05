"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { elearningThemesCatalog } from "@/data/mock/elearning-themes-data";
import { elearningExtraThemes } from "@/data/mock/elearning-extra-themes";
import { elearningExtraQuestions } from "@/data/mock/elearning-extra-questions";
import type { LearningTheme as LearningThemeType } from "@/lib/types/operations";

// Merge extra questions into extra themes to expand from 3 to 10 questions per theme
const mergedExtraThemes: LearningThemeType[] = elearningExtraThemes.map((theme) => {
  const extras = elearningExtraQuestions.find((e) => e.themeId === theme.id);
  if (!extras) return theme;
  return { ...theme, questions: [...theme.questions, ...extras.questions] };
});

const allThemes = [...elearningThemesCatalog, ...mergedExtraThemes];
import { ELearningEditorPanel } from "@/components/elearning-editor-panel";
import type { LearningTheme } from "@/lib/types/operations";

const STORAGE_KEY = "el-theme-overrides";

function loadOverrides(): Record<string, LearningTheme> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, LearningTheme>;
  } catch {
    return {};
  }
}

function saveOverrides(overrides: Record<string, LearningTheme>) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

export function ELearningPanel() {
  const [overrides, setOverrides] = useState<Record<string, LearningTheme>>(loadOverrides);
  const [themeId, setThemeId] = useState(allThemes[0].id);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [editMode, setEditMode] = useState(false);

  const themes = useMemo<LearningTheme[]>(
    () => allThemes.map((t) => overrides[t.id] ?? t),
    [overrides]
  );

  const selectedTheme = useMemo(() => themes.find((t) => t.id === themeId) ?? themes[0], [themes, themeId]);
  const score = selectedTheme.questions.reduce(
    (sum, q) => sum + (answers[q.id] === q.correctIndex ? 1 : 0),
    0
  );

  const handleSaveEdit = (updated: LearningTheme) => {
    const next = { ...overrides, [updated.id]: updated };
    setOverrides(next);
    saveOverrides(next);
    setEditMode(false);
  };

  const handleResetTheme = () => {
    const next = { ...overrides };
    delete next[themeId];
    setOverrides(next);
    saveOverrides(next);
  };

  if (editMode) {
    return (
      <ELearningEditorPanel
        theme={selectedTheme}
        onSave={handleSaveEdit}
        onCancel={() => setEditMode(false)}
      />
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900 sm:text-lg">Eラーニング</h2>
          <p className="mt-1 text-xs text-slate-600">
            20分野・計102問。事故・法改正・現場リスクの判断を短時間で反復できます。
          </p>
        </div>
        <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-800">
          20分野・102問
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
            setEditMode(false);
          }}
          value={themeId}
        >
          {themes.map((theme) => (
            <option key={theme.id} value={theme.id}>
              {theme.title}（{theme.sourceType} / {theme.level}）
              {overrides[theme.id] ? " ✎" : ""}
            </option>
          ))}
        </select>
      </div>
      <article className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-slate-900">{selectedTheme.title}</h3>
            <p className="mt-1 text-xs text-slate-600">{selectedTheme.description}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <button
              type="button"
              onClick={() => setEditMode(true)}
              className="rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-100"
            >
              ✎ 編集
            </button>
            {overrides[themeId] && (
              <button
                type="button"
                onClick={handleResetTheme}
                className="text-[10px] text-slate-400 underline hover:text-rose-600"
              >
                初期化
              </button>
            )}
          </div>
        </div>
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
