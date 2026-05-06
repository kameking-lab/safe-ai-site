"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TranslatedPageHeader } from "@/components/translated-page-header";
import type { StatsPeriod, StatsResponse } from "@/lib/stats/types";

const PERIODS: Array<{ id: StatsPeriod; label: string }> = [
  { id: "7d", label: "直近 7 日" },
  { id: "30d", label: "直近 30 日" },
  { id: "90d", label: "直近 90 日" },
];

const PIE_COLORS = [
  "#1a7a4c",
  "#0f766e",
  "#0891b2",
  "#7c3aed",
  "#dc2626",
  "#ea580c",
  "#64748b",
  "#a21caf",
];

function formatNum(n: number): string {
  return n.toLocaleString("ja-JP");
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  if (m === 0) return `${s}秒`;
  return `${m}分${s.toString().padStart(2, "0")}秒`;
}

function formatPct(v: number, digits = 1): string {
  return `${(v * 100).toFixed(digits)}%`;
}

function deltaPill(delta: number, invertColor = false, hide = false) {
  if (hide) {
    return (
      <span className="ml-2 inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
        −
      </span>
    );
  }
  const positive = delta >= 0;
  const good = invertColor ? !positive : positive;
  const tone = good
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-rose-200 bg-rose-50 text-rose-700";
  const sign = positive ? "+" : "";
  return (
    <span className={`ml-2 inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${tone}`}>
      {sign}
      {delta.toFixed(1)}%
    </span>
  );
}

export function StatsDashboard() {
  const [period, setPeriod] = useState<StatsPeriod>("30d");
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // 期間切替時にローディング表示へ戻すための同期 setState（意図的）
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    fetch(`/api/stats?period=${period}`, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<StatsResponse>;
      })
      .then((json) => {
        if (cancelled) return;
        setData(json);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "fetch failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 lg:px-8">
      <TranslatedPageHeader
        titleJa="利用統計（公開ダッシュボード）"
        titleEn="Public Usage Dashboard"
        descriptionJa="個人運営の研究プロジェクトの透明性のため、UU・PV・AI 利用・流入元・コンバージョンを公開しています。"
        descriptionEn="Public transparency dashboard for this independent research project."
        iconName="BarChart3"
        iconColor="emerald"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="期間切替" className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-0.5 text-xs">
          {PERIODS.map((p) => {
            const active = period === p.id;
            return (
              <button
                key={p.id}
                role="tab"
                aria-selected={active}
                onClick={() => setPeriod(p.id)}
                className={`rounded-full px-3 py-1 font-semibold transition-colors ${
                  active
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <DataSourceBadge data={data} loading={loading} />
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          データ取得に失敗しました: {error}
        </div>
      ) : null}

      {!loading && data && (data.source !== "ga4" || data.summary.pv === 0) ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-bold">📊 実データ収集中</p>
          <p className="mt-1 text-xs leading-relaxed">
            このダッシュボードは現在
            {data.source === "ga4"
              ? "GA4 に接続済みですが、計測データがまだ少ないため一部指標が 0 になっています。"
              : "GA4 Data API が未接続のため、サンプル（モック）データを表示しています。"}
            機能別利用・ページ別アクセス・コンバージョンは{" "}
            <strong>※ サンプルデータ</strong> を含みます。実数値は GA4 接続および利用蓄積後に反映されます。
          </p>
        </div>
      ) : null}

      {loading || !data ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          読み込み中…
        </div>
      ) : (
        <>
          <SectionSummary data={data} />
          <SectionFeatures data={data} />
          <SectionPages data={data} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SectionSources data={data} />
            <SectionFlow data={data} />
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SectionConversions data={data} />
            <SectionChatbot data={data} />
          </div>
          <SectionInsights data={data} />
          <p className="text-[11px] text-slate-400">
            ※ GA4 Data API 未接続時は <strong>モックデータ</strong>を表示します。接続手順は <code className="rounded bg-slate-100 px-1">web/src/lib/stats/ga4-client.ts</code> 冒頭コメント参照。
          </p>
        </>
      )}
    </div>
  );
}

function DataSourceBadge({ data, loading }: { data: StatsResponse | null; loading: boolean }) {
  if (loading || !data) return null;
  const isLive = data.source === "ga4";
  const tone = isLive
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-amber-200 bg-amber-50 text-amber-700";
  const label = isLive ? "GA4 ライブ" : "モックデータ";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${tone}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${isLive ? "bg-emerald-500" : "bg-amber-500"}`} />
      {label}
    </span>
  );
}

/* ──────────────────────────────────────────────────────────
 * Section 1: サマリ
 * ────────────────────────────────────────────────────────── */
function SectionSummary({ data }: { data: StatsResponse }) {
  const s = data.summary;
  const cards: Array<{
    label: string;
    value: string;
    rawValue: number;
    delta: number;
    invertColor?: boolean;
  }> = [
    { label: "DAU（直近 1 日）", value: formatNum(s.dau), rawValue: s.dau, delta: s.deltas.dau },
    { label: "MAU（直近 30 日）", value: formatNum(s.mau), rawValue: s.mau, delta: s.deltas.mau },
    { label: "PV（期間内合計）", value: formatNum(s.pv), rawValue: s.pv, delta: s.deltas.pv },
    {
      label: "平均セッション時間",
      value: formatDuration(s.avgSessionSec),
      rawValue: s.avgSessionSec,
      delta: s.deltas.avgSessionSec,
    },
    {
      label: "直帰率",
      value: formatPct(s.bounceRate),
      rawValue: s.bounceRate,
      delta: s.deltas.bounceRate,
      invertColor: true,
    },
  ];
  return (
    <Section
      heading="サマリ"
      subheading="主要指標と前期間比（値が 0 の指標は前期間比を非表示）"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-medium text-slate-600">{c.label}</p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              {c.value}
              {deltaPill(c.delta, c.invertColor, c.rawValue === 0)}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ──────────────────────────────────────────────────────────
 * Section 2: 機能別利用
 * ────────────────────────────────────────────────────────── */
function SectionFeatures({ data }: { data: StatsResponse }) {
  const sorted = useMemo(() => [...data.features].sort((a, b) => b.pv - a.pv), [data.features]);
  const isSample = data.source !== "ga4" || sorted.every((f) => f.pv === 0);
  return (
    <Section
      heading={`機能別利用${isSample ? "（※ サンプルデータ）" : ""}`}
      subheading="7 目玉機能の PV / 滞在 / 利用率"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-left text-slate-500">
            <tr>
              <th className="pb-2">機能</th>
              <th className="pb-2 text-right">PV</th>
              <th className="pb-2 text-right">平均滞在</th>
              <th className="pb-2 text-right">利用率（DAU比）</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((f) => (
              <tr key={f.id} className="border-t border-slate-100">
                <td className="py-2">
                  <a href={f.href} className="font-semibold text-emerald-700 hover:underline">
                    {f.name}
                  </a>
                </td>
                <td className="py-2 text-right tabular-nums">{formatNum(f.pv)}</td>
                <td className="py-2 text-right tabular-nums">{formatDuration(f.avgSec)}</td>
                <td className="py-2 text-right tabular-nums">
                  <UsageBar rate={f.usageRate} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function UsageBar({ rate }: { rate: number }) {
  const pct = Math.min(rate, 1);
  return (
    <div className="inline-flex items-center gap-2">
      <span className="block h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
        <span
          className="block h-full rounded-full bg-emerald-500"
          style={{ width: `${pct * 100}%` }}
        />
      </span>
      <span className="text-slate-600">{formatPct(pct)}</span>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
 * Section 3: ページ別アクセス
 * ────────────────────────────────────────────────────────── */
function SectionPages({ data }: { data: StatsResponse }) {
  return (
    <Section heading="ページ別アクセス TOP10" subheading="URL 別 PV と平均滞在時間">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-left text-slate-500">
            <tr>
              <th className="pb-2">#</th>
              <th className="pb-2">ページ</th>
              <th className="pb-2 text-right">PV</th>
              <th className="pb-2 text-right">平均滞在</th>
            </tr>
          </thead>
          <tbody>
            {data.pages.map((p, idx) => (
              <tr key={p.url} className="border-t border-slate-100">
                <td className="py-2 text-slate-400">{idx + 1}</td>
                <td className="py-2">
                  <a href={p.url} className="font-semibold text-emerald-700 hover:underline">
                    {p.title || p.url}
                  </a>
                  <p className="text-[10px] text-slate-400">{p.url}</p>
                </td>
                <td className="py-2 text-right tabular-nums">{formatNum(p.pv)}</td>
                <td className="py-2 text-right tabular-nums">{formatDuration(p.avgSec)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

/* ──────────────────────────────────────────────────────────
 * Section 4: 流入元
 * ────────────────────────────────────────────────────────── */
function SectionSources({ data }: { data: StatsResponse }) {
  return (
    <Section heading="流入元分析" subheading="セッション元（Source）と構成比">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data.sources}
              dataKey="sessions"
              nameKey="source"
              innerRadius={48}
              outerRadius={86}
              paddingAngle={2}
            >
              {data.sources.map((_, idx) => (
                <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => formatNum(Number(v))} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-3 space-y-1 text-xs">
        {data.sources.map((s) => (
          <li key={s.source} className="flex items-center justify-between">
            <span className="text-slate-700">{s.source}</span>
            <span className="tabular-nums text-slate-500">
              {formatNum(s.sessions)} <span className="text-slate-400">({formatPct(s.pct)})</span>
            </span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/* ──────────────────────────────────────────────────────────
 * Section 5: ユーザー導線
 * ────────────────────────────────────────────────────────── */
function SectionFlow({ data }: { data: StatsResponse }) {
  return (
    <Section heading="ユーザー導線" subheading="from → to の通過率（pass rate）">
      <ul className="divide-y divide-slate-100 text-xs">
        {data.flow.map((f) => (
          <li key={`${f.from}-${f.to}`} className="flex items-center justify-between py-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span className="truncate rounded bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-700">
                {f.from}
              </span>
              <span className="text-slate-400">→</span>
              <span className="truncate rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-[10px] text-emerald-700">
                {f.to}
              </span>
            </div>
            <span className="ml-2 inline-flex items-center gap-1 tabular-nums">
              <span className="block h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                <span
                  className="block h-full bg-emerald-500"
                  style={{ width: `${f.passRate * 100}%` }}
                />
              </span>
              <span className="text-slate-600">{formatPct(f.passRate)}</span>
              <span className="text-[10px] text-slate-400">/ {formatNum(f.users)}人</span>
            </span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/* ──────────────────────────────────────────────────────────
 * Section 6: コンバージョン
 * ────────────────────────────────────────────────────────── */
function SectionConversions({ data }: { data: StatsResponse }) {
  const c = data.conversions;
  return (
    <Section heading="コンバージョン" subheading="アフィリエイトクリックと CTR">
      <div className="grid grid-cols-3 gap-3 text-xs">
        <Stat label="Amazon クリック" value={formatNum(c.amazonClicks)} accent="amber" />
        <Stat label="楽天 クリック" value={formatNum(c.rakutenClicks)} accent="red" />
        <Stat label="平均 CTR" value={formatPct(c.ctr, 2)} accent="emerald" />
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-left text-slate-500">
            <tr>
              <th className="pb-2">ページ</th>
              <th className="pb-2 text-right">表示</th>
              <th className="pb-2 text-right">クリック</th>
              <th className="pb-2 text-right">CTR</th>
            </tr>
          </thead>
          <tbody>
            {c.byPage.map((p) => (
              <tr key={p.url} className="border-t border-slate-100">
                <td className="py-2">
                  <a href={p.url} className="font-semibold text-emerald-700 hover:underline">
                    {p.title}
                  </a>
                </td>
                <td className="py-2 text-right tabular-nums">{formatNum(p.impressions)}</td>
                <td className="py-2 text-right tabular-nums">{formatNum(p.clicks)}</td>
                <td className="py-2 text-right tabular-nums">{formatPct(p.ctr, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

/* ──────────────────────────────────────────────────────────
 * Section 7: AIチャット
 * ────────────────────────────────────────────────────────── */
function SectionChatbot({ data }: { data: StatsResponse }) {
  const c = data.chatbot;
  return (
    <Section heading="AIチャット利用" subheading="安衛法ボットの質問数とカテゴリ分布">
      <div className="grid grid-cols-2 gap-3 text-xs">
        <Stat label="質問数（合計）" value={formatNum(c.totalQuestions)} accent="emerald" />
        <Stat label="平均応答時間" value={`${(c.avgResponseMs / 1000).toFixed(2)}秒`} accent="sky" />
      </div>
      <div className="mt-4 h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={c.byCategory}
            layout="vertical"
            margin={{ top: 4, right: 8, bottom: 0, left: 30 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis dataKey="category" type="category" tick={{ fontSize: 11 }} width={100} />
            <Tooltip formatter={(v) => formatNum(Number(v))} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {c.byCategory.map((_, idx) => (
                <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Section>
  );
}

/* ──────────────────────────────────────────────────────────
 * Section 8: インサイト
 * ────────────────────────────────────────────────────────── */
function SectionInsights({ data }: { data: StatsResponse }) {
  const i = data.insights;
  return (
    <Section heading="改善判断インサイト" subheading="伸びている機能 / 使われていない機能 と提案">
      <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
        {i.summary}
      </p>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-xs font-semibold text-slate-700">📉 利用が低い機能 TOP3</h3>
          <ul className="space-y-2 text-xs">
            {i.unusedFeatures.map((u) => (
              <li
                key={u.id}
                className="rounded-lg border border-rose-200 bg-rose-50 p-2"
              >
                <p className="font-semibold text-rose-900">
                  {u.name} <span className="text-rose-600">PV {formatNum(u.pv)}</span>
                </p>
                <p className="mt-1 text-rose-800">{u.suggestion}</p>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-2 text-xs font-semibold text-slate-700">📈 急成長機能 TOP3</h3>
          <ul className="space-y-2 text-xs">
            {i.growingFeatures.map((g) => (
              <li
                key={g.id}
                className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-2"
              >
                <span className="font-semibold text-emerald-900">{g.name}</span>
                <span className="font-bold tabular-nums text-emerald-700">
                  +{g.growthPct.toFixed(1)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}

/* ──────────────────────────────────────────────────────────
 * Shared
 * ────────────────────────────────────────────────────────── */
function Section({
  heading,
  subheading,
  children,
}: {
  heading: string;
  subheading?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold text-slate-900">{heading}</h2>
      {subheading ? <p className="mt-1 text-xs text-slate-500">{subheading}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "emerald" | "amber" | "red" | "sky";
}) {
  const tone =
    accent === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : accent === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : accent === "red"
          ? "border-rose-200 bg-rose-50 text-rose-900"
          : "border-sky-200 bg-sky-50 text-sky-900";
  return (
    <div className={`rounded-xl border p-3 text-center ${tone}`}>
      <p className="text-lg font-bold leading-none">{value}</p>
      <p className="mt-1 text-[10px] font-medium opacity-80">{label}</p>
    </div>
  );
}
