"use client";

import { useCallback, useState } from "react";
import { Loader2, TrendingUp } from "lucide-react";

interface Bucket {
  label: string;
  count: number;
}
interface Trend {
  periodLabel: string;
  total: number;
  byType: Bucket[];
  byIndustry: Bucket[];
}
interface SokuhouTop {
  name: string;
  total: number;
}
interface Sokuhou {
  fetchedAt: string | null;
  sibouPeriod: string | null;
  sisyouPeriod: string | null;
  topSibou: SokuhouTop[];
  topSisyou: SokuhouTop[];
  sourceUrl: string;
}
interface EvidenceScope {
  officialRepublished: number;
  curated: number;
  excludedSynthetic: number;
  excludedPreliminary: number;
}

function BucketList({ title, rows }: { title: string; rows: Bucket[] }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-700">{title}</h3>
      <ul className="mt-1 space-y-1 text-xs text-slate-800">
        {rows.map((row) => (
          <li
            key={row.label}
            className="flex justify-between gap-3 border-b border-slate-100 pb-1"
          >
            <span>{row.label}</span>
            <span className="font-mono">{row.count}件</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AccidentTrendSummary() {
  const [months, setMonths] = useState<"1" | "3" | "12">("12");
  const [busy, setBusy] = useState(false);
  const [trend, setTrend] = useState<Trend | null>(null);
  const [sokuhou, setSokuhou] = useState<Sokuhou | null>(null);
  const [evidenceScope, setEvidenceScope] = useState<EvidenceScope | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setBusy(true);
    setError(null);
    setTrend(null);
    setSokuhou(null);
    setEvidenceScope(null);
    try {
      const response = await fetch(
        `/api/accidents/trend-summary?months=${months}`,
      );
      const data = (await response.json()) as {
        ok?: boolean;
        trend?: Trend;
        sokuhou?: Sokuhou;
        evidenceScope?: EvidenceScope;
      };
      if (!response.ok || !data.ok || !data.trend) {
        setError("集計を取得できませんでした。");
        return;
      }
      setTrend(data.trend);
      setSokuhou(data.sokuhou ?? null);
      setEvidenceScope(data.evidenceScope ?? null);
    } catch {
      setError("通信に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setBusy(false);
    }
  }, [months]);

  return (
    <section className="mt-4 space-y-3 rounded-2xl border border-amber-200 bg-amber-50/50 p-4 sm:p-5">
      <h2 className="flex items-center gap-2 text-base font-bold text-slate-950">
        <TrendingUp className="h-5 w-5 text-amber-700" aria-hidden="true" />
        事故参考事例の期間集計
      </h2>
      <p className="text-xs leading-5 text-slate-700">
        本サイトの事故参考事例を決定論的に集計します。AIによる傾向説明は行わず、公式統計とも区別して表示します。
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm font-semibold text-slate-800">
          集計期間
          <select
            value={months}
            onChange={(event) =>
              setMonths(event.target.value as "1" | "3" | "12")
            }
            className="ml-2 min-h-[44px] rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm"
          >
            <option value="1">直近1か月</option>
            <option value="3">直近3か月</option>
            <option value="12">直近1年</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => void run()}
          disabled={busy}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-amber-800 px-4 py-2 text-sm font-bold text-white hover:bg-amber-900 disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <TrendingUp className="h-4 w-4" aria-hidden="true" />
          )}
          {busy ? "集計中…" : "集計を表示"}
        </button>
      </div>

      {error ? (
        <p className="text-sm font-semibold text-rose-800" role="alert">
          {error}
        </p>
      ) : null}

      {trend ? (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-bold text-slate-950">
            {trend.periodLabel}の事例標本：{trend.total}件
          </p>
          {evidenceScope ? (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs leading-5 text-indigo-950">
              <p className="font-bold">集計根拠の範囲（公式統計ではありません）</p>
              <p>
                厚生労働省公開事例の再収録 {evidenceScope.officialRepublished}件、
                編集済み事例 {evidenceScope.curated}件。架空の学習例{" "}
                {evidenceScope.excludedSynthetic}件と速報に基づく想定例{" "}
                {evidenceScope.excludedPreliminary}件は除外しています。
              </p>
            </div>
          ) : null}
          {trend.total === 0 ? (
            <p className="text-xs text-slate-600">
              この期間の事例標本はありません。期間を広げてください。
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <BucketList title="事故型別（上位）" rows={trend.byType} />
              <BucketList title="業種別（上位）" rows={trend.byIndustry} />
            </div>
          )}

          {sokuhou &&
          (sokuhou.topSibou.length > 0 || sokuhou.topSisyou.length > 0) ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <h3 className="text-xs font-bold text-amber-950">
                厚生労働省 月次速報（公式の速報値）
              </h3>
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <BucketList
                  title="死亡災害が多い業種"
                  rows={sokuhou.topSibou.map((row) => ({
                    label: row.name,
                    count: row.total,
                  }))}
                />
                <BucketList
                  title="死傷災害が多い業種"
                  rows={sokuhou.topSisyou.map((row) => ({
                    label: row.name,
                    count: row.total,
                  }))}
                />
              </div>
              <a
                href={sokuhou.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex min-h-[44px] items-center text-xs font-bold text-blue-800 underline"
              >
                厚生労働省の速報原文を開く
              </a>
            </div>
          ) : null}

          <p className="text-[11px] leading-5 text-slate-600">
            本サイト事例の件数は発生率や全国傾向を示しません。確定統計は厚生労働省・e-Statの一次資料を確認してください。
          </p>
        </div>
      ) : null}
    </section>
  );
}
