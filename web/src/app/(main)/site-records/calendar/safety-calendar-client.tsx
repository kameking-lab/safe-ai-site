"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SAFETY_CALENDAR, RECURRING_ITEMS, MONTH_LABEL, type CalendarItem } from "@/lib/site-records/safety-calendar";

function ItemRow({ item }: { item: CalendarItem }) {
  if (item.href) {
    return (
      <Link href={item.href} className="flex items-start gap-1.5 rounded-md px-1.5 py-1 text-sm text-emerald-800 hover:bg-emerald-50 dark:text-emerald-200 dark:hover:bg-emerald-500/10">
        <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
        <span className="underline decoration-emerald-300 underline-offset-2">{item.label}</span>
      </Link>
    );
  }
  return (
    <p className="flex items-start gap-1.5 px-1.5 py-1 text-sm text-slate-700 dark:text-slate-300">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" aria-hidden="true" />
      {item.label}
    </p>
  );
}

export function SafetyCalendarClient() {
  const [thisMonth, setThisMonth] = useState<number>(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 当月の強調はクライアントで（SSRハイドレーション差異回避）
    setThisMonth(new Date().getMonth() + 1);
  }, []);

  const nowMonth = SAFETY_CALENDAR.find((m) => m.month === thisMonth);

  return (
    <div className="space-y-6">
      {/* 今月やること（初見でも先頭で即到達。当月確定後にのみ表示しSSR差異を回避） */}
      {nowMonth && (
        <section className="rounded-2xl border-2 border-emerald-400 bg-emerald-50 p-5 shadow-sm ring-2 ring-emerald-300 dark:border-emerald-500/50 dark:bg-emerald-500/10">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-bold text-white">今月</span>
            <h2 className="text-lg font-bold text-emerald-900 dark:text-emerald-100">{MONTH_LABEL[nowMonth.month]}にやること</h2>
          </div>
          <div className="mt-2 space-y-0.5">
            {nowMonth.items.map((it) => (
              <ItemRow key={it.label} item={it} />
            ))}
          </div>
          <p className="mt-2 border-t border-emerald-200 pt-2 text-xs text-emerald-800 dark:border-emerald-500/30 dark:text-emerald-200">
            加えて、毎日のKY・作業前点検・受入教育などは下の「毎日・毎月・随時に行うこと」に常設されています。
          </p>
        </section>
      )}

      {/* 毎日・毎月・随時 */}
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 dark:border-emerald-500/30 dark:bg-emerald-500/5">
        <h2 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">毎日・毎月・随時に行うこと</h2>
        <div className="mt-2 grid grid-cols-1 gap-0.5 sm:grid-cols-2 lg:grid-cols-3">
          {RECURRING_ITEMS.map((it) => (
            <ItemRow key={it.label} item={it} />
          ))}
        </div>
      </section>

      {/* 月別 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SAFETY_CALENDAR.map((m) => {
          const isNow = m.month === thisMonth;
          return (
            <section
              key={m.month}
              className={`rounded-2xl border p-4 shadow-sm ${
                isNow ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-300 dark:border-emerald-500/50 dark:bg-emerald-500/10" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{MONTH_LABEL[m.month]}</h3>
                {isNow && <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">今月</span>}
              </div>
              <div className="mt-1.5 space-y-0.5">
                {m.items.map((it) => (
                  <ItemRow key={it.label} item={it} />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-[12px] leading-relaxed text-slate-500 dark:border-slate-700 dark:bg-slate-800/50">
        本カレンダーは全国安全週間・全国労働衛生週間・年末年始無災害運動などの全国的な運動期間と、季節リスク・主な定期事項を整理した
        <strong className="font-semibold">一般的な目安</strong>です。具体的な実施時期・対象・回数は、事業場の規模・業種・作業内容に応じて事業者が定め、所轄労働基準監督署・専門家にご確認ください。
      </p>
    </div>
  );
}
