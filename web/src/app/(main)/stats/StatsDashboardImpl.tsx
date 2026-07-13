"use client";

import { useEffect, useId, useState } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { BarChart3, AlertTriangle } from "lucide-react";
import { TranslatedPageHeader } from "@/components/translated-page-header";
import type {
  PageAnalyticsResponse,
  SearchConsoleResponse,
  StatsPeriod,
  StatsResponse,
} from "@/lib/stats/types";
import { PageContainer } from "@/components/layout/page-container";
import { Stack } from "@/components/layout/stack";
import { LazyChart } from "@/components/charts/lazy-chart";
import { CollapsibleDetail } from "@/components/ui/collapsible-detail";
import { ConclusionCard } from "@/components/ui/conclusion-card";
import { computeStatsLiveness } from "@/lib/stats/liveness";
import { useRovingTablist } from "@/lib/a11y/use-roving-tablist";

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

export function StatsDashboardImpl() {
  const [period, setPeriod] = useState<StatsPeriod>("30d");
  const [data, setData] = useState<StatsResponse | null>(null);
  const [gsc, setGsc] = useState<SearchConsoleResponse | null>(null);
  const [pageAnalytics, setPageAnalytics] = useState<PageAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const panelId = useId();
  const activePeriodIndex = PERIODS.findIndex((p) => p.id === period);
  const { getTabProps } = useRovingTablist(PERIODS.length, activePeriodIndex, (i) => setPeriod(PERIODS[i].id));

  useEffect(() => {
    let cancelled = false;
    // 期間切替時にローディング表示へ戻すための同期 setState（意図的）
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);

    const statsPromise = fetch(`/api/stats?period=${period}`, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<StatsResponse>;
      });
    const gscPromise = fetch(`/api/search-console?period=${period}`, { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<SearchConsoleResponse>) : null))
      .catch(() => null);
    const pageAnalyticsPromise = fetch(`/api/stats/page-analytics?period=${period}`, {
      cache: "no-store",
    })
      .then((r) => (r.ok ? (r.json() as Promise<PageAnalyticsResponse>) : null))
      .catch(() => null);

    Promise.all([statsPromise, gscPromise, pageAnalyticsPromise])
      .then(([statsJson, gscJson, pageJson]) => {
        if (cancelled) return;
        setData(statsJson);
        setGsc(gscJson);
        setPageAnalytics(pageJson);
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
  }, [period, retryNonce]);

  // 実データ源が接続済みかどうか。未接続のサンプル(モック)数値は一切表示しない（捏造防止）。
  const { ga4Live, gscLive, paLive, anyLive } = computeStatsLiveness(data, gsc, pageAnalytics);

  return (
    <PageContainer>
      <Stack gap="lg">
      <TranslatedPageHeader
        titleJa="利用統計ダッシュボード"
        titleEn="Usage Dashboard"
        descriptionJa="GA4 / Search Console 接続期間の実数値のみ表示（未接続時はサンプル数値なし）。"
        descriptionEn="Live numbers only for connected periods. No sample data when unconnected."
        iconName="BarChart3"
        iconColor="emerald"
      />

      {/* 柱0バッチ7/9: 補足説明は折りたたみへ。内容は不変。 */}
      <CollapsibleDetail summary="このダッシュボードについて">
        Google Analytics 4 / Search Console を接続した期間の実数値のみを表示します。未接続時はサンプル数値を表示せず、準備中の案内を表示します。検索インデックスからは除外しています（noindex）。
      </CollapsibleDetail>

      {/* 柱0: 結論カード＝いまの状態（接続状況とPV実績）を最上部に。値は既存 summary/liveness の転記のみ＝捏造ゼロ。 */}
      {!loading && data ? (
        ga4Live ? (
          <ConclusionCard
            tone="info"
            icon={BarChart3}
            value={formatNum(data.summary.pv)}
            unit="PV"
            title="アクセス実績"
            description={`${PERIODS.find((p) => p.id === period)?.label ?? ""}のページビュー合計（GA4実測）`}
          />
        ) : anyLive ? (
          <ConclusionCard
            tone="info"
            icon={BarChart3}
            title="一部接続"
            description="Search Console等は接続済みですが、GA4は未接続のためアクセス数は表示できません。"
          />
        ) : (
          <ConclusionCard
            tone="info"
            icon={BarChart3}
            title="未接続"
            description="GA4 / Search Console が未接続のため、実データはまだありません。"
          />
        )
      ) : null}

      {anyLive ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" aria-label="期間切替" className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-0.5 text-xs">
            {PERIODS.map((p, i) => {
              const active = period === p.id;
              return (
                <button
                  key={p.id}
                  role="tab"
                  aria-selected={active}
                  aria-controls={panelId}
                  onClick={() => setPeriod(p.id)}
                  {...getTabProps(i)}
                  className={`inline-flex min-h-[44px] items-center justify-center rounded-full px-3 py-1 font-semibold transition-colors ${
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
          <div className="flex flex-wrap items-center gap-2">
            <DataSourceBadge data={data} loading={loading} />
            <SearchConsoleBadge gsc={gsc} loading={loading} />
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          読み込み中…
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
          <p className="text-sm text-rose-700">データ取得に失敗しました: {error}</p>
          <button
            type="button"
            onClick={() => setRetryNonce((n) => n + 1)}
            className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-full border border-rose-300 bg-white px-5 text-sm font-semibold text-rose-700 hover:bg-rose-100"
          >
            再試行
          </button>
        </div>
      ) : !anyLive ? (
        // 実データ未接続: サンプル(モック)数値は表示せず、正直な準備中の案内のみ。
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <BarChart3 className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-bold text-slate-900">利用統計は準備中です</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
            本ダッシュボードは Google Analytics 4 / Search Console を接続した期間の
            <strong>実数値のみ</strong>を表示します。現在は接続前のため、表示できる実利用データはまだありません。
            <br className="hidden sm:block" />
            サンプルや仮の数値は表示していません（正確性のため）。
          </p>
          <p className="mx-auto mt-4 max-w-xl rounded-lg bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500">
            運営者向け: <code className="rounded bg-white px-1">GA4_PROPERTY_ID</code> とサービスアカウント認証情報、
            および Search Console API を設定すると、ここに実数値が表示されます。接続手順は{" "}
            <code className="rounded bg-white px-1">web/src/lib/stats/ga4-client.ts</code> /{" "}
            <code className="rounded bg-white px-1">web/src/lib/stats/search-console-client.ts</code> の冒頭コメント参照。
          </p>
          <p className="mt-4 text-xs text-slate-500">
            サイトの収録データ件数（事故事例・条文・通達など）は{" "}
            <a href="/about/data-sources" className="font-semibold text-emerald-700 underline hover:text-emerald-800">データの出典</a>{" "}
            ページでご確認いただけます。
          </p>
        </div>
      ) : !data ? null : (
        // 各データ源が live のときのみ、その源から実測した指標だけを表示する。
        // GA4 単体で取得できない指標（前期間比・機能別利用・離脱フロー・コンバージョン・
        // チャット指標・インサイト）はモック値のため一切表示しない（捏造防止）。
        <div id={panelId} role="tabpanel">
          {ga4Live ? <SectionSummary data={data} /> : null}
          {ga4Live ? <SectionPages data={data} /> : null}
          {ga4Live ? <SectionSources data={data} /> : null}
          {gscLive && gsc ? <SectionSeoSummary gsc={gsc} /> : null}
          {gscLive && gsc ? <SectionSeoQueries gsc={gsc} /> : null}
          {gscLive && gsc ? <SectionSeoPages gsc={gsc} /> : null}
          {paLive && pageAnalytics ? <SectionPageAnalytics pa={pageAnalytics} /> : null}
          {paLive && pageAnalytics ? <SectionDeviceReferral pa={pageAnalytics} /> : null}
          {ga4Live && data.summary.pv === 0 ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-500">
              GA4 に接続済みですが計測データがまだ少ないため、一部の指標が 0 と表示されることがあります（サンプル値ではなく実測 0 です）。
            </p>
          ) : null}
          {ga4Live ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500">
              ※ 機能別利用・離脱フロー・コンバージョン・チャット指標・前期間比は、GA4 カスタムイベント連携後に対応予定のため表示していません（実測前の推定値・サンプルは表示しない方針）。
            </p>
          ) : null}
        </div>
      )}
      </Stack>
    </PageContainer>
  );
}

function DataSourceBadge({ data, loading }: { data: StatsResponse | null; loading: boolean }) {
  if (loading || !data) return null;
  const isLive = data.source === "ga4";
  const tone = isLive
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-amber-200 bg-amber-50 text-amber-700";
  const label = isLive ? "GA4 ライブ" : "GA4 モック";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${tone}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${isLive ? "bg-emerald-500" : "bg-amber-500"}`} />
      {label}
    </span>
  );
}

function SearchConsoleBadge({ gsc, loading }: { gsc: SearchConsoleResponse | null; loading: boolean }) {
  if (loading || !gsc) return null;
  const isLive = gsc.source === "gsc";
  const tone = isLive
    ? "border-sky-200 bg-sky-50 text-sky-700"
    : "border-amber-200 bg-amber-50 text-amber-700";
  const label = isLive ? "GSC ライブ" : "GSC モック";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${tone}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${isLive ? "bg-sky-500" : "bg-amber-500"}`} />
      {label}
    </span>
  );
}

/* ──────────────────────────────────────────────────────────
 * SEO Section (GSC): summary cards, query ranking, page ranking
 * ────────────────────────────────────────────────────────── */
function SectionSeoSummary({ gsc }: { gsc: SearchConsoleResponse }) {
  const s = gsc.summary;
  const cards = [
    { label: "インプレッション", value: formatNum(s.impressions) },
    { label: "クリック", value: formatNum(s.clicks) },
    { label: "平均CTR", value: formatPct(s.ctr, 2) },
    { label: "平均掲載順位", value: s.position > 0 ? s.position.toFixed(1) : "—" },
  ];
  return (
    <Section
      heading="SEO効果（Search Console）"
      subheading="Google 検索結果上のサイト全体パフォーマンス"
    >
      {gsc.error && gsc.source !== "gsc" ? (
        <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-2 text-[11px] text-amber-900">
          <AlertTriangle className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />GSC接続失敗: {gsc.error}
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-medium text-slate-600">{c.label}</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{c.value}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function SectionSeoQueries({ gsc }: { gsc: SearchConsoleResponse }) {
  const rows = gsc.queries.slice(0, 30);
  return (
    <Section
      heading="検索クエリ TOP30"
      subheading="どんな検索語でサイトが表示・クリックされたか"
    >
      {rows.length === 0 ? (
        <p className="text-xs text-slate-500">
          まだ十分な検索データが蓄積されていません（ドメイン取得直後はデータが薄くなります）。
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="pb-2">#</th>
                <th className="pb-2">クエリ</th>
                <th className="pb-2 text-right">表示</th>
                <th className="pb-2 text-right">クリック</th>
                <th className="pb-2 text-right">CTR</th>
                <th className="pb-2 text-right">平均順位</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((q, idx) => (
                <tr key={`${q.query}-${idx}`} className="border-t border-slate-100">
                  <td className="py-2 text-slate-400">{idx + 1}</td>
                  <td className="py-2 font-semibold text-slate-800">{q.query || "(unknown)"}</td>
                  <td className="py-2 text-right tabular-nums">{formatNum(q.impressions)}</td>
                  <td className="py-2 text-right tabular-nums">{formatNum(q.clicks)}</td>
                  <td className="py-2 text-right tabular-nums">{formatPct(q.ctr, 2)}</td>
                  <td className="py-2 text-right tabular-nums">{q.position.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

function SectionSeoPages({ gsc }: { gsc: SearchConsoleResponse }) {
  const rows = gsc.pages.slice(0, 10);
  return (
    <Section
      heading="検索流入ページ TOP10"
      subheading="検索結果からクリックされたページ"
    >
      {rows.length === 0 ? (
        <p className="text-xs text-slate-500">まだ計測データが蓄積されていません。</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="pb-2">#</th>
                <th className="pb-2">ページ</th>
                <th className="pb-2 text-right">表示</th>
                <th className="pb-2 text-right">クリック</th>
                <th className="pb-2 text-right">CTR</th>
                <th className="pb-2 text-right">平均順位</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p, idx) => (
                <tr key={`${p.page}-${idx}`} className="border-t border-slate-100">
                  <td className="py-2 text-slate-400">{idx + 1}</td>
                  <td className="py-2">
                    <span className="font-mono text-[11px] text-emerald-700">{p.page || "(unknown)"}</span>
                  </td>
                  <td className="py-2 text-right tabular-nums">{formatNum(p.impressions)}</td>
                  <td className="py-2 text-right tabular-nums">{formatNum(p.clicks)}</td>
                  <td className="py-2 text-right tabular-nums">{formatPct(p.ctr, 2)}</td>
                  <td className="py-2 text-right tabular-nums">{p.position.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

/* ──────────────────────────────────────────────────────────
 * GA4 Page Analytics expansion (engagement, devices, referrals)
 * ────────────────────────────────────────────────────────── */
function SectionPageAnalytics({ pa }: { pa: PageAnalyticsResponse }) {
  const rows = pa.pages.slice(0, 10);
  return (
    <Section
      heading="機能別アクセス詳細（GA4）"
      subheading="ページ別 PV・滞在時間・エンゲージメント・直帰率"
    >
      <div className="mb-3 grid grid-cols-3 gap-3">
        <Stat
          label="エンゲージメント率"
          value={formatPct(pa.engagement.engagementRate)}
          accent="emerald"
        />
        <Stat
          label="平均セッション時間"
          value={formatDuration(pa.engagement.avgSessionSec)}
          accent="sky"
        />
        <Stat
          label="セッション当たりPV"
          value={pa.engagement.pagesPerSession.toFixed(2)}
          accent="amber"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-left text-slate-500">
            <tr>
              <th className="pb-2">#</th>
              <th className="pb-2">ページ</th>
              <th className="pb-2 text-right">PV</th>
              <th className="pb-2 text-right">平均滞在</th>
              <th className="pb-2 text-right">エンゲージ率</th>
              <th className="pb-2 text-right">直帰率</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p, idx) => (
              <tr key={`${p.url}-${idx}`} className="border-t border-slate-100">
                <td className="py-2 text-slate-400">{idx + 1}</td>
                <td className="py-2">
                  <a href={p.url} className="font-semibold text-emerald-700 hover:underline">
                    {p.title || p.url}
                  </a>
                  <p className="text-[10px] text-slate-400">{p.url}</p>
                </td>
                <td className="py-2 text-right tabular-nums">{formatNum(p.pv)}</td>
                <td className="py-2 text-right tabular-nums">{formatDuration(p.avgSec)}</td>
                <td className="py-2 text-right tabular-nums">{formatPct(p.engagementRate)}</td>
                <td className="py-2 text-right tabular-nums">{formatPct(p.bounceRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function SectionDeviceReferral({ pa }: { pa: PageAnalyticsResponse }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Section heading="デバイス別" subheading="モバイル / デスクトップ / タブレット の構成比">
        <ul className="space-y-2 text-xs">
          {pa.devices.map((d) => (
            <li key={d.device} className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">{d.device}</span>
              <span className="flex items-center gap-2">
                <span className="block h-1.5 w-32 overflow-hidden rounded-full bg-slate-100">
                  <span
                    className="block h-full rounded-full bg-emerald-500"
                    style={{ width: `${Math.min(d.pct, 1) * 100}%` }}
                  />
                </span>
                <span className="tabular-nums text-slate-600">{formatPct(d.pct)}</span>
                <span className="text-[10px] tabular-nums text-slate-400">
                  / {formatNum(d.sessions)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </Section>
      <Section heading="流入元（Source / Medium）" subheading="セッション元の上位">
        <ul className="space-y-2 text-xs">
          {pa.referrals.slice(0, 8).map((r, idx) => (
            <li
              key={`${r.source}-${r.medium}-${idx}`}
              className="flex items-center justify-between border-b border-slate-100 pb-1 last:border-b-0"
            >
              <span className="flex items-center gap-2">
                <span className="font-semibold text-slate-800">{r.source || "(direct)"}</span>
                <span className="rounded bg-slate-100 px-1 text-[10px] text-slate-600">
                  {r.medium || "(none)"}
                </span>
              </span>
              <span className="tabular-nums text-slate-600">{formatNum(r.sessions)}</span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
 * Section 1: サマリ
 * ────────────────────────────────────────────────────────── */
function SectionSummary({ data }: { data: StatsResponse }) {
  const s = data.summary;
  // GA4 実測の主要指標のみ表示。前期間比(deltas)は GA4 単体で取得できずモック値のため非表示（捏造防止）。
  const cards: Array<{ label: string; value: string }> = [
    { label: "DAU（直近 1 日）", value: formatNum(s.dau) },
    { label: "MAU（直近 30 日）", value: formatNum(s.mau) },
    { label: "PV（期間内合計）", value: formatNum(s.pv) },
    { label: "平均セッション時間", value: formatDuration(s.avgSessionSec) },
    { label: "直帰率", value: formatPct(s.bounceRate) },
  ];
  return (
    <Section
      heading="サマリ"
      subheading="GA4 実測の主要指標（DAU / MAU / PV / 平均セッション時間 / 直帰率）"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-medium text-slate-600">{c.label}</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{c.value}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ──────────────────────────────────────────────────────────
 * Section 2: 機能別利用
 * ────────────────────────────────────────────────────────── */
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
      <LazyChart className="h-64 w-full">
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
      </LazyChart>
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
/* ──────────────────────────────────────────────────────────
 * Section 6: コンバージョン
 * ────────────────────────────────────────────────────────── */
/* ──────────────────────────────────────────────────────────
 * Section 7: AIチャット
 * ────────────────────────────────────────────────────────── */
/* ──────────────────────────────────────────────────────────
 * Section 8: インサイト
 * ────────────────────────────────────────────────────────── */
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
  // 実データ源が live のときだけ各セクションを描画する設計のため、サンプルバッジは廃止。
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="flex flex-wrap items-center gap-2 text-base font-bold text-slate-900">
        <span>{heading}</span>
      </h2>
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
