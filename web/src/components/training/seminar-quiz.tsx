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

function isQuizState(value: unknown): value is QuizState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<QuizState>;
  const { queue, position, responses, complete } = candidate;
  if (
    !Array.isArray(queue) || queue.length === 0 ||
    new Set(queue).size !== queue.length ||
    queue.some((index) => !Number.isInteger(index) || index < 0 || index >= quiz.questions.length) ||
    !Number.isInteger(position) || position! < 0 || position! >= queue.length ||
    !responses || typeof responses !== "object" || Array.isArray(responses) ||
    typeof complete !== "boolean"
  ) return false;
  if (!Object.entries(responses).every(([key, choice]) => {
    const index = Number(key);
    return String(index) === key && queue.includes(index) && Number.isInteger(choice) &&
      choice >= 0 && choice < quiz.questions[index]!.choices.length;
  })) return false;
  return queue.every((index, offset) =>
    (offset < position! || complete) ? responses[index] !== undefined : offset > position! ? responses[index] === undefined : true,
  );
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
        const parsed: unknown = JSON.parse(raw);
        if (isQuizState(parsed) && Object.keys(parsed.responses).length > 0) {
          setSavedState(parsed);
        }
      }
    } catch {
      // 保存を拒否するブラウザーでも、その場でクイズを続けられる。
    } finally {
      setLoaded(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!loaded || savedState) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // 容量超過や保存制限は、採点や次問への移動を妨げない。
    }
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
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // 保存状態を消せなくても、現在の画面は初期化する。
    }
    setSavedState(null);
    setState(initialState());
  };

  if (!question) return null;

  if (savedState) {
    const savedAnswered = Object.keys(savedState.responses).length;
    return (
      <div className="mt-5 rounded-2xl border border-teal-300 bg-white p-5 dark:border-teal-500 dark:bg-slate-900">
        <p className="font-black text-slate-950 dark:text-white">
          保存済みの進捗があります（{savedAnswered}/{savedState.queue.length}問）
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              setState(savedState);
              setSavedState(null);
            }}
            className="min-h-11 rounded-xl bg-teal-700 px-5 py-3 font-black text-white hover:bg-teal-900"
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
      <div className="mt-5 rounded-2xl border border-teal-300 bg-white p-5 dark:border-teal-500 dark:bg-slate-900">
        <div role="status" tabIndex={-1} ref={feedbackRef} className="focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-300">
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
              className="min-h-11 rounded-xl bg-teal-700 px-5 py-3 font-black text-white hover:bg-teal-900"
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
          回答済み {Object.keys(state.responses).length}/{state.queue.length}問
        </p>
      </div>
      <div
        role="progressbar"
        aria-label="確認クイズの進捗"
        aria-valuemin={0}
        aria-valuemax={state.queue.length}
        aria-valuenow={Object.keys(state.responses).length}
        className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
      >
        <div
          className="h-full bg-teal-600 transition-[width] motion-reduce:transition-none"
          style={{ width: `${Object.keys(state.responses).length / state.queue.length * 100}%` }}
        />
      </div>
      <fieldset className="mt-5">
        <legend className="text-lg font-black leading-7 text-slate-950 dark:text-white">
          {question.question}
        </legend>
        <div className="mt-4 grid gap-3" role="group" aria-label={`${state.position + 1}問目の選択肢`}>
          {question.choices.map((choice, index) => {
            const selected = selectedIndex === index;
            const correct = answered && question.correctIndex === index;
            const stateLabel = correct ? "○ 正解" : selected ? "× 不正解" : "— 未選択";
            return (
              <div key={choice} className={`rounded-xl border ${correct ? "border-teal-600 bg-teal-50 dark:bg-teal-950/60" : selected ? "border-rose-600 bg-rose-50 dark:bg-rose-950/50" : "border-slate-300 dark:border-slate-600"}`}>
                <button
                  type="button"
                  aria-pressed={selected}
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
                  <p className="border-t border-current/20 px-4 py-3 text-sm leading-6 text-slate-800 dark:text-slate-100">
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
          className="mt-5 rounded-xl bg-slate-100 p-4 text-sm leading-6 text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-300 dark:bg-slate-800 dark:text-white"
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
                  className="inline-flex min-h-11 items-center rounded-full border border-teal-700 px-3 font-black text-teal-800 underline underline-offset-4 dark:border-teal-500 dark:text-teal-200"
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
          className="mt-5 min-h-11 rounded-xl bg-teal-700 px-5 py-3 font-black text-white hover:bg-teal-900"
        >
          {state.position === state.queue.length - 1 ? "結果を見る" : "次の問題"}
        </button>
      ) : null}
    </div>
  );
}
