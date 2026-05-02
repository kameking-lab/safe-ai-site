"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus, ListChecks, Calendar, AlertTriangle } from "lucide-react";
import { loadEntries } from "@/lib/safety-diary/store";
import type { SafetyDiaryEntry } from "@/lib/safety-diary/schema";
import { computeMonthlySummary } from "@/lib/safety-diary/monthly-summary";

function currentYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function DiaryListClient() {
  const [entries, setEntries] = useState<SafetyDiaryEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // localStorage はクライアント専用のため useEffect で読み込む必要がある
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEntries(loadEntries());
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoaded(true);
  }, []);

  const ym = currentYearMonth();
  const thisMonthEntries = useMemo(
    () => entries.filter((e) => e.required.date.startsWith(ym)),
    [entries, ym]
  );
  const summary = useMemo(
    () => computeMonthlySummary(thisMonthEntries, ym),
    [thisMonthEntries, ym]
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">📓 安全衛生日誌</h1>
          <p className="mt-1 text-xs text-slate-600 sm:text-sm">
            必須5項目を3〜5分で記録、任意8項目で詳細化。月次まとめでトレンド可視化。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/safety-diary/new"
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            新規（必須5項目）
          </Link>
          <Link
            href="/safety-diary/new/detail"
            className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-4 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-50"
          >
            詳細モード
          </Link>
          <Link
            href={`/safety-diary/monthly/${ym}`}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Calendar className="h-4 w-4" />
            今月のまとめ
          </Link>
        </div>
      </header>

      {/* 月次トレンド（簡易） */}
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-bold text-emerald-700">{ym} の概況</p>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="記録日数" value={summary.totalEntries.toString()} unit="日" />
          <Stat label="延労働人数" value={summary.totalPeople.toLocaleString()} unit="人" />
          <Stat
            label="KY実施率"
            value={`${Math.round(summary.kyImplementationRate * 100)}`}
            unit="%"
          />
          <Stat label="ヒヤリ件数" value={summary.nearMissCount.toString()} unit="件" />
        </div>
      </section>

      {/* 一覧 */}
      <section>
        <h2 className="mb-2 text-sm font-bold text-slate-900">記録一覧（新しい順）</h2>
        {!loaded ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            読み込み中…
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
            <ListChecks className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-2 text-sm font-semibold text-slate-700">記録はまだありません</p>
            <p className="mt-1 text-xs text-slate-500">「新規（必須5項目）」から始めましょう。</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {[...entries]
              .sort((a, b) => b.required.date.localeCompare(a.required.date))
              .map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/safety-diary/${e.id}`}
                    className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-400 hover:shadow-md"
                  >
                    <div className="text-center">
                      <p className="text-xs font-semibold text-slate-500">{e.required.date}</p>
                      <p className="text-[10px] text-slate-400">{e.required.weather}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {e.required.siteName}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-slate-600">
                        {e.required.workContent}
                      </p>
                    </div>
                    {e.required.nearMissOccurred && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        <AlertTriangle className="h-3 w-3" />
                        ヒヤリ
                      </span>
                    )}
                  </Link>
                </li>
              ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center">
      <p className="text-[10px] font-semibold text-slate-500">{label}</p>
      <p className="mt-0.5 text-lg font-bold text-emerald-700">
        {value}
        <span className="text-xs font-normal text-slate-500">{unit}</span>
      </p>
    </div>
  );
}
