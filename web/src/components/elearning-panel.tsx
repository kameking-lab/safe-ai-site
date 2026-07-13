"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, Pencil } from "lucide-react";
import { recordThemeAttempt } from "@/lib/elearning/progress";
import { buildQuizConclusion } from "@/lib/elearning/learning-conclusion";
import { SAFETY_TONE } from "@/lib/design/safety-tone";
import { TONE_DEFAULT_ICON } from "@/components/ui/status-badge";
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
import { elearningHazardTypesTheme } from "@/data/mock/elearning-hazard-types-theme";
import type { LearningTheme as LearningThemeType } from "@/lib/types/operations";
import { getSubcategories, INDUSTRY_SUBCATEGORIES, type IndustryParent } from "@/data/industry-subcategories";

// Merge extra questions into extra themes to expand from 3 to 10 questions per theme
const mergedExtraThemes: LearningThemeType[] = elearningExtraThemes.map((theme) => {
  const extras = elearningExtraQuestions.find((e) => e.themeId === theme.id);
  if (!extras) return theme;
  return { ...theme, questions: [...theme.questions, ...extras.questions] };
});

// 入門コースを先頭に配置、製造業・医療福祉・運輸・林業・食品・小売サービステーマを末尾に追加
const allThemes = [...elearningIntroCourse, ...elearningHazardTypesTheme, ...elearningThemesCatalog, ...mergedExtraThemes, ...elearningManufacturingThemes, ...elearningHealthcareThemes, ...elearningTransportThemes, ...elearningForestryThemes, ...elearningFoodThemes, ...elearningRetailThemes];
import { ELearningEditorPanel } from "@/components/elearning-editor-panel";
import { EasyJapaneseText } from "@/components/easy-japanese-text";
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
  const [selectedSubId, setSelectedSubId] = useState<string>("");

  // 柱0: 結論カード「続きから」「入門から始める」の行き先 (?theme=<id>#el-quiz) を受け取る。
  // テーマIDが実在する時だけ反映し、回答はリセットして再挑戦から始める。
  const searchParams = useSearchParams();
  const themeParam = searchParams.get("theme");
  const lastAppliedThemeParamRef = useRef<string | null>(null);
  useEffect(() => {
    if (!themeParam || lastAppliedThemeParamRef.current === themeParam) return;
    lastAppliedThemeParamRef.current = themeParam;
    if (!allThemes.some((t) => t.id === themeParam)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- URL(外部システム)からの初期化として正当
    setThemeId(themeParam);
    setAnswers({});
    setEditMode(false);
  }, [themeParam]);

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
      if (selectedSubId) {
        const sub = INDUSTRY_SUBCATEGORIES.find((s) => s.id === selectedSubId);
        if (sub) {
          const text = `${t.title} ${t.description ?? ""}`.toLowerCase();
          if (!sub.keywords.some((kw) => text.includes(kw.toLowerCase()))) return false;
        }
      }
      return true;
    });
  }, [overrides, selectedWorkerAttribute, selectedCompanySize, selectedIndustry, selectedSubId]);

  const selectedTheme = useMemo(() => {
    return themes.find((t) => t.id === themeId) ?? themes[0] ?? allThemes[0];
  }, [themes, themeId]);
  const score = selectedTheme.questions.reduce(
    (sum, q) => sum + (answers[q.id] === q.correctIndex ? 1 : 0),
    0
  );

  // P0-014 (usability-audit-day3): 回答数が selectedTheme の全問数に到達した
  // 時点で localStorage に進捗 record を保存。誤答 question ID リストも
  // 一緒に記録し、復習リコメンドや進捗ボードで参照できるようにする。
  const lastSavedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const totalQuestions = selectedTheme.questions.length;
    if (totalQuestions === 0) return;
    const answered = selectedTheme.questions.filter((q) => answers[q.id] != null);
    if (answered.length < totalQuestions) return;
    // 同一 themeId × 同一 answers 状態で 2 回保存しないよう key で重複排除
    const fingerprint = `${selectedTheme.id}|${selectedTheme.questions
      .map((q) => answers[q.id])
      .join(",")}`;
    if (lastSavedKeyRef.current === fingerprint) return;
    lastSavedKeyRef.current = fingerprint;
    const wrong = selectedTheme.questions
      .filter((q) => answers[q.id] !== q.correctIndex)
      .map((q) => q.id);
    recordThemeAttempt({
      themeId: selectedTheme.id,
      themeTitle: selectedTheme.title,
      totalQuestions,
      correctCount: score,
      wrongQuestionIds: wrong,
    });
  }, [selectedTheme, answers, score]);

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
    <section
      id="el-quiz"
      className="scroll-mt-20 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
    >
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
                onClick={() => { setSelectedIndustry(ind); setSelectedSubId(""); }}
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
          {selectedIndustry !== "すべて" && getSubcategories(selectedIndustry as IndustryParent).length > 0 && (
            <div className="mt-2">
              <label className="text-xs font-semibold text-slate-700" htmlFor="el-subindustry">
                細分業種
              </label>
              <select
                id="el-subindustry"
                value={selectedSubId}
                onChange={(e) => setSelectedSubId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-800 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              >
                <option value="">{selectedIndustry}（すべて）</option>
                {getSubcategories(selectedIndustry as IndustryParent).map((sub) => (
                  <option key={sub.id} value={sub.id}>{sub.label}</option>
                ))}
              </select>
            </div>
          )}
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
              {overrides[theme.id] ? "（編集済）" : ""}
            </option>
          ))}
        </select>
      </div>
      <article className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-slate-900">{selectedTheme.title}</h3>
            <p className="mt-1 text-xs text-slate-600"><EasyJapaneseText>{selectedTheme.description}</EasyJapaneseText></p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <button
              type="button"
              onClick={() => setEditMode(true)}
              className="rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-100"
            >
              <Pencil className="mr-1 inline h-3 w-3 align-[-2px]" aria-hidden="true" />編集
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
            <p className="text-sm font-semibold text-slate-900">{index + 1}. <EasyJapaneseText>{question.question}</EasyJapaneseText></p>
            <div className="mt-2 space-y-1 text-xs">
              {question.options.map((option, optionIndex) => (
                <label
                  key={option}
                  className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded border border-slate-200 px-2.5 py-1.5 hover:bg-slate-50"
                >
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
              <p className="mt-2 text-xs text-slate-700">解説: <EasyJapaneseText>{question.explanation}</EasyJapaneseText></p>
            )}
          </div>
        ))}
      </div>
      {/* 柱0: 採点の結論ストリップ — 回答のこり(青)→全問正答(緑)/誤答N問(黄=解説確認→再挑戦) */}
      {(() => {
        const answered = selectedTheme.questions.filter((q) => answers[q.id] != null).length;
        const quiz = buildQuizConclusion({
          total: selectedTheme.questions.length,
          answered,
          correct: score,
        });
        const t = SAFETY_TONE[quiz.tone];
        const QuizIcon = TONE_DEFAULT_ICON[quiz.tone];
        return (
          <div
            role="status"
            aria-label={`採点: ${quiz.title}${quiz.value != null ? ` ${quiz.value}${quiz.unit ?? ""}` : ""}`}
            className={`mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border-2 p-3 ${t.soft}`}
          >
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <QuizIcon className={`h-7 w-7 shrink-0 ${t.icon}`} aria-hidden="true" />
              <div className="flex flex-wrap items-baseline gap-x-1.5">
                {quiz.value != null && (
                  <span className={`text-3xl font-bold leading-none ${t.text}`}>
                    {quiz.value}
                    {quiz.unit && <span className="ml-0.5 text-sm font-bold">{quiz.unit}</span>}
                  </span>
                )}
                <span className="text-base font-bold">{quiz.title}</span>
                {quiz.tone === "warning" && (
                  <span className="w-full text-xs opacity-80 sm:w-auto">
                    解説を確認して再挑戦
                  </span>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {quiz.tone === "warning" && (
                <button
                  type="button"
                  onClick={() => setAnswers({})}
                  className={`inline-flex min-h-[44px] items-center gap-1 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm transition hover:opacity-90 ${t.solid}`}
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  もう一度
                </button>
              )}
              <Link
                className={
                  "inline-flex min-h-[44px] items-center rounded-xl px-4 py-2.5 text-sm font-bold transition " +
                  (quiz.tone === "safe"
                    ? `shadow-sm hover:opacity-90 ${t.solid}`
                    : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50")
                }
                href="/ky"
              >
                KY用紙へ
              </Link>
            </div>
          </div>
        );
      })()}
    </section>
  );
}
