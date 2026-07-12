"use client";

/**
 * NIQ-REC2: Eラーニング「社内記録用の受講記録」A4出力。
 *
 * スコアカード§6-4（受講記録の証跡=負け）への対応。ただし修了証は作らない
 * （法定効力なし・登録教習機関の土俵に入らない＝戦略docの「参入しない線引き」）。
 * あくまで社内の記録用として、氏名・日付・テーマ・正答率を印刷様式で出せるようにする。
 * 注記「本記録は法定教育の修了を証するものではありません」を様式に焼き込んで固定する。
 *
 * 印刷作法は work-env/class-judge-record-print.tsx に倣う（画面は通常表示・印刷時のみ
 * A4様式を hidden print:block で出す）。進捗は progress.ts の localStorage を読むだけ。
 */

import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { loadProgressList, type ThemeProgress } from "@/lib/elearning/progress";

/** 修了証ではないことを明示する固定注記（テストで文言固定）。 */
export const ELEARNING_RECEIPT_DISCLAIMER =
  "本記録は法定教育の修了を証するものではありません。社内の自主学習の記録用としてご利用ください。";

function themeRate(r: ThemeProgress): number {
  return r.totalQuestions > 0 ? Math.round((r.correctCount / r.totalQuestions) * 100) : 0;
}

/** ISO → 「YYYY年M月D日」。不正値は空文字。 */
export function formatReceiptDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function todayJa(): string {
  const d = new Date();
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export function ElearningReceiptExport() {
  const [list, setList] = useState<ThemeProgress[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [learnerName, setLearnerName] = useState("");
  const [workplace, setWorkplace] = useState("");

  useEffect(() => {
    // localStorage は外部システム — マウント後に読む（SSR/初回HTML不一致防止）。
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 初回マウントの hydration として正当
    setList(loadProgressList());
    setHydrated(true);
  }, []);

  if (!hydrated || list.length === 0) return null;

  const totalCorrect = list.reduce((s, r) => s + r.correctCount, 0);
  const totalQuestions = list.reduce((s, r) => s + r.totalQuestions, 0);
  const overallRate = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  return (
    <section
      aria-labelledby="elearning-receipt-heading"
      className="mt-3 rounded-2xl border border-sky-200 bg-sky-50/40 p-4"
    >
      {/* 画面表示（印刷時は隠す）: 氏名・事業場の入力と印刷ボタン */}
      <div className="print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <Printer className="h-5 w-5 text-sky-700" aria-hidden="true" />
          <h2 id="elearning-receipt-heading" className="text-base font-bold text-slate-900">
            受講記録を出力（社内用）
          </h2>
          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-800">
            修了証ではありません
          </span>
        </div>
        <p className="mt-1.5 text-xs text-slate-600">
          この端末の受講履歴（{list.length}テーマ）を、氏名・日付入りのA4記録として印刷／PDF保存できます。
        </p>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-700">
            受講者氏名
            <input
              type="text"
              value={learnerName}
              onChange={(e) => setLearnerName(e.target.value)}
              placeholder="氏名（任意・空欄なら手書き欄）"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-semibold text-slate-700">
            事業場名
            <input
              type="text"
              value={workplace}
              onChange={(e) => setWorkplace(e.target.value)}
              placeholder="事業場名（任意・空欄なら手書き欄）"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-sky-600 px-5 py-2 text-sm font-bold text-white hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
        >
          <Printer className="h-4 w-4" aria-hidden="true" />
          受講記録を印刷 / PDF
        </button>
        <p className="mt-2 text-[11px] leading-5 text-slate-500">※ {ELEARNING_RECEIPT_DISCLAIMER}</p>
      </div>

      {/* 印刷様式（印刷時のみ表示）: A4・社内記録用の受講記録 */}
      <div className="hidden text-slate-900 print:block">
        <div className="border border-slate-500 p-4 text-[12px]">
          <div className="flex items-center justify-between border-b border-slate-400 pb-2">
            <h1 className="text-base font-bold">安全衛生 自主学習 受講記録</h1>
            <p>作成日: {todayJa()}</p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-1.5">
            <p>受講者氏名: {learnerName ? learnerName : "____________________"}</p>
            <p>事業場名: {workplace ? workplace : "____________________"}</p>
          </div>

          <table className="mt-3 w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-400 px-2 py-1 text-left">テーマ</th>
                <th className="border border-slate-400 px-2 py-1 text-right">正答/問数</th>
                <th className="border border-slate-400 px-2 py-1 text-right">正答率</th>
                <th className="border border-slate-400 px-2 py-1 text-right">最終受講日</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.themeId}>
                  <td className="border border-slate-400 px-2 py-1">{r.themeTitle}</td>
                  <td className="border border-slate-400 px-2 py-1 text-right">
                    {r.correctCount}/{r.totalQuestions}
                  </td>
                  <td className="border border-slate-400 px-2 py-1 text-right">{themeRate(r)}%</td>
                  <td className="border border-slate-400 px-2 py-1 text-right">
                    {formatReceiptDate(r.lastAttemptedAt)}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-bold">
                <td className="border border-slate-400 px-2 py-1">合計</td>
                <td className="border border-slate-400 px-2 py-1 text-right">
                  {totalCorrect}/{totalQuestions}
                </td>
                <td className="border border-slate-400 px-2 py-1 text-right">{overallRate}%</td>
                <td className="border border-slate-400 px-2 py-1"></td>
              </tr>
            </tbody>
          </table>

          <div className="mt-3 flex items-end justify-between">
            <p className="max-w-[70%] text-[10px] leading-4 text-slate-700">※ {ELEARNING_RECEIPT_DISCLAIMER}</p>
            <div className="text-[11px]">
              <p>確認印</p>
              <div className="mt-1 h-14 w-20 border border-slate-400" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
