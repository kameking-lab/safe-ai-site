"use client";

import { useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { ChevronDown, ChevronUp, Download, Info, ShieldCheck } from "lucide-react";
import byYear from "@/data/aggregates-mhlw/accidents-by-year.json";
import byIndustry from "@/data/aggregates-mhlw/accidents-by-industry.json";
import byAge from "@/data/aggregates-mhlw/accidents-by-age.json";
import byMonth from "@/data/aggregates-mhlw/accidents-by-month.json";
import deathsByYear from "@/data/aggregates-mhlw/deaths-by-year.json";
import deathsByIndustry from "@/data/aggregates-mhlw/deaths-by-industry.json";
import { SITE_STATS } from "@/data/site-stats";
import meta from "@/data/aggregates-mhlw/meta.json";

const PIE_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6",
  "#f59e0b", "#6366f1", "#a3e635", "#0ea5e9",
  "#fb7185", "#84cc16", "#f43f5e",
];

type YearMap = Record<string, Record<string, number>>;
type MonthMap = Record<string, number>;

const byYearData = byYear as YearMap;
const byIndustryData = byIndustry as YearMap;
const byAgeData = byAge as YearMap;
const byMonthData = byMonth as MonthMap;
const deathsByYearData = deathsByYear as YearMap;
const deathsByIndustryData = deathsByIndustry as YearMap;

const DEATHS_RANGE_LABEL = "令和元年〜令和5年（2019〜2023）";
const DEATHS_SOURCE_URL = "https://anzeninfo.mhlw.go.jp/anzen_pg/SIB_FND.aspx";
const DEATHS_SOURCE_LABEL = "厚生労働省 職場のあんぜんサイト 死亡災害DB";

const AGE_LABELS: Record<string, string> = {
  "-19": "〜19歳",
  "20-29": "20〜29歳",
  "30-39": "30〜39歳",
  "40-49": "40〜49歳",
  "50-59": "50〜59歳",
  "60-69": "60〜69歳",
  "70+": "70歳〜",
  "unknown": "不明",
};

const AGE_ORDER = ["-19", "20-29", "30-39", "40-49", "50-59", "60-69", "70+", "unknown"];

const YEAR_RANGE_LABEL = "平成18年（2006年）〜令和3年（2021年）";
const DATA_SOURCE_URL = "https://anzeninfo.mhlw.go.jp/anzen_pg/SAI_DB.aspx";
const DATA_SOURCE_LABEL = "厚生労働省 職場のあんぜんサイト 労働災害（死傷）月別DB";

function sumNested(map: YearMap): { name: string; value: number }[] {
  const totals = new Map<string, number>();
  for (const year of Object.keys(map)) {
    const inner = map[year];
    for (const [k, v] of Object.entries(inner)) {
      totals.set(k, (totals.get(k) ?? 0) + v);
    }
  }
  return Array.from(totals.entries())
    .filter(([name]) => name && name !== "#REF!" && name !== "分類不能")
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function yearlyTotals(map: YearMap): { name: string; value: number }[] {
  return Object.keys(map)
    .sort()
    .map((year) => ({
      name: year,
      value: Object.values(map[year]).reduce((a, b) => a + b, 0),
    }));
}

function ageDistribution(map: YearMap): { name: string; value: number }[] {
  const totals = new Map<string, number>();
  for (const year of Object.keys(map)) {
    for (const [k, v] of Object.entries(map[year])) {
      totals.set(k, (totals.get(k) ?? 0) + v);
    }
  }
  return AGE_ORDER.filter((k) => totals.has(k)).map((k) => ({
    name: AGE_LABELS[k] ?? k,
    value: totals.get(k) ?? 0,
  }));
}

function monthlyAverage(map: MonthMap): { name: string; value: number }[] {
  const buckets = new Map<number, { sum: number; n: number }>();
  for (const [ym, v] of Object.entries(map)) {
    const mm = Number(ym.slice(5, 7));
    if (!Number.isFinite(mm)) continue;
    const b = buckets.get(mm) ?? { sum: 0, n: 0 };
    b.sum += v;
    b.n += 1;
    buckets.set(mm, b);
  }
  return Array.from({ length: 12 }, (_, i) => {
    const mm = i + 1;
    const b = buckets.get(mm);
    const avg = b && b.n > 0 ? Math.round(b.sum / b.n) : 0;
    return { name: `${mm}月`, value: avg };
  });
}

function exportAggregatesCsv() {
  const lines: string[] = [];
  lines.push("カテゴリ,項目,件数");
  for (const { name, value } of sumNested(byYearData)) {
    lines.push(`事故種別,${name},${value}`);
  }
  for (const { name, value } of sumNested(byIndustryData)) {
    lines.push(`業種,${name},${value}`);
  }
  for (const { name, value } of yearlyTotals(byYearData)) {
    lines.push(`年度,${name},${value}`);
  }
  for (const { name, value } of ageDistribution(byAgeData)) {
    lines.push(`年齢,${name},${value}`);
  }
  const csv = lines.join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mhlw-accident-aggregates.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function formatUpdatedAt(iso: string): string {
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return iso;
  }
}

function MethodologyAccordion() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
        aria-expanded={open}
      >
        <span className="flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5 text-slate-400" />
          このデータについて
        </span>
        {open ? (
          <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        )}
      </button>
      {open && (
        <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-600 space-y-2">
          <div>
            <p className="font-semibold text-slate-700">データ出典</p>
            <p>
              厚生労働省 職場のあんぜんサイト「労働災害（死傷）月別データベース」を
              当サイトのETLパイプラインで取り込み、年・業種・事故種別・年齢・月の5軸で集計した結果です。
            </p>
            <p className="mt-1">
              一次ソース:&nbsp;
              <a href={DATA_SOURCE_URL} target="_blank" rel="noreferrer" className="underline text-blue-600">
                {DATA_SOURCE_LABEL}
              </a>
            </p>
          </div>
          <div>
            <p className="font-semibold text-slate-700">集計基準</p>
            <ul className="mt-0.5 list-disc pl-4 space-y-0.5">
              <li>対象期間: {YEAR_RANGE_LABEL}（発生年ベース、16年分）</li>
              <li>総件数: N={meta.accidents.total.toLocaleString()} 件</li>
              <li>対象災害: 休業4日以上の労働災害（死亡災害含む）</li>
              <li>業種分類は厚労省の業種区分に準拠</li>
              <li>事故種別は労働安全衛生法施行規則の区分に基づく</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-slate-700">注意事項</p>
            <ul className="mt-0.5 list-disc pl-4 space-y-0.5 text-slate-500">
              <li>一部の旧表記（例「畜産･水産業」）は類似業種に内包している場合があります</li>
              <li>軽微な災害（休業3日以内）は原則含まれません</li>
              <li>最新年の速報値と確定値で件数が異なる場合があります</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function SourceFooter({ label }: { label?: string } = {}) {
  return (
    <p className="mt-2 text-[10px] text-slate-400">
      出典: {label ?? DATA_SOURCE_LABEL}　|　集計期間: {YEAR_RANGE_LABEL}　|　N={meta.accidents.total.toLocaleString()}件
    </p>
  );
}

function DeathSourceFooter() {
  return (
    <p className="mt-2 text-[10px] text-slate-400">
      出典: {DEATHS_SOURCE_LABEL}　|　集計期間: {DEATHS_RANGE_LABEL}　|　N={SITE_STATS.mhlwDeathsCount}件（死亡災害）
    </p>
  );
}

export function MhlwAccidentAnalysisPanel() {
  const typeData = useMemo(() => sumNested(byYearData).slice(0, 12), []);
  const industryData = useMemo(() => sumNested(byIndustryData).slice(0, 12), []);
  const yearTrend = useMemo(() => yearlyTotals(byYearData), []);
  const ageData = useMemo(() => ageDistribution(byAgeData), []);
  const monthlyAvg = useMemo(() => monthlyAverage(byMonthData), []);
  const updatedAt = useMemo(() => formatUpdatedAt(meta.generatedAt), []);

  // 死亡災害 vs 休業4日以上 の年次推移オーバーレイ
  const yearOverlay = useMemo(() => {
    const allYears = Array.from(
      new Set([...Object.keys(byYearData), ...Object.keys(deathsByYearData)])
    ).sort();
    const accTotals = new Map<string, number>();
    for (const y of Object.keys(byYearData)) {
      accTotals.set(y, Object.values(byYearData[y]).reduce((a, b) => a + b, 0));
    }
    const deathTotals = new Map<string, number>();
    for (const y of Object.keys(deathsByYearData)) {
      deathTotals.set(y, Object.values(deathsByYearData[y]).reduce((a, b) => a + b, 0));
    }
    return allYears.map((y) => ({
      name: y,
      accident: accTotals.get(y) ?? null,
      death: deathTotals.get(y) ?? null,
    }));
  }, []);

  // 死亡災害 業種別 / 事故型別 ランキング（全期間合計）
  const deathsByIndustryRanking = useMemo(
    () => sumNested(deathsByIndustryData).slice(0, 10),
    []
  );
  const deathsByTypeRanking = useMemo(
    () => sumNested(deathsByYearData).slice(0, 10),
    []
  );
  const deathsTotal = useMemo(
    () => yearOverlay.reduce((s, r) => s + (r.death ?? 0), 0),
    [yearOverlay]
  );

  return (
    <div className="space-y-6">
      {/* ヘッダーバナー */}
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-sky-50 p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800">
                  本物の厚労省労働災害統計 N={meta.accidents.total.toLocaleString()}件
                </h3>
                <span className="inline-flex items-center rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                  MHLW実データ
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                期間: {YEAR_RANGE_LABEL}（16年分）　|　出典:&nbsp;
                <a
                  href={DATA_SOURCE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-blue-700"
                >
                  {DATA_SOURCE_LABEL}
                </a>
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                最終更新: {updatedAt}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={exportAggregatesCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm hover:bg-emerald-50 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            集計CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 事故種別 円グラフ */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-slate-800">事故種別の割合（全期間）</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={typeData}
                cx="50%"
                cy="50%"
                outerRadius={84}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                }
                labelLine={false}
              >
                {typeData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [`${Number(v).toLocaleString()}件`, "件数"]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {typeData.map((d, i) => (
              <span key={d.name} className="flex items-center gap-1 text-xs text-slate-600">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                />
                {d.name}
              </span>
            ))}
          </div>
          <SourceFooter />
        </div>

        {/* 業種別 棒グラフ */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-slate-800">業種別の件数（全期間）</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={industryData} layout="vertical" margin={{ left: 8, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={84} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${Number(v).toLocaleString()}件`, "件数"]} />
              <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <SourceFooter />
        </div>
      </div>

      {/* 年度推移 折れ線グラフ */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-slate-800">
          年度別 事故件数の推移（2006〜2021、16年分）
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={yearTrend} margin={{ left: 0, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => [`${Number(v).toLocaleString()}件`, "件数"]} />
            <Legend />
            <Line
              type="monotone"
              dataKey="value"
              name="年間件数"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
        <SourceFooter />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 年齢別 棒グラフ */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-slate-800">年齢別の件数（全期間）</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ageData} margin={{ left: 0, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${Number(v).toLocaleString()}件`, "件数"]} />
              <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <SourceFooter />
        </div>

        {/* 月別平均 折れ線 */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-slate-800">月別 平均発生件数（16年平均）</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyAvg} margin={{ left: 0, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${Number(v).toLocaleString()}件`, "月平均"]} />
              <Line
                type="monotone"
                dataKey="value"
                name="月平均"
                stroke="#14b8a6"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
          <SourceFooter />
        </div>
      </div>

      {/* 死亡災害セクション */}
      <div className="rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50 to-amber-50 p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              死亡災害 N={deathsTotal.toLocaleString()}件（{DEATHS_RANGE_LABEL}）
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              死亡災害（死亡 1 名以上）と休業 4 日以上の労働災害を並べて比較。休業 4 日以上データは 2006〜2021、死亡災害データは 2019〜2023 のため重複期間（2019〜2021）で両者が描画されます。
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              出典:&nbsp;
              <a href={DEATHS_SOURCE_URL} target="_blank" rel="noreferrer" className="underline text-blue-700">
                {DEATHS_SOURCE_LABEL}
              </a>
              　|　最終更新: {updatedAt}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-slate-800">
          年次推移オーバーレイ（死亡災害 vs 休業4日以上）
        </h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={yearOverlay} margin={{ left: 0, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11 }}
              label={{ value: "死亡", angle: -90, position: "insideRight", fontSize: 10 }}
            />
            <Tooltip
              formatter={(v, name) => {
                if (v == null) return ["-", name];
                return [`${Number(v).toLocaleString()}件`, name];
              }}
            />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="accident"
              name="休業4日以上（左軸）"
              stroke="#3b82f6"
              strokeWidth={2}
              connectNulls={false}
              dot={{ r: 3 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="death"
              name="死亡災害（右軸）"
              stroke="#ef4444"
              strokeWidth={2}
              connectNulls={false}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
        <p className="mt-2 text-[10px] text-slate-400">
          出典（左軸）: {DATA_SOURCE_LABEL} N={meta.accidents.total.toLocaleString()}件 {YEAR_RANGE_LABEL} /
          出典（右軸）: {DEATHS_SOURCE_LABEL} N={SITE_STATS.mhlwDeathsCount}件 {DEATHS_RANGE_LABEL}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-slate-800">
            死亡災害 業種別ランキング（トップ10）
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={deathsByIndustryRanking} layout="vertical" margin={{ left: 8, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${Number(v).toLocaleString()}件`, "死亡"]} />
              <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <DeathSourceFooter />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-slate-800">
            死亡災害 事故型別ランキング（トップ10）
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={deathsByTypeRanking} layout="vertical" margin={{ left: 8, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${Number(v).toLocaleString()}件`, "死亡"]} />
              <Bar dataKey="value" fill="#f97316" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <DeathSourceFooter />
        </div>
      </div>

      <MethodologyAccordion />
    </div>
  );
}
