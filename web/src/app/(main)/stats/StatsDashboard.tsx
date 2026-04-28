"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TranslatedPageHeader } from "@/components/translated-page-header";
import { SITE_STATS } from "@/data/site-stats";
import { MHLW_MERGED_CHEMICAL_COUNT } from "@/lib/mhlw-chemicals";

// 直近30日の日次UU（モックデータ — 実数値が出るまで暫定）
function buildDailyUu(): { date: string; uu: number }[] {
  const today = new Date("2026-04-28T00:00:00Z");
  const result: { date: string; uu: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const md = `${d.getMonth() + 1}/${d.getDate()}`;
    // 緩やかに増加し週末で減少する波形
    const base = 38 + (29 - i) * 1.6;
    const weekend = d.getUTCDay() === 0 || d.getUTCDay() === 6 ? -10 : 0;
    const noise = Math.round(Math.sin((29 - i) / 2) * 6);
    result.push({ date: md, uu: Math.max(8, Math.round(base + weekend + noise)) });
  }
  return result;
}

const MONTHLY_UU = [
  { month: "2025-11", uu: 320 },
  { month: "2025-12", uu: 540 },
  { month: "2026-01", uu: 880 },
  { month: "2026-02", uu: 1120 },
  { month: "2026-03", uu: 1480 },
  { month: "2026-04", uu: 1740 },
];

const AI_USAGE = [
  { name: "法令チャットボット", value: 1280 },
  { name: "リスク予測", value: 540 },
  { name: "KY支援AI", value: 320 },
  { name: "化学物質RA", value: 260 },
];

const AI_PIE_COLORS = ["#1a7a4c", "#0f766e", "#0891b2", "#7c3aed"];

const FEEDBACK_DATA = [
  { category: "改善提案", value: 24 },
  { category: "質問", value: 18 },
  { category: "データ誤り", value: 9 },
  { category: "機能リクエスト", value: 14 },
  { category: "業務相談", value: 6 },
  { category: "その他", value: 3 },
];

const FEEDBACK_COLORS = ["#1a7a4c", "#0891b2", "#dc2626", "#7c3aed", "#ea580c", "#64748b"];

export function StatsDashboard() {
  const dailyUu = useMemo(() => buildDailyUu(), []);
  const cumulativeUu = useMemo(() => {
    let acc = 0;
    return MONTHLY_UU.map((m) => {
      acc += m.uu;
      return { month: m.month, total: acc };
    });
  }, []);

  const contentStats = useMemo(
    () => [
      {
        label: "通達・法令条文",
        value: SITE_STATS.lawArticleCount,
        unit: "条文",
        accent: "emerald" as const,
      },
      {
        label: "化学物質情報",
        value: MHLW_MERGED_CHEMICAL_COUNT.toLocaleString(),
        unit: "物質",
        accent: "sky" as const,
      },
      {
        label: "事故DB（10年統合）",
        value: SITE_STATS.accidents10yCount,
        unit: "件",
        accent: "red" as const,
      },
      {
        label: "事故DB（厚労省全件）",
        value: SITE_STATS.accidentDbCount,
        unit: "件",
        accent: "red" as const,
      },
      {
        label: "死亡災害DB",
        value: SITE_STATS.mhlwDeathsCount,
        unit: "件",
        accent: "red" as const,
      },
      {
        label: "サイト curated 詳細事例",
        value: SITE_STATS.siteCuratedCaseCount,
        unit: "件",
        accent: "amber" as const,
      },
    ],
    []
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 lg:px-8">
      <TranslatedPageHeader
        titleJa="利用統計（公開ダッシュボード）"
        titleEn="Public Usage Dashboard"
        descriptionJa="個人運営の研究プロジェクトの透明性のため、UU・コンテンツ・AI利用・フィードバックを公開しています。"
        descriptionEn="Public transparency dashboard for this independent research project."
        iconName="BarChart3"
        iconColor="emerald"
      />

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
        ※ UU 推移・AI 利用・フィードバック件数は実装途中の<strong>暫定モックデータ</strong>です。
        コンテンツ件数は実数値（一次出典は<a href="/about" className="underline">運営者情報</a>参照）。
      </div>

      {/* コンテンツ統計 */}
      <section
        aria-labelledby="content-stats-heading"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2 id="content-stats-heading" className="text-base font-bold text-slate-900">
          コンテンツ規模
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          一次ソース（厚労省・e-Gov）から取り込んでいる現在のレコード数。
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {contentStats.map((s) => {
            const tone =
              s.accent === "emerald"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : s.accent === "sky"
                  ? "border-sky-200 bg-sky-50 text-sky-900"
                  : s.accent === "red"
                    ? "border-red-200 bg-red-50 text-red-900"
                    : "border-amber-200 bg-amber-50 text-amber-900";
            return (
              <div
                key={s.label}
                className={`rounded-xl border p-3 text-center ${tone}`}
              >
                <p className="text-2xl font-bold leading-none">{s.value}</p>
                <p className="mt-1 text-[11px] font-medium">
                  {s.label} <span className="opacity-60">{s.unit}</span>
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 日次UU */}
      <section
        aria-labelledby="daily-uu-heading"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2 id="daily-uu-heading" className="text-base font-bold text-slate-900">
          UU推移（直近30日・日次）
        </h2>
        <div className="mt-4 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyUu} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id="uuFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1a7a4c" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#1a7a4c" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="uu" stroke="#1a7a4c" fill="url(#uuFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 月次UU */}
        <section
          aria-labelledby="monthly-uu-heading"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 id="monthly-uu-heading" className="text-base font-bold text-slate-900">
            UU推移（月次・6ヶ月）
          </h2>
          <div className="mt-4 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MONTHLY_UU} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="uu" fill="#0891b2" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* 累計UU */}
        <section
          aria-labelledby="cumulative-heading"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 id="cumulative-heading" className="text-base font-bold text-slate-900">
            累計UU
          </h2>
          <div className="mt-4 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cumulativeUu} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* AI利用 */}
        <section
          aria-labelledby="ai-usage-heading"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 id="ai-usage-heading" className="text-base font-bold text-slate-900">
            AI機能 利用回数（累計）
          </h2>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={AI_USAGE}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                  label={(entry) => `${entry.name}`}
                >
                  {AI_USAGE.map((_, idx) => (
                    <Cell key={idx} fill={AI_PIE_COLORS[idx % AI_PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* フィードバック */}
        <section
          aria-labelledby="feedback-heading"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 id="feedback-heading" className="text-base font-bold text-slate-900">
            フィードバック分布（直近）
          </h2>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={FEEDBACK_DATA}
                layout="vertical"
                margin={{ top: 10, right: 10, bottom: 0, left: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="category" type="category" tick={{ fontSize: 11 }} width={90} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {FEEDBACK_DATA.map((_, idx) => (
                    <Cell key={idx} fill={FEEDBACK_COLORS[idx % FEEDBACK_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <p className="text-[11px] text-slate-400">
        ※ 数値は今後、Vercel Web Analytics・サーバーログから自動更新する設計に移行します。
      </p>
    </div>
  );
}
