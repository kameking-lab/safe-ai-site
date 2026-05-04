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
import { Download, Info, ChevronDown, ChevronUp } from "lucide-react";
import type { AccidentCase } from "@/lib/types/domain";
import { SITE_STATS } from "@/data/site-stats";

const PIE_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6",
  "#f59e0b", "#6366f1",
];

type Props = {
  cases: AccidentCase[];
};

function countBy<T>(items: T[], key: (item: T) => string): { name: string; value: number }[] {
  const map = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function extractYear(occurredOn: string): string {
  const m = occurredOn.match(/(\d{4})/);
  return m ? m[1] : "不明";
}

function downloadCsv(cases: AccidentCase[]) {
  const headers = ["ID", "タイトル", "発生日", "事故種別", "業種", "重篤度", "概要"];
  const rows = cases.map((c) => [
    c.id,
    `"${c.title.replace(/"/g, '""')}"`,
    c.occurredOn ?? "",
    c.type,
    c.workCategory,
    c.severity,
    `"${c.summary.replace(/"/g, '""')}"`,
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const bom = "\uFEFF";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "accident_cases.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function DataSourceNote({ yearRange, count }: { yearRange: string; count: number }) {
  return (
    <p className="mt-2 text-[10px] text-amber-600">
      出典: 当サイト収録事例（参考・統計的代表性なし）　|　集計期間: {yearRange}　|　N={count}件
    </p>
  );
}

function SiteDataDisclaimer() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
      ⚠ このタブは当サイト独自収集の参考事例です。統計的代表性はありません。
      厚労省公式統計（N={SITE_STATS.accidentDbCount}件・
      <a
        href="https://anzeninfo.mhlw.go.jp/anzen_pg/SAI_DET.aspx"
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:text-amber-900"
      >
        出典: 職場のあんぜんサイト
      </a>
      ）は「<strong>MHLW実データ分析</strong>」タブをご覧ください。
    </div>
  );
}

function MethodologyAccordion({ yearRange, count }: { yearRange: string; count: number }) {
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
        {open ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
      </button>
      {open && (
        <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-600 space-y-2">
          <div>
            <p className="font-semibold text-slate-700">データ収集方法</p>
            <p>厚生労働省が公表する労働災害統計（死傷病報告・休業4日以上の労働災害）および当サイトで独自収録した事故事例を組み合わせています。</p>
          </div>
          <div>
            <p className="font-semibold text-slate-700">集計基準</p>
            <ul className="mt-0.5 list-disc pl-4 space-y-0.5">
              <li>集計期間: {yearRange}（発生年ベース）</li>
              <li>総収録件数: N={count} 件</li>
              <li>業種分類は厚労省の業種区分に準拠（一部簡略化）</li>
              <li>事故種別は労働安全衛生法施行規則の区分に基づく</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-slate-700">注意事項</p>
            <ul className="mt-0.5 list-disc pl-4 space-y-0.5 text-slate-500">
              <li>当サイト収録事例は独自収集のため、統計的偏りがあります</li>
              <li>全労働災害を網羅するものではありません</li>
              <li>軽微な災害（休業3日以内）は含まれない場合があります</li>
              <li>正確な統計は<a href="https://www.mhlw.go.jp/bunya/roudoukijun/anzeneisei11.html" target="_blank" rel="noreferrer" className="underline text-blue-600">厚生労働省公式サイト</a>をご確認ください</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export function AccidentAnalysisPanel({ cases }: Props) {
  const typeData = useMemo(() => countBy(cases, (c) => c.type).slice(0, 10), [cases]);
  const industryData = useMemo(() => countBy(cases, (c) => c.workCategory).slice(0, 10), [cases]);
  const yearData = useMemo(() => {
    const raw = countBy(cases, (c) => extractYear(c.occurredOn ?? ""));
    return raw
      .filter((d) => d.name !== "不明")
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [cases]);

  const yearRange = useMemo(() => {
    if (yearData.length === 0) return "—";
    const years = yearData.map((d) => d.name);
    const min = years[0];
    const max = years[years.length - 1];
    return min === max ? min : `${min}〜${max}年`;
  }, [yearData]);

  return (
    <div className="space-y-6">
      <SiteDataDisclaimer />
      {/* CSVエクスポート */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {cases.length}件のデータを集計しています（当サイト収録事例）
        </p>
        <button
          onClick={() => downloadCsv(cases)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          CSVエクスポート
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 事故種別 円グラフ */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-slate-800">事故種別の割合</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={typeData}
                cx="50%"
                cy="50%"
                outerRadius={80}
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
              <Tooltip formatter={(v) => [`${v}件`, "件数"]} />
            </PieChart>
          </ResponsiveContainer>
          {/* 凡例 */}
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
          <DataSourceNote yearRange={yearRange} count={cases.length} />
        </div>

        {/* 業種別 棒グラフ */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-slate-800">業種別の件数</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={industryData} layout="vertical" margin={{ left: 8, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="name"
                width={56}
                tick={{ fontSize: 11 }}
              />
              <Tooltip formatter={(v) => [`${v}件`, "件数"]} />
              <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <DataSourceNote yearRange={yearRange} count={cases.length} />
        </div>
      </div>

      {/* 年度推移 折れ線グラフ */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-slate-800">年度別 事故件数の推移</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={yearData} margin={{ left: 0, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => [`${v}件`, "件数"]} />
            <Legend />
            <Line
              type="monotone"
              dataKey="value"
              name="件数"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
        <DataSourceNote yearRange={yearRange} count={cases.length} />
      </div>

      <MethodologyAccordion yearRange={yearRange} count={cases.length} />
    </div>
  );
}
