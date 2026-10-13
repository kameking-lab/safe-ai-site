"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Clock3, FileDown, Presentation, Users } from "lucide-react";
import type { PublishedSafetySeminar } from "@/data/safety-seminars/themes";

export function PublishedSeminarList({ seminars }: { seminars: readonly PublishedSafetySeminar[] }) {
  const [duration, setDuration] = useState("");
  const [audience, setAudience] = useState("");
  const [format, setFormat] = useState("");
  const durations = Array.from(new Set(seminars.map((seminar) => seminar.standardDuration)));
  const audiences = Array.from(new Set(seminars.map((seminar) => seminar.audience)));
  const formats = Array.from(new Set(seminars.flatMap((seminar) => seminar.formats)));
  const visible = seminars.filter((seminar) =>
    (!duration || seminar.standardDuration === duration) &&
    (!audience || seminar.audience === audience) &&
    (!format || seminar.formats.includes(format))
  );

  return (
    <>
      <div className="mt-5 grid gap-3 rounded-2xl border border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:grid-cols-3">
        <label className="text-sm font-bold">
          標準時間
          <select aria-label="標準時間で絞り込む" value={duration} onChange={(event) => setDuration(event.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-slate-400 bg-white px-3 text-sm font-normal text-slate-950">
            <option value="">すべて</option>
            {durations.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label className="text-sm font-bold">
          対象
          <select aria-label="対象で絞り込む" value={audience} onChange={(event) => setAudience(event.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-slate-400 bg-white px-3 text-sm font-normal text-slate-950">
            <option value="">すべて</option>
            {audiences.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label className="text-sm font-bold">
          形式
          <select aria-label="形式で絞り込む" value={format} onChange={(event) => setFormat(event.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-slate-400 bg-white px-3 text-sm font-normal text-slate-950">
            <option value="">すべて</option>
            {formats.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p role="status" className="text-sm font-bold text-slate-700 dark:text-slate-200">公開教材 {visible.length}件</p>
        {(duration || audience || format) && (
          <button
            type="button"
            onClick={() => { setDuration(""); setAudience(""); setFormat(""); }}
            className="inline-flex min-h-11 items-center rounded-lg border border-slate-400 bg-white px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-700/30"
          >
            絞り込みを解除
          </button>
        )}
      </div>
      {visible.length === 0 ? (
        <p className="mt-3 rounded-xl border border-slate-300 bg-white p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">条件に合う公開教材はありません。条件を変えてください。</p>
      ) : (
        <div className="mt-3 grid gap-6">
          {visible.map((published, index) => (
            <article key={published.id} data-seminar-status="published" data-seminar-id={published.id} className="overflow-hidden rounded-3xl border-2 border-slate-900 bg-white shadow-[7px_7px_0_#0f766e] dark:border-slate-500 dark:bg-slate-900">
              <div className="grid lg:grid-cols-[minmax(0,1fr)_18rem]">
                <div className="p-5 sm:p-7">
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-950 dark:bg-emerald-950 dark:text-emerald-200">公開中</span>
                    {index === 0 && !duration && !audience && !format ? <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-950 dark:bg-amber-950 dark:text-amber-200">おすすめ</span> : null}
                  </div>
                  <h3 className="mt-3 max-w-3xl text-2xl font-black leading-tight sm:text-3xl">{published.title}</h3>
                  <p className="mt-3 flex items-start gap-2 text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200"><Users className="mt-0.5 h-5 w-5 shrink-0 text-emerald-800 dark:text-emerald-300" aria-hidden="true" />対象：{published.audience}</p>
                  <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800"><dt className="flex items-center gap-2 text-xs font-black text-slate-600 dark:text-slate-300"><Clock3 className="h-4 w-4" aria-hidden="true" />標準時間</dt><dd className="mt-1 text-sm font-black">{published.standardDuration}</dd></div>
                    <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800"><dt className="flex items-center gap-2 text-xs font-black text-slate-600 dark:text-slate-300"><Presentation className="h-4 w-4" aria-hidden="true" />スライド枚数</dt><dd className="mt-1 text-sm font-black">{published.slideCount}枚</dd></div>
                    <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800"><dt className="flex items-center gap-2 text-xs font-black text-slate-600 dark:text-slate-300"><FileDown className="h-4 w-4" aria-hidden="true" />ダウンロード</dt><dd className="mt-1 text-sm font-black">{published.formats.join("・")}</dd></div>
                  </dl>
                </div>
                <div className="flex flex-col justify-between bg-slate-950 p-5 text-white sm:p-7">
                  <div><p className="text-xs font-black tracking-[.12em] text-emerald-300">SLIDES &amp; QUIZ</p><p className="mt-3 text-sm leading-6 text-slate-200">スライドと確認クイズで要点を学び、朝礼・社内研修・配布資料として活用できます。</p></div>
                  <Link href={published.href} className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 font-black text-slate-950 hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white">今すぐ見る<ArrowRight className="h-5 w-5" aria-hidden="true" /></Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
