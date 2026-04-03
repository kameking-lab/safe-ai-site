"use client";

import { useMemo, useState } from "react";
import type { LearningTheme } from "@/lib/types/operations";

type ELearningPanelProps = {
  onJumpToKy?: () => void;
};

const themes: LearningTheme[] = [
  {
    id: "learn-highfall",
    title: "高所作業の墜落防止",
    sourceType: "事故DB",
    description: "足場・親綱・手すり・フルハーネスの基本確認を3問で復習します。",
    level: "重点",
    questions: [
      {
        id: "q1",
        question: "高所作業で最優先で確認すべき項目は？",
        options: ["作業服の色", "墜落防止設備と装着状態", "休憩場所"],
        correctIndex: 1,
        explanation: "墜落防止設備の有無・装着状態が最優先です。",
      },
      {
        id: "q2",
        question: "手すり未設置区間を見つけた時の行動は？",
        options: ["急いで通過", "作業を止めて責任者へ報告", "注意して続行"],
        correctIndex: 1,
        explanation: "危険区間発見時は作業停止と報告を徹底します。",
      },
      {
        id: "q3",
        question: "朝礼で共有すべき内容として適切なのは？",
        options: ["個人の感想だけ", "危険箇所・退避導線・合図役", "天気予報だけ"],
        correctIndex: 1,
        explanation: "具体的な危険箇所と連絡導線を共有します。",
      },
    ],
  },
  {
    id: "learn-electric",
    title: "感電防止と停電確認",
    sourceType: "法改正",
    description: "停電範囲・検電・復電前確認の流れを短時間で確認します。",
    level: "標準",
    questions: [
      {
        id: "q1",
        question: "停電作業で必須なのは？",
        options: ["検電を省略", "停電札と検電の実施", "日報のみ記録"],
        correctIndex: 1,
        explanation: "停電札掲示と検電実施が必須です。",
      },
      {
        id: "q2",
        question: "復電前の確認で正しいのは？",
        options: ["担当者単独で判断", "責任者を含む複数確認", "定時なら自動復電"],
        correctIndex: 1,
        explanation: "復電前は複数確認で誤復電を防止します。",
      },
      {
        id: "q3",
        question: "活線接触リスクが疑われる時の対応は？",
        options: ["そのまま続行", "即時停止と連絡", "様子見で対応"],
        correctIndex: 1,
        explanation: "疑い段階でも即時停止が原則です。",
      },
    ],
  },
];

export function ELearningPanel({ onJumpToKy }: ELearningPanelProps) {
  const [themeId, setThemeId] = useState(themes[0].id);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const selectedTheme = useMemo(() => themes.find((theme) => theme.id === themeId) ?? themes[0], [themeId]);
  const score = selectedTheme.questions.reduce((sum, q) => sum + (answers[q.id] === q.correctIndex ? 1 : 0), 0);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900 sm:text-lg">Eラーニング</h2>
          <p className="mt-1 text-xs text-slate-600">事故DB・法改正・現場リスクから、朝礼後に学習できる入口です。</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-700">たたき台</span>
      </div>
      <div className="mt-3">
        <label className="block text-xs font-semibold text-slate-700" htmlFor="learning-theme">学習テーマ</label>
        <select
          id="learning-theme"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
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
        <button className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white" onClick={onJumpToKy} type="button">
          KY用紙へ
        </button>
      </div>
    </section>
  );
}
