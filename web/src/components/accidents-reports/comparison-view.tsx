import Link from "next/link";
import { ArrowUpRight, BarChart3, ShieldCheck } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Section } from "@/components/layout/section";
import { CardGrid } from "@/components/layout/card-grid";
import { Cluster } from "@/components/layout/stack";
import { Breadcrumb } from "@/components/breadcrumb";
import type {
  ComparisonDataset,
  ComparisonRow,
  DifferentialHighlight,
  IndustrySlug,
  LeaderboardEntry,
} from "@/lib/accident-comparison";
import {
  ComparisonMonthlyChart,
  INDUSTRY_CHART_COLOR,
} from "./comparison-monthly-chart";
import { ComparisonIndustrySelector } from "./comparison-industry-selector";
import { ReportPrintButton } from "./report-print-button";
import { ReportPrintMeta, ReportPrintFooter } from "./report-print-meta";

const COLOR_SWATCH: Record<
  string,
  { bar: string; chip: string; ring: string; text: string }
> = {
  amber: {
    bar: "bg-amber-500",
    chip: "bg-amber-50 text-amber-900 border-amber-200",
    ring: "ring-amber-200",
    text: "text-amber-900",
  },
  blue: {
    bar: "bg-blue-500",
    chip: "bg-blue-50 text-blue-900 border-blue-200",
    ring: "ring-blue-200",
    text: "text-blue-900",
  },
  emerald: {
    bar: "bg-emerald-500",
    chip: "bg-emerald-50 text-emerald-900 border-emerald-200",
    ring: "ring-emerald-200",
    text: "text-emerald-900",
  },
  rose: {
    bar: "bg-rose-500",
    chip: "bg-rose-50 text-rose-900 border-rose-200",
    ring: "ring-rose-200",
    text: "text-rose-900",
  },
  violet: {
    bar: "bg-violet-500",
    chip: "bg-violet-50 text-violet-900 border-violet-200",
    ring: "ring-violet-200",
    text: "text-violet-900",
  },
};

const TONE_CLASS: Record<DifferentialHighlight["tone"], string> = {
  rose: "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200",
  amber:
    "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200",
  emerald:
    "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200",
  slate:
    "border-slate-300 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200",
};

function swatch(c: string) {
  return COLOR_SWATCH[c] ?? COLOR_SWATCH.blue;
}

function num(n: number): string {
  return n.toLocaleString("ja-JP");
}

function pct(n: number, digits = 1): string {
  return `${(n * 100).toFixed(digits)}%`;
}

function todayJp(): string {
  const d = new Date();
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

/* ---------- KPI per industry ------------------------------------- */

function IndustryKpiCard({ row }: { row: ComparisonRow }) {
  const { config, report, fatalRate } = row;
  const sw = swatch(config.colorClass);
  const yoy = report.yoy;
  return (
    <div
      className={`rounded-xl border-2 p-4 print:break-inside-avoid ${sw.chip}`}
      data-industry={row.slug}
    >
      <Cluster gap="sm">
        <span className="text-3xl" aria-hidden="true">
          {config.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold text-slate-900 dark:text-slate-100">
            {config.label}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400">
            {config.tagline}
          </p>
        </div>
        <Link
          href={`/accidents-reports/${config.slug}`}
          className="inline-flex items-center gap-0.5 rounded-md border border-slate-300 bg-white/70 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-white print:hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          詳細 <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </Cluster>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <div className="rounded-md bg-white px-2 py-1.5 dark:bg-slate-900">
          <dt className="text-[10px] text-slate-500 dark:text-slate-400">総事故</dt>
          <dd className="text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {num(report.stats.total)}件
          </dd>
        </div>
        <div className="rounded-md bg-white px-2 py-1.5 dark:bg-slate-900">
          <dt className="text-[10px] text-slate-500 dark:text-slate-400">死亡</dt>
          <dd className="text-sm font-semibold tabular-nums text-rose-700 dark:text-rose-400">
            {num(report.stats.severity.fatal)}件
          </dd>
        </div>
        <div className="rounded-md bg-white px-2 py-1.5 dark:bg-slate-900">
          <dt className="text-[10px] text-slate-500 dark:text-slate-400">死亡率</dt>
          <dd className="text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {pct(fatalRate)}
          </dd>
        </div>
        <div className="rounded-md bg-white px-2 py-1.5 dark:bg-slate-900">
          <dt className="text-[10px] text-slate-500 dark:text-slate-400">前年比</dt>
          <dd
            className={`text-sm font-semibold tabular-nums ${
              yoy && yoy.deltaPct > 0
                ? "text-amber-700 dark:text-amber-400"
                : yoy && yoy.deltaPct < 0
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-slate-700 dark:text-slate-300"
            }`}
          >
            {yoy
              ? `${yoy.deltaPct > 0 ? "+" : ""}${(yoy.deltaPct * 100).toFixed(0)}%`
              : "—"}
          </dd>
        </div>
      </dl>

      <p className="mt-2 text-[11px] text-slate-600 dark:text-slate-400">
        最多事故型: <span className="font-medium">{report.topTypes[0]?.name ?? "—"}</span>
      </p>
    </div>
  );
}

/* ---------- Severity ratio stacked horizontal bar ---------------- */

function SeverityBar({ row }: { row: ComparisonRow }) {
  const { severityRatio: s } = row.report;
  if (s.total === 0) {
    return (
      <p className="text-xs text-slate-500 dark:text-slate-400">データなし</p>
    );
  }
  return (
    <div className="space-y-1.5">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="bg-rose-500"
          style={{ width: `${s.fatalShare * 100}%` }}
          title={`死亡 ${num(s.fatal)}件 (${pct(s.fatalShare)})`}
        />
        <div
          className="bg-amber-500"
          style={{ width: `${s.lostWorkdayShare * 100}%` }}
          title={`休業4日以上 ${num(s.lostWorkday)}件 (${pct(s.lostWorkdayShare)})`}
        />
        <div
          className="bg-emerald-500"
          style={{ width: `${s.minorShare * 100}%` }}
          title={`休業3日以下 ${num(s.minor)}件 (${pct(s.minorShare)})`}
        />
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-600 dark:text-slate-400">
        <span>
          <span className="inline-block h-2 w-2 rounded-full bg-rose-500 align-middle" /> 死亡 {pct(s.fatalShare)}
        </span>
        <span>
          <span className="inline-block h-2 w-2 rounded-full bg-amber-500 align-middle" /> 休業4日以上 {pct(s.lostWorkdayShare)}
        </span>
        <span>
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 align-middle" /> 休業3日以下 {pct(s.minorShare)}
        </span>
      </div>
    </div>
  );
}

/* ---------- Generic matrix table -------------------------------- */

function MatrixTable<T extends { name?: string; factor?: string; count: number; share: number }>({
  caption,
  rows,
  matrix,
  cellRenderer,
}: {
  caption: string;
  rows: ComparisonRow[];
  matrix: { rank: number; cells: Record<IndustrySlug, T | null> }[];
  cellRenderer?: (cell: T | null) => React.ReactNode;
}) {
  const fallbackRenderer = (cell: T | null) => {
    if (!cell) return <span className="text-slate-400">—</span>;
    const label = cell.factor ?? cell.name ?? "—";
    return (
      <>
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
          {label}
        </p>
        <p className="text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
          {num(cell.count)}件・{pct(cell.share)}
        </p>
      </>
    );
  };
  const renderer = cellRenderer ?? fallbackRenderer;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-separate border-spacing-0 text-left text-xs">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky left-0 z-10 border-b border-slate-200 bg-slate-50 px-2 py-2 text-[11px] font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              順位
            </th>
            {rows.map((r) => {
              const sw = swatch(r.config.colorClass);
              return (
                <th
                  key={r.slug}
                  scope="col"
                  className={`border-b border-slate-200 px-2 py-2 text-[11px] font-semibold dark:border-slate-800 ${sw.text} dark:text-slate-200`}
                >
                  <span className="inline-flex items-center gap-1">
                    <span aria-hidden="true">{r.config.icon}</span>
                    {r.config.label}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row) => (
            <tr key={row.rank}>
              <th
                scope="row"
                className="sticky left-0 z-10 border-b border-slate-100 bg-slate-50/80 px-2 py-2 text-[11px] font-semibold tabular-nums text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              >
                #{row.rank}
              </th>
              {rows.map((r) => (
                <td
                  key={r.slug}
                  className="border-b border-slate-100 px-2 py-2 align-top dark:border-slate-800"
                >
                  {renderer(row.cells[r.slug])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Leaderboard table ----------------------------------- */

function LeaderboardTable({
  entries,
  rowsCount,
}: {
  entries: LeaderboardEntry[];
  rowsCount: number;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
      <table className="w-full min-w-[520px] text-left text-xs">
        <caption className="sr-only">
          比較指標ごとの最上位と最下位
        </caption>
        <thead className="bg-slate-50 dark:bg-slate-900">
          <tr>
            <th
              scope="col"
              className="px-3 py-2 text-[11px] font-semibold text-slate-700 dark:text-slate-300"
            >
              指標
            </th>
            <th
              scope="col"
              className="px-3 py-2 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400"
            >
              最も少ない・低い
            </th>
            <th
              scope="col"
              className="px-3 py-2 text-[11px] font-semibold text-rose-700 dark:text-rose-400"
            >
              最も多い・高い
            </th>
          </tr>
        </thead>
        <tbody>
          {entries
            .filter((e) => e.best || e.worst)
            .map((entry) => (
              <tr
                key={entry.key}
                className="border-t border-slate-100 dark:border-slate-800"
              >
                <th
                  scope="row"
                  className="px-3 py-2 text-[11px] font-medium text-slate-800 dark:text-slate-200"
                >
                  {entry.metricLabel}
                </th>
                <td className="px-3 py-2 text-[12px]">
                  {entry.best ? (
                    <span className="inline-flex items-baseline gap-1">
                      <span className="font-semibold">{entry.best.label}</span>
                      <span className="tabular-nums text-slate-500">
                        ({entry.best.formatted})
                      </span>
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-[12px]">
                  {entry.worst ? (
                    <span className="inline-flex items-baseline gap-1">
                      <span className="font-semibold">{entry.worst.label}</span>
                      <span className="tabular-nums text-slate-500">
                        ({entry.worst.formatted})
                      </span>
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
      <p className="border-t border-slate-100 bg-slate-50 px-3 py-2 text-[10px] text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        {rowsCount} 業種を比較。指標は MHLW 公表データと curated 事例の合算から算出。
      </p>
    </div>
  );
}

/* ---------- Highlights callout ---------------------------------- */

function HighlightsBlock({ highlights }: { highlights: DifferentialHighlight[] }) {
  if (highlights.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        選択業種間に大きな差は検出されませんでした。
      </p>
    );
  }
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {highlights.map((h) => (
        <li
          key={h.id}
          className={`rounded-lg border p-3 print:break-inside-avoid ${TONE_CLASS[h.tone]}`}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
            {h.tag}
          </p>
          <p className="mt-1 text-sm leading-relaxed">{h.sentence}</p>
        </li>
      ))}
    </ul>
  );
}

/* ---------- Comparison swatch legend ---------------------------- */

function ComparisonLegend({ rows }: { rows: ComparisonRow[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-2 text-[11px]">
      {rows.map((r) => (
        <li
          key={r.slug}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 dark:border-slate-700 dark:bg-slate-800"
        >
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: INDUSTRY_CHART_COLOR[r.slug] }}
            aria-hidden="true"
          />
          <span className="text-slate-700 dark:text-slate-300">{r.config.label}</span>
        </li>
      ))}
    </ul>
  );
}

/* ---------- Main view ------------------------------------------- */

export function ComparisonView({
  dataset,
  allOptions,
}: {
  dataset: ComparisonDataset;
  allOptions: { slug: IndustrySlug; label: string; icon: string; colorClass: string }[];
}) {
  const {
    rows,
    leaderboard,
    highlights,
    accidentTypeMatrix,
    causeMatrix,
    dangerFactorMatrix,
    monthlyOverlay,
    yearRange,
    totalCases,
  } = dataset;

  const yearLabel =
    yearRange.min && yearRange.max ? `${yearRange.min}年〜${yearRange.max}年` : "—";
  const industryListLabel = rows.map((r) => r.config.label).join(" × ");
  const labelMap = {} as Record<IndustrySlug, string>;
  for (const r of rows) labelMap[r.slug] = r.config.label;

  return (
    <article className="accident-report-print-root">
      <ReportPrintMeta
        industryLabel={industryListLabel}
        populationLabel={`${num(totalCases)}件`}
        yearRange={yearLabel}
        generatedAt={todayJp()}
      />

      <PageContainer width="full">
        <Breadcrumb
          items={[
            { name: "事故データベース", href: "/accidents" },
            { name: "業種別レポート", href: "/accidents-reports" },
            { name: "業種比較" },
          ]}
        />

        {/* ---------- Header ---------------------------------------- */}
        <header className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 print:rounded-none print:border-0 print:p-0 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
          <Cluster gap="sm" align="start">
            <BarChart3
              className="h-6 w-6 shrink-0 text-emerald-700 dark:text-emerald-400"
              aria-hidden="true"
            />
            <div className="flex-1">
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                業種別 自動分析 / 比較ビュー
              </p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-100">
                業種比較ビュー: {industryListLabel}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-700 sm:text-base dark:text-slate-300">
                {rows.length} 業種・累計 {num(totalCases)} 件の労働災害事例を並べて、
                事故型ランキング・原因・危険要因・季節性・死亡率を横断比較します。
                業種間ベンチマークや、社内多事業所の優先度判断にご活用ください。
              </p>
              <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-500">
                データ収録期間: {yearLabel} ・ 出典: 厚生労働省 職場のあんぜんサイト 死亡災害DB / 労働者死傷病報告オープンデータ / 編集部 curated 事例
              </p>
            </div>
            <ReportPrintButton label="比較レポートをPDFに出力" />
          </Cluster>
        </header>

        {/* ---------- Selector -------------------------------------- */}
        <div className="mt-4">
          <ComparisonIndustrySelector
            options={allOptions}
            selected={rows.map((r) => r.slug)}
          />
        </div>

        {/* ---------- Highlights ------------------------------------ */}
        <Section
          title="差分ハイライト"
          description="比較中の業種間で顕著な差が見られる指標を自動抽出。"
          className="mt-6"
          spacing="tight"
        >
          <HighlightsBlock highlights={highlights} />
        </Section>

        {/* ---------- KPI cards ------------------------------------- */}
        <Section
          title="業種別 KPI"
          description="総事故・死亡・死亡率・前年比を業種ごとに一望。"
          className="mt-6"
        >
          <CardGrid cols={3} gap="md">
            {rows.map((r) => (
              <IndustryKpiCard key={r.slug} row={r} />
            ))}
          </CardGrid>
        </Section>

        {/* ---------- Leaderboard ----------------------------------- */}
        <Section
          title="指標別 リーダーボード"
          description="比較指標ごとに最上位・最下位の業種を抽出します。"
          className="mt-6"
          spacing="tight"
        >
          <LeaderboardTable entries={leaderboard} rowsCount={rows.length} />
        </Section>

        {/* ---------- Severity ratio ------------------------------- */}
        <Section
          title="重大度構成比"
          description="死亡 / 休業4日以上 / 休業3日以下の構成を業種ごとに比較。"
          className="mt-6"
        >
          <ul className="space-y-3">
            {rows.map((r) => (
              <li
                key={r.slug}
                className="rounded-lg border border-slate-200 bg-white p-3 print:break-inside-avoid dark:border-slate-800 dark:bg-slate-900"
              >
                <Cluster gap="sm">
                  <span aria-hidden="true">{r.config.icon}</span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {r.config.label}
                  </span>
                  <span className="ml-auto text-[11px] tabular-nums text-slate-500">
                    総計 {num(r.report.severityRatio.total)}件
                  </span>
                </Cluster>
                <div className="mt-2">
                  <SeverityBar row={r} />
                </div>
              </li>
            ))}
          </ul>
        </Section>

        {/* ---------- Monthly overlay chart ------------------------ */}
        <Section
          title="月次推移の重ね描き"
          description="12ヶ月の事故件数を業種ごとに重ねて表示。シーズナリティの差を可視化。"
          className="mt-6"
        >
          <div className="rounded-lg border border-slate-200 bg-white p-3 sm:p-4 print:break-inside-avoid dark:border-slate-800 dark:bg-slate-900">
            <ComparisonLegend rows={rows} />
            <div className="mt-3">
              <ComparisonMonthlyChart
                points={monthlyOverlay.points}
                slugs={monthlyOverlay.slugs}
                labels={labelMap}
              />
            </div>
          </div>
        </Section>

        {/* ---------- Top accident types matrix -------------------- */}
        <Section
          title="主要事故型 Top 5（業種別）"
          description="事故型ランキングを業種別に並べて、共通／固有事故型を識別。"
          className="mt-6"
        >
          <MatrixTable
            caption="業種別 主要事故型 Top 5"
            rows={rows}
            matrix={accidentTypeMatrix}
          />
        </Section>

        {/* ---------- Top causes matrix --------------------------- */}
        <Section
          title="主要原因 Top 5（業種別）"
          description="原因ランキングを業種別に並列。共通対策と業種固有対策を切り分けます。"
          className="mt-6"
        >
          <MatrixTable
            caption="業種別 主要原因 Top 5"
            rows={rows}
            matrix={causeMatrix}
          />
        </Section>

        {/* ---------- Danger factor matrix ------------------------ */}
        <Section
          title="危険要因 Top 5（業種別）"
          description="自動抽出の危険要因＋対策ヒント。"
          className="mt-6"
        >
          <MatrixTable
            caption="業種別 危険要因 Top 5"
            rows={rows}
            matrix={dangerFactorMatrix}
            cellRenderer={(cell) => {
              if (!cell) return <span className="text-slate-400">—</span>;
              return (
                <>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {cell.factor}
                  </p>
                  <p className="text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                    {num(cell.count)}件・{pct(cell.share)}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                    {cell.hint}
                  </p>
                </>
              );
            }}
          />
        </Section>

        {/* ---------- Recommended actions per industry ------------- */}
        <Section
          title="業種別 推奨対策ハイライト"
          description="curated 事例から抽出した予防ポイント Top 5 を業種別に対比。"
          className="mt-6"
        >
          <CardGrid cols={3} gap="md">
            {rows.map((r) => {
              const sw = swatch(r.config.colorClass);
              return (
                <div
                  key={r.slug}
                  className={`rounded-xl border-2 p-4 print:break-inside-avoid ${sw.chip}`}
                >
                  <Cluster gap="xs">
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    <span className="text-sm font-semibold">{r.config.label}</span>
                  </Cluster>
                  {r.report.topPrevention.length === 0 ? (
                    <p className="mt-2 text-xs text-slate-500">推奨対策データが未収録</p>
                  ) : (
                    <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-xs leading-relaxed text-slate-800 dark:text-slate-200">
                      {r.report.topPrevention.slice(0, 5).map((p, i) => (
                        <li key={`${r.slug}-prev-${i}`}>{p.name}</li>
                      ))}
                    </ol>
                  )}
                </div>
              );
            })}
          </CardGrid>
        </Section>

        {/* ---------- Per-industry deep-link cards ----------------- */}
        <Section
          title="各業種の詳細レポートへ"
          description="比較中の業種について、業種単独の詳細レポートに遷移できます。"
          className="mt-6"
          spacing="tight"
        >
          <Cluster gap="sm">
            {rows.map((r) => {
              const sw = swatch(r.config.colorClass);
              return (
                <Link
                  key={r.slug}
                  href={`/accidents-reports/${r.slug}`}
                  className={`inline-flex items-center gap-1 rounded-full border-2 px-3 py-1.5 text-sm font-medium hover:shadow-sm ${sw.chip}`}
                >
                  <span aria-hidden="true">{r.config.icon}</span>
                  {r.config.label}の詳細レポート
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              );
            })}
          </Cluster>
        </Section>

        {/* ---------- Footer note ---------------------------------- */}
        <p className="mt-8 text-[11px] leading-relaxed text-slate-500 dark:text-slate-500">
          自動分析の母集団: 厚生労働省 職場のあんぜんサイト 死亡災害DB、労働者死傷病報告オープンデータ、編集部 curated 事例（公開情報を匿名化して再構成）。
          差分ハイライトは比較中の業種ペアから算出した相対指標であり、産業全体の平均値ではありません。
        </p>
      </PageContainer>
      <ReportPrintFooter />
    </article>
  );
}
