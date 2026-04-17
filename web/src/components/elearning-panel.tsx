"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { elearningThemesCatalog } from "@/data/mock/elearning-themes-data";
import { elearningExtraThemes } from "@/data/mock/elearning-extra-themes";
import { elearningExtraQuestions } from "@/data/mock/elearning-extra-questions";
import { elearningIntroCourse } from "@/data/mock/elearning-intro-course";
import { elearningManufacturingThemes } from "@/data/mock/elearning-manufacturing-themes";
import { elearningHealthcareThemes } from "@/data/mock/elearning-healthcare-themes";
import { elearningTransportThemes } from "@/data/mock/elearning-transport-themes";
import { elearningForestryThemes } from "@/data/mock/elearning-forestry-themes";
import { elearningFoodThemes } from "@/data/mock/elearning-food-themes";
import { elearningRetailThemes } from "@/data/mock/elearning-retail-themes";
import type { LearningTheme as LearningThemeType } from "@/lib/types/operations";

// Merge extra questions into extra themes to expand from 3 to 10 questions per theme
const mergedExtraThemes: LearningThemeType[] = elearningExtraThemes.map((theme) => {
  const extras = elearningExtraQuestions.find((e) => e.themeId === theme.id);
  if (!extras) return theme;
  return { ...theme, questions: [...theme.questions, ...extras.questions] };
});

// 入門コースを先頭に配置、製造業・医療福祉・運輸・林業・食品・小売サービステーマを末尾に追加
const allThemes = [...elearningIntroCourse, ...elearningThemesCatalog, ...mergedExtraThemes, ...elearningManufacturingThemes, ...elearningHealthcareThemes, ...elearningTransportThemes, ...elearningForestryThemes, ...elearningFoodThemes, ...elearningRetailThemes];
import { ELearningEditorPanel } from "@/components/elearning-editor-panel";
import type { LearningTheme } from "@/lib/types/operations";

const STORAGE_KEY = "el-theme-overrides";

const WORKER_ATTRIBUTE_OPTIONS = ["すべて", "女性労働者", "高齢者", "外国人", "非正規", "若年", "一般"] as const;
type WorkerAttributeFilter = (typeof WORKER_ATTRIBUTE_OPTIONS)[number];

const COMPANY_SIZE_OPTIONS = ["全規模", "大企業", "中小企業", "個人事業主"] as const;
type CompanySizeFilter = (typeof COMPANY_SIZE_OPTIONS)[number];

const INDUSTRY_OPTIONS = ["すべて", "医療福祉", "製造業", "運輸", "林業", "食品", "小売・サービス"] as const;
type IndustryFilter = (typeof INDUSTRY_OPTIONS)[number];

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
  const [selectedWorkerAttribute, setSelectedWorkerAttribute] = useState<WorkerAttributeFilter>("すべて");
  const [selectedCompanySize, setSelectedCompanySize] = useState<CompanySizeFilter>("全規模");
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryFilter>("すべて");

  const themes = useMemo<LearningTheme[]>(() => {
    const withOverrides = allThemes.map((t) => overrides[t.id] ?? t);
    return withOverrides.filter((t) => {
      if (selectedWorkerAttribute !== "すべて") {
        const attrs = t.worker_attribute ?? ["一般"];
        if (!attrs.includes(selectedWorkerAttribute) && !attrs.includes("一般")) return false;
      }
      if (selectedCompanySize !== "全規模") {
        const size = t.company_size ?? "全規模";
        if (size !== "全規模" && size !== selectedCompanySize) return false;
      }
      if (selectedIndustry !== "すべて") {
        const ind = t.industry_detail;
        if (ind != null && ind !== selectedIndustry) return false;
      }
      return true;
    });
  }, [overrides, selectedWorkerAttribute, selectedCompanySize, selectedIndustry]);

  const selectedTheme = useMemo(() => {
    return themes.find((t) => t.id === themeId) ?? themes[0] ?? allThemes[0];
  }, [themes, themeId]);
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

  const isIntroCourse = themeId.startsWith("intro-");

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      {/* 初めての方へのバナー */}
      <div className="mb-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-sm font-bold">
          入門
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-emerald-800">初めての方はここから</p>
          <p className="text-xs text-emerald-700 leading-5">
            「初めての安全担当者」コース（4ステップ・全20問）で安全管理の基本を学べます。
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setThemeId("intro-step1");
            setAnswers({});
          }}
          className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
        >
          Step1から始める
        </button>
      </div>

      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900 sm:text-lg">Eラーニング</h2>
          <p className="mt-1 text-xs text-slate-600">
            32分野・計222問 ＋ 入門コース（20問）。事故・法改正・現場リスクの判断を短時間で反復できます。
          </p>
        </div>
        <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-800">
          全36テーマ
        </span>
      </div>
      {/* 属性・規模フィルタ */}
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-3">
        <div>
          <p className="text-xs font-semibold text-slate-700">対象属性</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {WORKER_ATTRIBUTE_OPTIONS.map((attr) => (
              <button
                key={attr}
                type="button"
                onClick={() => setSelectedWorkerAttribute(attr)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  selectedWorkerAttribute === attr
                    ? "bg-violet-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {attr}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-700">事業所規模</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {COMPANY_SIZE_OPTIONS.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setSelectedCompanySize(size)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  selectedCompanySize === size
                    ? "bg-teal-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-700">業種</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {INDUSTRY_OPTIONS.map((ind) => (
              <button
                key={ind}
                type="button"
                onClick={() => setSelectedIndustry(ind)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  selectedIndustry === ind
                    ? "bg-rose-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {ind}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3">
        {isIntroCourse && (
          <p className="mb-2 text-xs font-semibold text-emerald-700">
            ▶ 初めての安全担当者コース（Step1〜4）
          </p>
        )}
        <label className="block text-xs font-semibold text-slate-700" htmlFor="learning-theme">学習テーマ</label>
        <select
          id="learning-theme"
          className="mt-1 w-full max-w-xl rounded-lg border border-slate-300 px-3 py-2 text-sm"
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
