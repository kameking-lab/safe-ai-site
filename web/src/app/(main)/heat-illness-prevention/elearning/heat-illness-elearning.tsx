"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, RotateCcw, ShieldAlert } from "lucide-react";
import { HEAT_ILLNESS_KNOWLEDGE_CHECK } from "@/data/heat-illness-learning/questions";
import { getHeatLearningSource } from "@/data/heat-illness-learning/sources";
import type { HeatLearningClaimKind } from "@/data/heat-illness-learning/types";

const CLAIM_KIND_LABELS: Record<HeatLearningClaimKind, string> = {
  "statutory-duty": "法令上の義務",
  "statutory-scope": "法令の対象目安",
  "guideline-recommendation": "2026年指針の推奨",
  "official-observation": "公式観測情報の説明",
  "official-emergency-guidance": "公式の緊急対応",
  "portal-explanation": "サイト独自の整理",
};

export function HeatIllnessElearning() {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [reviewed, setReviewed] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const answeredCount = Object.keys(answers).length;
  const progressPercent = Math.round(
    (answeredCount / HEAT_ILLNESS_KNOWLEDGE_CHECK.length) * 100,
  );
  const missingQuestions = HEAT_ILLNESS_KNOWLEDGE_CHECK.filter(
    (question) => !answers[question.id],
  );

  useEffect(() => {
    if (reviewed) {
      summaryRef.current?.focus();
    }
  }, [reviewed]);

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setReviewed(true);
      }}
      onReset={() => {
        setAnswers({});
        setReviewed(false);
      }}
      className="space-y-6"
    >
      <section
        aria-labelledby="heat-learning-progress-title"
        className="overflow-hidden rounded-3xl border-2 border-slate-800 bg-slate-950 p-4 text-white shadow-xl print:static forced-colors:border-[CanvasText] forced-colors:bg-[Canvas] forced-colors:text-[CanvasText] sm:sticky sm:top-16 sm:z-20 sm:p-5"
      >
        <div className="flex flex-wrap items-center gap-4">
          <div className="portal-light-ink flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-slate-950">
            <span className="text-2xl font-black tabular-nums">{answeredCount}</span>
            <span className="text-xs font-black">/7</span>
          </div>
          <div className="min-w-0 flex-1">
            <p
              id="heat-learning-progress-title"
              className="text-xs font-black tracking-[.16em] text-cyan-300 forced-colors:text-[CanvasText]"
            >
              LEARNING JOURNEY
            </p>
            <p className="mt-1 text-lg font-black">
              {answeredCount === 0
                ? "7つの判断ポイントを旅する"
                : answeredCount === HEAT_ILLNESS_KNOWLEDGE_CHECK.length
                  ? "全7問を選択しました"
                  : `あと${HEAT_ILLNESS_KNOWLEDGE_CHECK.length - answeredCount}問で照合へ`}
            </p>
            <div
              className="mt-3 h-3 overflow-hidden rounded-full border border-white/30 bg-white/10"
              role="progressbar"
              aria-label={`回答進捗 ${answeredCount}/${HEAT_ILLNESS_KNOWLEDGE_CHECK.length}`}
              aria-valuemin={0}
              aria-valuemax={HEAT_ILLNESS_KNOWLEDGE_CHECK.length}
              aria-valuenow={answeredCount}
              aria-valuetext={`${HEAT_ILLNESS_KNOWLEDGE_CHECK.length}問中${answeredCount}問を回答済み`}
            >
              <span
                className="block h-full rounded-full bg-gradient-to-r from-orange-400 via-yellow-300 to-cyan-300 transition-[width] duration-300 motion-reduce:transition-none"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <ol className="flex w-full gap-1 sm:w-auto" aria-label="設問の回答状態">
            {HEAT_ILLNESS_KNOWLEDGE_CHECK.map((question) => (
              <li key={question.id} className="flex-1 sm:flex-none">
                <a
                  href={`#question-${question.id}`}
                  aria-label={`問${question.number} ${answers[question.id] ? "回答済み" : "未回答"}`}
                  className={`flex h-9 min-w-8 items-center justify-center rounded-lg border text-xs font-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300 ${
                    answers[question.id]
                      ? "portal-light-ink border-cyan-300 bg-cyan-300 text-slate-950"
                      : "border-white/35 bg-white/10 text-white"
                  }`}
                >
                  {answers[question.id] ? "✓" : question.number}
                </a>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {reviewed ? (
        <div
          ref={summaryRef}
          tabIndex={-1}
          role={missingQuestions.length > 0 ? "alert" : "status"}
          aria-live="polite"
          className={`scroll-mt-24 rounded-2xl border-2 p-5 outline-none focus-visible:ring-4 ${
            missingQuestions.length > 0
              ? "border-amber-700 bg-amber-50 text-amber-950 focus-visible:ring-amber-400 dark:border-amber-300 dark:bg-amber-950/40 dark:text-amber-50"
              : "border-emerald-800 bg-emerald-50 text-emerald-950 focus-visible:ring-emerald-400 dark:border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-50"
          } forced-colors:border-[CanvasText] forced-colors:bg-[Canvas] forced-colors:text-[CanvasText]`}
        >
          <p className="font-black">
            {missingQuestions.length > 0
              ? `未回答が${missingQuestions.length}項目あります`
              : "7項目すべてを公式根拠と照合しました"}
          </p>
          <p className="mt-1 text-sm leading-6">
            能力や作業の安全を判定する結果ではありません。各項目の説明と公式資料を確認してください。
          </p>
          {missingQuestions.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {missingQuestions.map((question) => (
                <li key={question.id}>
                  <a
                    href={`#question-${question.id}`}
                    className="inline-flex min-h-[44px] items-center rounded-lg border border-amber-800 bg-white px-3 py-2 text-sm font-bold text-amber-950 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300 dark:bg-slate-950 dark:text-amber-50 forced-colors:border-[LinkText] forced-colors:bg-[Canvas] forced-colors:text-[LinkText]"
                  >
                    問{question.number}へ移動
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {HEAT_ILLNESS_KNOWLEDGE_CHECK.map((question, questionIndex) => {
        const selected = answers[question.id];
        const correct = selected === question.correctOptionId;
        const missing = reviewed && !selected;
        const descriptionIds = [
          `${question.id}-context`,
          missing ? `${question.id}-error` : null,
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <fieldset
            key={question.id}
            id={`question-${question.id}`}
            aria-describedby={descriptionIds}
            aria-invalid={missing ? "true" : undefined}
            className={`scroll-mt-36 overflow-hidden rounded-[2rem] border-2 p-5 shadow-[0_24px_60px_-42px_rgba(15,23,42,.65)] sm:p-7 forced-colors:border-[CanvasText] forced-colors:bg-[Canvas] forced-colors:text-[CanvasText] ${
              [
                "border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30",
                "border-sky-300 bg-sky-50 dark:border-sky-800 dark:bg-sky-950/30",
                "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30",
                "border-violet-300 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/30",
                "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30",
                "border-teal-300 bg-teal-50 dark:border-teal-800 dark:bg-teal-950/30",
                "border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/30",
              ][questionIndex]
            }`}
          >
            <legend className="max-w-4xl px-2 text-lg font-black leading-7 text-slate-950 sm:text-2xl dark:text-white">
              <span
                className="mr-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white"
                aria-hidden="true"
              >
                {String(question.number).padStart(2, "0")}
              </span>
              問{question.number}. {question.legend}
            </legend>
            <p
              id={`${question.id}-context`}
              className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200"
            >
              情報種別: {CLAIM_KIND_LABELS[question.kind]}。{question.context}
            </p>

            {missing ? (
              <p
                id={`${question.id}-error`}
                className="mt-3 font-bold text-red-800 dark:text-red-200 forced-colors:text-[CanvasText]"
              >
                この項目は未回答です。選択肢を1つ選んでください。
              </p>
            ) : null}

            <div className="mt-4 grid gap-3">
              {question.options.map((option) => (
                <label
                  key={option.id}
                  className={`flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border-2 px-4 py-3 text-slate-950 transition-[border-color,background-color,transform] hover:-translate-y-0.5 hover:border-orange-600 motion-reduce:transform-none motion-reduce:transition-none dark:text-white forced-colors:border-[ButtonText] forced-colors:bg-[Canvas] forced-colors:text-[CanvasText] ${
                    selected === option.id
                      ? "border-slate-950 bg-white shadow-md dark:border-white dark:bg-slate-900"
                      : "border-slate-300 bg-white/65 hover:bg-white dark:border-slate-600 dark:bg-slate-900/65"
                  }`}
                >
                  <input
                    type="radio"
                    name={question.id}
                    value={option.id}
                    checked={selected === option.id}
                    onChange={() => {
                      setAnswers((current) => ({
                        ...current,
                        [question.id]: option.id,
                      }));
                    }}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-orange-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-300 forced-colors:accent-[Highlight]"
                  />
                  <span className="font-semibold leading-6">{option.label}</span>
                </label>
              ))}
            </div>

            {reviewed && selected ? (
              <div
                data-answer-state={correct ? "confirmed" : "needs-review"}
                className={`mt-5 rounded-2xl border-2 p-4 ${
                  correct
                    ? "border-emerald-800 bg-emerald-50 text-emerald-950 dark:border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-50"
                    : "border-red-800 bg-red-50 text-red-950 dark:border-red-300 dark:bg-red-950/40 dark:text-red-50"
                } forced-colors:border-[CanvasText] forced-colors:bg-[Canvas] forced-colors:text-[CanvasText]`}
              >
                <p className="flex items-center gap-2 font-black">
                  {question.emergency ? (
                    <ShieldAlert
                      className="h-5 w-5 shrink-0"
                      aria-hidden="true"
                    />
                  ) : null}
                  {correct
                    ? "根拠と一致しています"
                    : question.emergency
                      ? "要訂正: 緊急時の分岐を確認してください"
                      : "要訂正: 公式根拠を確認してください"}
                </p>
                <p className="mt-2 text-sm leading-6">{question.rationale}</p>
                <p className="mt-2 text-xs leading-5">
                  確認箇所: {question.locator}
                </p>
                <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  {question.sourceIds.map((sourceId) => {
                    const source = getHeatLearningSource(sourceId);
                    return (
                      <li key={sourceId}>
                        {source ? (
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-h-[44px] items-center gap-1 py-2 font-black text-sky-900 underline decoration-2 underline-offset-4 focus-visible:rounded focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 dark:text-sky-200 forced-colors:text-[LinkText]"
                          >
                            {source.documentNumber ??
                              `${source.issuer}公式資料`}
                            <ExternalLink
                              className="h-4 w-4 shrink-0"
                              aria-hidden="true"
                            />
                          </a>
                        ) : (
                          <span className="font-black">
                            出典レコード未解決: {sourceId}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </fieldset>
        );
      })}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-orange-700 px-5 py-3 font-black text-white transition-colors hover:bg-orange-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-300 motion-reduce:transition-none forced-colors:border-2 forced-colors:border-[ButtonText] forced-colors:bg-[ButtonFace] forced-colors:text-[ButtonText]"
        >
          選択内容を公式根拠と照合
        </button>
        <button
          type="reset"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-xl border-2 border-slate-700 bg-white px-5 py-3 font-black text-slate-950 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-300 motion-reduce:transition-none dark:border-slate-300 dark:bg-slate-950 dark:text-white forced-colors:border-[ButtonText] forced-colors:bg-[ButtonFace] forced-colors:text-[ButtonText]"
        >
          <RotateCcw className="h-5 w-5" aria-hidden="true" />
          選択をやり直す
        </button>
      </div>
    </form>
  );
}
