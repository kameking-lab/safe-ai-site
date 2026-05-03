"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { getEntriesByMonth } from "@/lib/safety-diary/store";
import type { SafetyDiaryEntry } from "@/lib/safety-diary/schema";
import { computeMonthlySummary } from "@/lib/safety-diary/monthly-summary";

/** `202604` (6桁) または `2026-04` (7桁) を `YYYY-MM` に正規化 */
function normalizeYearMonth(raw: string): string {
  if (/^\d{6}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}`;
  }
  return raw;
}

export function DiaryMonthlyClient({ ym: rawYm }: { ym: string }) {
  const ym = normalizeYearMonth(rawYm);
  const [entries, setEntries] = useState<SafetyDiaryEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // localStorage はクライアント専用のため useEffect で読み込む必要がある
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEntries(getEntriesByMonth(ym));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoaded(true);
  }, [ym]);

  const summary = useMemo(() => computeMonthlySummary(entries, ym), [entries, ym]);
  const maxPeople = Math.max(1, ...summary.trendByDate.map((t) => t.people));

  // 類似事故Top3を予想災害カテゴリから集計（簡易：頻度カウント）
  const top3Disasters = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of entries) {
      for (const d of e.optional.predictedDisasters) {
        counts.set(d, (counts.get(d) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [entries]);

  // 前月・翌月リンク
  const [yStr, mStr] = ym.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8 print:max-w-none print:px-0 print:py-2">
      {/* グローバル CSS で header タグは print 時に非表示になるため div を使う */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:mb-3">
        <div>
          <Link
            href="/safety-diary"
            className="text-xs font-semibold text-slate-500 hover:underline print:hidden"
          >
            ← 一覧へ戻る
          </Link>
          <h1 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
            📊 {ym} 月次まとめ
          </h1>
          <p className="mt-1 hidden text-[10px] text-slate-600 print:block">
            出力日: {new Date().toLocaleDateString("ja-JP")}
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Link
            href={`/safety-diary/monthly/${prev}`}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            ← 前月
          </Link>
          <Link
            href={`/safety-diary/monthly/${next}`}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            翌月 →
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
            aria-label="月次まとめをPDF出力／印刷"
          >
            <Printer className="h-3.5 w-3.5" />
            PDFで出力／印刷
          </button>
        </div>
      </div>

      {!loaded && <p className="text-sm text-slate-500">読み込み中…</p>}

      {/* 概況 */}
      <section className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="記録日数" value={summary.totalEntries.toString()} unit="日" />
        <Stat label="延労働人数" value={summary.totalPeople.toLocaleString()} unit="人" />
        <Stat label="KY実施率" value={`${Math.round(summary.kyImplementationRate * 100)}`} unit="%" />
        <Stat label="ヒヤリ件数" value={summary.nearMissCount.toString()} unit="件" />
      </section>

      {/* 延労働人数推移 */}
      <section className="mb-4 break-inside-avoid rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900">延労働人数推移</h2>
        {summary.trendByDate.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">この月の記録はありません。</p>
        ) : (
          <ul className="mt-3 space-y-1">
            {summary.trendByDate.map((t) => (
              <li key={t.date} className="flex items-center gap-3 text-xs">
                <span className="w-20 shrink-0 font-mono text-slate-600">{t.date}</span>
                <div className="flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-3 rounded-full bg-emerald-400"
                    style={{ width: `${(t.people / maxPeople) * 100}%` }}
                    aria-label={`${t.people}人`}
                  />
                </div>
                <span className="w-12 text-right font-semibold text-slate-700">{t.people}人</span>
                {t.nearMiss && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                    ヒヤリ
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 類似事故Top3（予想災害カテゴリより） */}
      <section className="mb-4 break-inside-avoid rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900">類似事故Top3（予想災害カテゴリより集計）</h2>
        {top3Disasters.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">予想災害が記録されていません。</p>
        ) : (
          <ol className="mt-2 space-y-1 text-sm text-slate-700">
            {top3Disasters.map(([name, count], idx) => (
              <li key={name} className="flex items-center justify-between">
                <span>
                  {idx + 1}. {name}
                </span>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold">{count} 件</span>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-2 text-[11px] text-slate-500">
          詳細な事故データは <Link href="/accidents" className="font-semibold text-emerald-700 underline">/accidents</Link> で検索できます。
        </p>
      </section>

      {/* 関連法改正・気象連動 */}
      <section className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          href="/laws"
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-emerald-400"
        >
          <p className="text-xs font-bold text-emerald-700">関連法改正</p>
          <p className="mt-1 text-sm font-bold text-slate-900">
            この月の対象施行は /laws で確認 →
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            日誌に紐づく法改正タグ: {summary.relatedLawCount} 件
          </p>
        </Link>
        <Link
          href="/signage"
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-emerald-400"
        >
          <p className="text-xs font-bold text-emerald-700">気象警報の取り込み</p>
          <p className="mt-1 text-sm font-bold text-slate-900">/signage で当日の警報を確認 →</p>
          <p className="mt-1 text-[11px] text-slate-500">
            日誌に紐づく警報情報を朝礼で共有しましょう。
          </p>
        </Link>
      </section>

      {/* AIサマリー */}
      <section className="break-inside-avoid rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
        <p className="text-xs font-bold text-emerald-800">AIサマリー</p>
        <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed text-emerald-900">
{summary.aiSummary}
        </pre>
        <p className="mt-2 text-[10px] text-emerald-800/80">
          ※ 現状はテンプレ生成。将来的に Gemini と連携して自動要約します。
        </p>
      </section>
    </main>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-center shadow-sm">
      <p className="text-[10px] font-semibold text-slate-500">{label}</p>
      <p className="mt-0.5 text-2xl font-bold text-emerald-700">
        {value}
        <span className="text-xs font-normal text-slate-500">{unit}</span>
      </p>
    </div>
  );
}
