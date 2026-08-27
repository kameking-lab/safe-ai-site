"use client";

import { useState } from "react";
import type { AiTrainingExercise } from "@/data/ai-seminars/types";

export function AiPracticeExercises({ exercises }: { exercises: readonly AiTrainingExercise[] }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {exercises.map((exercise) => {
        const answer = answers[exercise.id] ?? "";
        const isRevealed = revealed[exercise.id] === true;
        const inputId = `${exercise.id}-answer`;
        return (
          <article key={exercise.id} className="rounded-2xl border-2 border-slate-300 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-lg font-black">{exercise.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">{exercise.scenario}</p>
            <p className="mt-2 text-sm font-black leading-6 text-slate-900 dark:text-white">{exercise.task}</p>
            <label htmlFor={inputId} className="mt-4 block text-sm font-black">
              あなたの回答
            </label>
            <textarea
              id={inputId}
              value={answer}
              onChange={(event) => {
                setAnswers((current) => ({ ...current, [exercise.id]: event.target.value }));
                setRevealed((current) => ({ ...current, [exercise.id]: false }));
              }}
              rows={5}
              className="mt-2 w-full rounded-xl border-2 border-slate-300 bg-white p-3 text-base text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
              placeholder="実在する会社・人・案件の情報は入力しないでください"
            />
            <button
              type="button"
              disabled={answer.trim().length === 0}
              onClick={() => setRevealed((current) => ({ ...current, [exercise.id]: true }))}
              className="mt-3 min-h-11 rounded-xl bg-sky-800 px-4 py-2 text-sm font-black text-white hover:bg-sky-900 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {exercise.revealLabel}
            </button>
            {isRevealed ? (
              <div role="status" className="mt-4 rounded-xl border border-sky-300 bg-sky-50 p-3 text-sm leading-6 text-sky-950 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-100">
                <strong className="block">解説例</strong>
              <ul className="list-disc space-y-1 pl-5">
                {exercise.modelAnswer.map((line) => <li key={line}>{line}</li>)}
              </ul>
              <p className="mt-2">{exercise.explanation}</p>
              </div>
            ) : null}
          </article>
        );
      })}
      <p className="sr-only">入力内容はこの画面内だけで扱い、サーバーへ送信しません。</p>
    </div>
  );
}
