"use client";

import { useLanguage } from "@/contexts/language-context";

export function ExamQuizSectionLabels({
  total,
}: {
  total: number;
}) {
  const { language } = useLanguage();
  const isEn = language === "en";
  return (
    <div className="mb-3 flex items-center justify-between">
      <div>
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
          <span aria-hidden>✨</span>
          {isEn
            ? "100-question quizzes by qualification (with explanations & legal basis)"
            : "資格別100問クイズ（解説・法令根拠つき）"}
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          {isEn
            ? `10 qualifications × 100 questions = ${total} curriculum-coverage questions. Free = 30 per qualification; full set requires Standard+.`
            : `10資格 × 100問 = ${total}問のカリキュラム網羅型クイズ。Free=各資格30問、Standard以上で全問。`}
        </p>
      </div>
    </div>
  );
}

export function ExamQuizCardLabels({
  count,
}: {
  count: number;
}) {
  const { language } = useLanguage();
  const isEn = language === "en";
  return (
    <div className="mt-2 flex items-center justify-between text-[11px]">
      <span className="text-slate-500">{isEn ? `${count} questions` : `${count}問`}</span>
      <span className="inline-flex items-center gap-0.5 font-bold text-amber-600 group-hover:text-amber-700">
        {isEn ? "Take quiz →" : "挑戦する →"}
      </span>
    </div>
  );
}

export function ExamQuizRecommendHeading() {
  const { language } = useLanguage();
  const isEn = language === "en";
  return (
    <h2 className="mb-3 text-sm font-bold text-slate-700">
      {isEn ? "Recommended qualifications for you" : "あなたにおすすめの資格"}
    </h2>
  );
}

export function ExamQuizIndustryLabel({ ja, en }: { ja: string; en: string }) {
  const { language } = useLanguage();
  return <>{language === "en" ? en : ja}</>;
}
