"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CheckCircle2, ExternalLink, RotateCcw, XCircle } from "lucide-react";
import type { SafetyQuestion } from "@/data/safety-elearning/types";

interface SafetyQuestionPlayerProps {
  courseTitle: string;
  questions: readonly SafetyQuestion[];
  subjectTitles: Readonly<Record<string, string>>;
}

interface FeedbackState {
  choiceId: string;
  correct: boolean;
}

function shuffledChoiceIds(question: SafetyQuestion): string[] {
  const choiceIds = question.choices.map((choice) => choice.choiceId);
  // Productionではhydrationと法令表現の安全性を優先し、validatorも固定順だけを許可する。
  return choiceIds;
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

export function SafetyQuestionPlayer({
  courseTitle,
  questions,
  subjectTitles,
}: SafetyQuestionPlayerProps) {
  const questionById = useMemo(
    () => new Map(questions.map((question) => [question.questionId, question])),
    [questions],
  );
  const [choiceOrder] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(
      questions.map((question) => [
        question.questionId,
        shuffledChoiceIds(question),
      ]),
    ),
  );
  const [roundQuestionIds, setRoundQuestionIds] = useState(() =>
    questions.map((question) => question.questionId),
  );
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [validationMessage, setValidationMessage] = useState("");
  const [attempts, setAttempts] = useState<Record<string, number>>({});
  const [missedThisRound, setMissedThisRound] = useState<string[]>([]);
  const [firstTryCorrect, setFirstTryCorrect] = useState(0);
  const [initialResult, setInitialResult] = useState<{
    correct: number;
    total: number;
  } | null>(null);
  const [reviewMode, setReviewMode] = useState(false);
  const [finished, setFinished] = useState(false);
  const questionTitleRef = useRef<HTMLHeadingElement>(null);
  const feedbackRef = useRef<HTMLHeadingElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const firstChoiceRef = useRef<HTMLInputElement>(null);

  const currentQuestionId = roundQuestionIds[questionIndex];
  const currentQuestion = currentQuestionId
    ? questionById.get(currentQuestionId)
    : undefined;
  const orderedChoices = useMemo(() => {
    if (!currentQuestion) return [];
    const byId = new Map(
      currentQuestion.choices.map((choice) => [choice.choiceId, choice]),
    );
    return (choiceOrder[currentQuestion.questionId] ?? [])
      .map((choiceId) => byId.get(choiceId))
      .filter((choice) => choice !== undefined);
  }, [choiceOrder, currentQuestion]);

  useEffect(() => {
    if (feedback) feedbackRef.current?.focus();
  }, [feedback]);

  useEffect(() => {
    if (finished) summaryRef.current?.focus();
  }, [finished]);

  const selectChoice = useCallback(
    (choiceId: string) => {
      if (feedback) return;
      setSelectedChoiceId(choiceId);
      setValidationMessage("");
    },
    [feedback],
  );

  const confirmAnswer = useCallback(() => {
    if (!currentQuestion || feedback) return;
    if (!selectedChoiceId) {
      setValidationMessage("選択肢を1つ選んでください。");
      firstChoiceRef.current?.focus();
      return;
    }

    const priorAttempts = attempts[currentQuestion.questionId] ?? 0;
    const correct = currentQuestion.officialCorrectChoiceIds.includes(
      selectedChoiceId,
    );
    setAttempts((current) => ({
      ...current,
      [currentQuestion.questionId]: priorAttempts + 1,
    }));
    if (correct && priorAttempts === 0 && !reviewMode) {
      setFirstTryCorrect((current) => current + 1);
    }
    if (!correct) {
      setMissedThisRound((current) =>
        current.includes(currentQuestion.questionId)
          ? current
          : [...current, currentQuestion.questionId],
      );
    }
    setFeedback({ choiceId: selectedChoiceId, correct });
  }, [attempts, currentQuestion, feedback, reviewMode, selectedChoiceId]);

  const retryQuestion = useCallback(() => {
    setFeedback(null);
    setSelectedChoiceId(null);
    setValidationMessage("");
    requestAnimationFrame(() => firstChoiceRef.current?.focus());
  }, []);

  const moveNext = useCallback(() => {
    if (!feedback?.correct) return;
    if (questionIndex === roundQuestionIds.length - 1) {
      if (!reviewMode) {
        setInitialResult({ correct: firstTryCorrect, total: questions.length });
      }
      setFinished(true);
      return;
    }
    setQuestionIndex((current) => current + 1);
    setSelectedChoiceId(null);
    setFeedback(null);
    setValidationMessage("");
    requestAnimationFrame(() => questionTitleRef.current?.focus());
  }, [
    feedback?.correct,
    firstTryCorrect,
    questionIndex,
    questions.length,
    reviewMode,
    roundQuestionIds.length,
  ]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!currentQuestion || finished || event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }
      if (event.repeat) return;
      const target = event.target as HTMLElement | null;
      const tagName =
        typeof target?.tagName === "string" ? target.tagName.toLowerCase() : "";
      const isRadio =
        tagName === "input" &&
        (target as HTMLInputElement).type === "radio";
      const isEditable =
        target?.isContentEditable ||
        tagName === "textarea" ||
        tagName === "select" ||
        (tagName === "input" && !isRadio);
      if (isEditable || event.isComposing) return;

      if (/^[1-5]$/.test(event.key) && !feedback) {
        const choice = orderedChoices[Number(event.key) - 1];
        if (!choice) return;
        event.preventDefault();
        selectChoice(choice.choiceId);
        document
          .getElementById(`choice-${currentQuestion.questionId}-${choice.choiceId}`)
          ?.focus();
        return;
      }

      if (event.key !== "Enter") return;
      if (
        tagName === "button" ||
        tagName === "a" ||
        tagName === "summary"
      ) {
        return;
      }
      event.preventDefault();
      if (feedback?.correct) moveNext();
      else if (feedback) retryQuestion();
      else confirmAnswer();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    confirmAnswer,
    currentQuestion,
    feedback,
    finished,
    moveNext,
    orderedChoices,
    retryQuestion,
    selectChoice,
  ]);

  if (!currentQuestion || finished) {
    const result = initialResult ?? {
      correct: firstTryCorrect,
      total: questions.length,
    };
    return (
      <div
        ref={summaryRef}
        tabIndex={-1}
        aria-labelledby="safety-session-summary-title"
        className="rounded-3xl border-2 border-emerald-800 bg-emerald-50 p-5 text-emerald-950 outline-none focus-visible:ring-4 focus-visible:ring-emerald-400 dark:border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-50 forced-colors:border-[CanvasText] forced-colors:bg-[Canvas] forced-colors:text-[CanvasText] sm:p-7"
      >
        <h2 id="safety-session-summary-title" className="text-2xl font-black">
          {reviewMode ? "復習ラウンド完了" : "今回の問題演習が完了しました"}
        </h2>
        <p className="mt-3 text-lg font-black">
          初回正答数 {result.correct}問／{result.total}問
        </p>
        <p className="mt-2 text-sm leading-6">
          この結果はこのタブ内だけの表示です。学習時間・履歴・正答数を端末やサーバーへ保存しません。
        </p>
        {missedThisRound.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              setRoundQuestionIds(missedThisRound);
              setMissedThisRound([]);
              setQuestionIndex(0);
              setSelectedChoiceId(null);
              setFeedback(null);
              setAttempts({});
              setReviewMode(true);
              setFinished(false);
              requestAnimationFrame(() => questionTitleRef.current?.focus());
            }}
            className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 font-black text-white hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400 motion-reduce:transition-none forced-colors:border-2 forced-colors:border-[ButtonText] forced-colors:bg-[ButtonFace] forced-colors:text-[ButtonText]"
          >
            <RotateCcw className="h-5 w-5" aria-hidden="true" />
            間違えた{missedThisRound.length}問をもう一度
          </button>
        ) : (
          <p className="mt-4 font-bold">このラウンドで間違えた問題はありません。</p>
        )}
      </div>
    );
  }

  const selectedExplanation = feedback
    ? currentQuestion.explanationByChoice.find(
        (entry) => entry.choiceId === feedback.choiceId,
      )
    : undefined;
  const incorrectExplanations = currentQuestion.explanationByChoice.filter(
    (entry) => entry.verdict === "incorrect",
  );
  const subjectTitle = subjectTitles[currentQuestion.subjectId] ?? currentQuestion.subjectId;
  const describedBy = validationMessage
    ? `safety-question-help safety-question-error`
    : "safety-question-help";

  return (
    <section aria-label={`${courseTitle} 問題演習`} className="min-w-0">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-slate-800 bg-slate-950 p-4 text-white forced-colors:border-[CanvasText] forced-colors:bg-[Canvas] forced-colors:text-[CanvasText]">
        <div>
          <p className="text-xs font-black tracking-[.14em] text-cyan-300 forced-colors:text-[CanvasText]">
            {reviewMode ? "REVIEW SESSION" : "CURRENT SESSION"}
          </p>
          <p id="current-safety-progress" className="mt-1 font-black">
            {reviewMode ? "復習 " : ""}{questionIndex + 1}問目／{roundQuestionIds.length}問
          </p>
        </div>
        <p className="text-sm font-bold">初回ラウンド正答 {firstTryCorrect}問</p>
      </div>

      <div className="rounded-3xl border-2 border-slate-300 bg-white p-4 shadow-sm dark:border-slate-600 dark:bg-slate-950 forced-colors:border-[CanvasText] forced-colors:bg-[Canvas] forced-colors:text-[CanvasText] sm:p-7">
        <p id="current-safety-subject" className="text-sm font-black text-emerald-800 dark:text-emerald-300 forced-colors:text-[CanvasText]">
          {subjectTitle}
        </p>
        <h2
          ref={questionTitleRef}
          tabIndex={-1}
          id="current-safety-question"
          aria-describedby="current-safety-progress current-safety-subject"
          className="mt-2 scroll-mt-24 text-xl font-black leading-8 text-slate-950 outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 dark:text-white sm:text-2xl"
        >
          {currentQuestion.questionText}
        </h2>
        <p id="safety-question-help" className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          1〜{orderedChoices.length}キーで選択、Enterキーで回答できます。正しいものを1つ選んでください。
        </p>
        {validationMessage ? (
          <p id="safety-question-error" role="alert" className="mt-3 font-bold text-red-800 dark:text-red-200">
            {validationMessage}
          </p>
        ) : null}

        <fieldset aria-describedby={describedBy} className="mt-5">
          <legend className="sr-only">回答の選択肢</legend>
          <div className="grid gap-3">
            {orderedChoices.map((choice, index) => {
              const selected = selectedChoiceId === choice.choiceId;
              return (
                <label
                  key={choice.choiceId}
                  className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border-2 px-4 py-3 font-semibold leading-6 transition-[border-color,background-color] motion-reduce:transition-none forced-colors:border-[ButtonText] forced-colors:bg-[Canvas] forced-colors:text-[CanvasText] ${
                    selected
                      ? "border-emerald-800 bg-emerald-50 text-slate-950 dark:border-emerald-300 dark:bg-emerald-950/40 dark:text-white"
                      : "border-slate-300 bg-slate-50 text-slate-950 hover:border-emerald-700 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  } ${feedback ? "cursor-default opacity-90" : ""}`}
                >
                  <input
                    ref={index === 0 ? firstChoiceRef : undefined}
                    id={`choice-${currentQuestion.questionId}-${choice.choiceId}`}
                    type="radio"
                    name={currentQuestion.questionId}
                    value={choice.choiceId}
                    aria-label={`${index + 1}. ${choice.text}`}
                    checked={selected}
                    disabled={Boolean(feedback)}
                    onChange={() => selectChoice(choice.choiceId)}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 forced-colors:accent-[Highlight]"
                  />
                  <span>
                    <span className="mr-2 font-black" aria-hidden="true">
                      {index + 1}.
                    </span>
                    {choice.text}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {!feedback ? (
          <button
            type="button"
            onClick={confirmAnswer}
            className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-emerald-800 px-5 py-3 font-black text-white hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 forced-colors:border-2 forced-colors:border-[ButtonText] forced-colors:bg-[ButtonFace] forced-colors:text-[ButtonText] sm:w-auto"
          >
            回答する
          </button>
        ) : null}

        {feedback && selectedExplanation ? (
          <div
            data-answer-state={feedback.correct ? "correct" : "incorrect"}
            className={`mt-6 rounded-2xl border-2 p-4 outline-none focus-visible:ring-4 forced-colors:border-[CanvasText] forced-colors:bg-[Canvas] forced-colors:text-[CanvasText] ${
              feedback.correct
                ? "border-emerald-800 bg-emerald-50 text-emerald-950 focus-visible:ring-emerald-400 dark:border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-50"
                : "border-red-800 bg-red-50 text-red-950 focus-visible:ring-red-400 dark:border-red-300 dark:bg-red-950/40 dark:text-red-50"
            }`}
          >
            <h3
              ref={feedbackRef}
              tabIndex={-1}
              className="flex items-center gap-2 text-lg font-black outline-none focus-visible:ring-4 focus-visible:ring-current"
            >
              {feedback.correct ? (
                <CheckCircle2 className="h-6 w-6 shrink-0" aria-hidden="true" />
              ) : (
                <XCircle className="h-6 w-6 shrink-0" aria-hidden="true" />
              )}
              {feedback.correct ? "正解" : "不正解"}
            </h3>
            <div role="status" aria-live="polite" aria-atomic="true">
              <p className="mt-1 text-sm font-bold">
                選んだ回答: {orderedChoices.find((choice) => choice.choiceId === feedback.choiceId)?.text}
              </p>
              <p className="mt-3 leading-7">{selectedExplanation.shortReason}</p>
            </div>

            {feedback.correct ? (
              <div className="mt-4 border-t border-current/25 pt-4">
                <p className="font-black">ほかの選択肢が違う理由</p>
                <ul className="mt-2 space-y-2 text-sm leading-6">
                  {incorrectExplanations.map((entry) => {
                    const choice = currentQuestion.choices.find(
                      (candidate) => candidate.choiceId === entry.choiceId,
                    );
                    return (
                      <li key={entry.choiceId}>
                        <span className="font-bold">{choice?.text}: </span>
                        {entry.shortReason}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            <details className="mt-4 rounded-xl border border-current/40 bg-white/60 p-3 dark:bg-slate-950/40 forced-colors:bg-[Canvas]">
              <summary className="min-h-11 cursor-pointer py-2 font-black underline underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300">
                根拠を見る
              </summary>
              <p className="mt-2 text-sm leading-6">{selectedExplanation.detailedReason}</p>
              <p className="mt-3 text-xs leading-5">
                法令基準日: <time dateTime={currentQuestion.currentLawAsOf}>{currentQuestion.currentLawAsOf}</time>
              </p>
              {currentQuestion.currentLawChanged && currentQuestion.lawChangeNote ? (
                <dl className="mt-3 grid gap-2 text-sm">
                  <div><dt className="font-black">出題当時</dt><dd>{currentQuestion.lawChangeNote.atExam}</dd></div>
                  <div><dt className="font-black">現在</dt><dd>{currentQuestion.lawChangeNote.current}</dd></div>
                </dl>
              ) : null}
              <ul className="mt-3 flex flex-wrap gap-3">
                {unique(selectedExplanation.officialLinks).map((link, index) => (
                  <li key={link}>
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center gap-1 py-2 font-black text-sky-900 underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 dark:text-sky-200 forced-colors:text-[LinkText]"
                    >
                      公式根拠{index + 1}を確認
                      <span className="sr-only">（新しいタブで開きます）</span>
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            </details>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              {feedback.correct ? (
                <button
                  type="button"
                  onClick={moveNext}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-800 px-5 py-3 font-black text-white hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400 forced-colors:border-2 forced-colors:border-[ButtonText] forced-colors:bg-[ButtonFace] forced-colors:text-[ButtonText]"
                >
                  {questionIndex === roundQuestionIds.length - 1 ? "結果を見る" : "次へ"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={retryQuestion}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-800 px-5 py-3 font-black text-white hover:bg-red-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-400 forced-colors:border-2 forced-colors:border-[ButtonText] forced-colors:bg-[ButtonFace] forced-colors:text-[ButtonText]"
                >
                  <RotateCcw className="h-5 w-5" aria-hidden="true" />
                  もう一度選ぶ
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
