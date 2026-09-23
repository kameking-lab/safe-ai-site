"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import quizJson from "@/data/safety-seminars/safety-management-basics-osh-law-quiz.json";
import sourcesJson from "@/data/safety-seminars/safety-management-basics-osh-law-source-registry.json";
import type {
  TrainingArticleRef,
  TrainingQuiz,
  TrainingQuizQuestion,
  TrainingSource,
} from "@/data/safety-seminars/types";

type QuizState = {
  queue: number[];
  position: number;
  responses: Record<number, number>;
  complete: boolean;
};

const quiz = quizJson as TrainingQuiz;
const sources = sourcesJson as TrainingSource[];
const sourceById = new Map(sources.map((source) => [source.sourceId, source]));

function initialState(): QuizState {
  return {
    queue: quiz.questions.map((_, index) => index),
    position: 0,
    responses: {},
    complete: false,
  };
}

function isArticleRef(
  ref: TrainingQuizQuestion["refs"][number],
): ref is TrainingArticleRef {
  return "article" in ref;
}

function refLink(ref: TrainingQuizQuestion["refs"][number]) {
  if (isArticleRef(ref)) {
    const useInternalNavi = ref.article.includes("の") && Boolean(ref.naviPath);
    return {
      href: useInternalNavi ? ref.naviPath! : ref.egovUrl,
      label: `${ref.lawShort} ${ref.article}`,
      external: !useInternalNavi,
    };
  }
  const source = sourceById.get(ref.sourceId);
  return {
    href: source?.url ?? "#sources-title",
    label: source?.title ?? ref.locator,
    external: Boolean(source),
  };
}

export function SeminarQuiz({ courseId }: { courseId: string }) {
  const storageKey = `seminar-quiz:${courseId}:${quiz.version}`;
  const [state, setState] = useState<QuizState>(initialState);
  const [savedState, setSavedState] = useState<QuizState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const feedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as QuizState;
        if (
          Array.isArray(parsed.queue) &&
          parsed.queue.length > 0 &&
          Number.isInteger(parsed.position) &&
          parsed.position >= 0 &&
          parsed.position < parsed.queue.length &&
          parsed.responses &&
          typeof parsed.responses === "object"
        ) {
          setSavedState(parsed);
        }
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    } finally {
      setLoaded(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!loaded || savedState) return;
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  }, [loaded, savedState, state, storageKey]);

  const questionIndex = state.queue[state.position] ?? 0;
  const question = quiz.questions[questionIndex];
  const selectedIndex = state.responses[questionIndex];
  const answered = selectedIndex !== undefined;
  const incorrect = useMemo(
    () => state.queue.filter((index) => state.responses[index] !== quiz.questions[index]?.correctIndex),
    [state.queue, state.responses],
  );
  const score = state.queue.length - incorrect.length;

  useEffect(() => {
    if (answered || state.complete) feedbackRef.current?.focus();
  }, [answered, questionIndex, state.complete]);

  const clearAndStart = () => {
    window.localStorage.removeItem(storageKey);
    setSavedState(null);
    setState(initialState());
  };

  if (!question) return null;

  if (savedState) {
    const savedAnswered = Object.keys(savedState.responses).length;
    return (
      <div className="mt-5 rounded-2xl border border-teal-300 bg-white p-5 dark:border-teal-700 dark:bg-slate-900">
        <p className="font-black text-slate-950 dark:text-white">
          保存済みの進捗があります（{Math.min(savedAnswered, 5)}/5問）
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              setState(savedState);
              setSavedState(null);
            }}
            className="min-h-11 rounded-xl bg-teal-700 px-5 py-3 font-black text-white hover:bg-teal-800"
          >
            続きから
          </button>
          <button
            type="button"
            onClick={clearAndStart}
            className="min-h-11 rounded-xl border border-slate-400 px-5 py-3 font-black text-slate-900 dark:border-slate-600 dark:text-white"
          >
            最初から
          </button>
        </div>
      </div>
    );
  }

  if (state.complete) {
    return (
      <div className="mt-5 rounded-2xl border border-teal-300 bg-white p-5 dark:border-teal-700 dark:bg-slate-900">
        <div role="status" tabIndex={-1} ref={feedbackRef} className="focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-400">
          <p className="text-sm font-bold text-teal-800 dark:text-teal-200">結果</p>
          <p className="mt-1 text-3xl font-black text-slate-950 dark:text-white">
            {score}/{state.queue.length}問 正解
          </p>
        </div>
        {incorrect.length > 0 ? (
          <div className="mt-4">
            <h3 className="font-black text-slate-950 dark:text-white">確認する問題</h3>
            <ol className="mt-2 list-decimal space-y-1 pl-6 text-sm text-slate-700 dark:text-slate-200">
              {incorrect.map((index) => <li key={quiz.questions[index]?.id}>{quiz.questions[index]?.question}</li>)}
            </ol>
          </div>
        ) : (
          <p className="mt-4 font-bold text-teal-800 dark:text-teal-200">全問正解です。</p>
        )}
        <div className="mt-5 flex flex-wrap gap-3">
          {incorrect.length > 0 ? (
            <button
              type="button"
              onClick={() => setState({ queue: incorrect, position: 0, responses: {}, complete: false })}
              className="min-h-11 rounded-xl bg-teal-700 px-5 py-3 font-black text-white hover:bg-teal-800"
            >
              間違えた問題だけ再挑戦
            </button>
          ) : null}
          <button
            type="button"
            onClick={clearAndStart}
            className="min-h-11 rounded-xl border border-slate-400 px-5 py-3 font-black text-slate-900 dark:border-slate-600 dark:text-white"
          >
            最初から
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-2xl border border-slate-300 bg-white p-4 sm:p-5 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-black text-teal-800 dark:text-teal-200">
          問題 {state.position + 1}/{state.queue.length}
        </p>
        <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
          全体 {Object.keys(state.responses).length}/5問
        </p>
      </div>
      <div
        role="progressbar"
        aria-label="確認クイズの進捗"
        aria-valuemin={0}
        aria-valuemax={5}
        aria-valuenow={Math.min(Object.keys(state.responses).length, 5)}
        className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
      >
        <div
          className="h-full bg-teal-600 transition-[width] motion-reduce:transition-none"
          style={{ width: `${Math.min(100, Object.keys(state.responses).length * 20)}%` }}
        />
      </div>
      <fieldset className="mt-5">
        <legend className="text-lg font-black leading-7 text-slate-950 dark:text-white">
          {question.question}
        </legend>
        <div className="mt-4 grid gap-3" role="radiogroup" aria-label={`${state.position + 1}問目の選択肢`}>
          {question.choices.map((choice, index) => {
            const selected = selectedIndex === index;
            const correct = answered && question.correctIndex === index;
            const stateLabel = correct ? "○ 正解" : selected ? "× 不正解" : "— 未選択";
            return (
              <div key={choice} className={`rounded-xl border ${correct ? "border-teal-600 bg-teal-50 dark:bg-teal-950/60" : selected ? "border-rose-600 bg-rose-50 dark:bg-rose-950/50" : "border-slate-300 dark:border-slate-600"}`}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={answered}
                  onClick={() => setState((current) => ({
                    ...current,
                    responses: { ...current.responses, [questionIndex]: index },
                  }))}
                  className="flex min-h-11 w-full items-start gap-3 rounded-xl px-4 py-3 text-left font-bold text-slate-950 disabled:cursor-default dark:text-white"
                >
                  <span aria-hidden="true" className="shrink-0">{String.fromCharCode(65 + index)}.</span>
                  <span>{choice}</span>
                </button>
                {answered ? (
                  <p className="border-t border-current/15 px-4 py-3 text-sm leading-6 text-slate-800 dark:text-slate-100">
                    <strong>{stateLabel}：</strong>{question.choiceRationales[index]}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </fieldset>
      {answered ? (
        <div
          ref={feedbackRef}
          role="status"
          tabIndex={-1}
          className="mt-5 rounded-xl bg-slate-100 p-4 text-sm leading-6 text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-400 dark:bg-slate-800 dark:text-white"
        >
          <p className="font-black">
            {selectedIndex === question.correctIndex ? "○ 正解です" : "× 不正解です"}
          </p>
          <p className="mt-1">{question.explanation}</p>
          <div className="mt-3 flex flex-wrap gap-2" aria-label="この問題の根拠">
            {question.refs.map((ref) => {
              const link = refLink(ref);
              return (
                <a
                  key={`${ref.sourceId}-${link.href}`}
                  href={link.href}
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noopener noreferrer" : undefined}
                  className="inline-flex min-h-11 items-center rounded-full border border-teal-700 px-3 font-black text-teal-800 underline underline-offset-4 dark:border-teal-300 dark:text-teal-200"
                >
                  根拠: {link.label}
                </a>
              );
            })}
          </div>
        </div>
      ) : null}
      {answered ? (
        <button
          type="button"
          onClick={() => setState((current) => current.position === current.queue.length - 1
            ? { ...current, complete: true }
            : { ...current, position: current.position + 1 })}
          className="mt-5 min-h-11 rounded-xl bg-teal-700 px-5 py-3 font-black text-white hover:bg-teal-800"
        >
          {state.position === state.queue.length - 1 ? "結果を見る" : "次の問題"}
        </button>
      ) : null}
    </div>
  );
}
