import Link from "next/link";
import {
  ArrowUpRight,
  AlertTriangle,
  ShieldCheck,
  BookOpen,
  TrendingUp,
  Calendar,
  Clock,
  Building2,
  Gauge,
  ListChecks,
} from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Section } from "@/components/layout/section";
import { Stack, Cluster } from "@/components/layout/stack";
import { CardGrid } from "@/components/layout/card-grid";
import { Breadcrumb } from "@/components/breadcrumb";
import type {
  IndustryReport,
  MonthCount,
  NameCount,
  YearCount,
} from "@/lib/accident-analysis";
import type { AccidentCase } from "@/lib/types/domain";
import type { IndustrySlug } from "@/lib/industry-slugs";
import { MonthlyTrendChart } from "./monthly-trend-chart";
import { PreventionChecklist } from "./prevention-checklist";
import { ReportPrintButton } from "./report-print-button";
import { ReportPrintMeta, ReportPrintFooter } from "./report-print-meta";

const COLOR_SWATCH: Record<string, { bar: string; chip: string; ring: string; text: string }> = {
  amber: { bar: "bg-amber-500", chip: "bg-amber-50 text-amber-900 border-amber-200", ring: "ring-amber-200", text: "text-amber-900" },
  blue: { bar: "bg-blue-500", chip: "bg-blue-50 text-blue-900 border-blue-200", ring: "ring-blue-200", text: "text-blue-900" },
  emerald: { bar: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-900 border-emerald-200", ring: "ring-emerald-200", text: "text-emerald-900" },
  rose: { bar: "bg-rose-500", chip: "bg-rose-50 text-rose-900 border-rose-200", ring: "ring-rose-200", text: "text-rose-900" },
  violet: { bar: "bg-violet-500", chip: "bg-violet-50 text-violet-900 border-violet-200", ring: "ring-violet-200", text: "text-violet-900" },
};

function swatch(color: string) {
  return COLOR_SWATCH[color] ?? COLOR_SWATCH.blue;
}

function pct(n: number, digits = 1): string {
  return `${(n * 100).toFixed(digits)}%`;
}

function num(n: number): string {
  return n.toLocaleString("ja-JP");
}

function todayJp(): string {
  const d = new Date();
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

/* ---------- Sub components ---------------------------------------- */

function KpiCard({
  label,
  value,
  caption,
  tone = "default",
}: {
  label: string;
  value: string;
  caption?: string;
  tone?: "default" | "danger" | "warn" | "good";
}) {
  const toneClass =
    tone === "danger"
      ? "border-rose-200 bg-rose-50 dark:bg-rose-950/40 dark:border-rose-900"
      : tone === "warn"
        ? "border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-900"
        : tone === "good"
          ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-900"
          : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900";
  return (
    <div className={`rounded-lg border p-3 sm:p-4 ${toneClass}`}>
      <p className="text-xs text-slate-600 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-slate-900 sm:text-2xl dark:text-slate-100">
        {value}
      </p>
      {caption && (
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-500">{caption}</p>
      )}
    </div>
  );
}

function BarRow({
  label,
  count,
  share,
  total,
  color,
}: {
  label: string;
  count: number;
  share: number;
  total: number;
  color: string;
}) {
  const widthPct = total > 0 ? Math.max(2, (count / total) * 100) : 0;
  return (
    <li className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-slate-800 dark:text-slate-200">{label}</span>
        <span className="shrink-0 text-xs tabular-nums text-slate-500 dark:text-slate-400">
          {num(count)}件 ({pct(share)})
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className={`h-full ${swatch(color).bar}`} style={{ width: `${widthPct}%` }} aria-hidden="true" />
      </div>
    </li>
  );
}

function RankList({
  items,
  color,
  emptyLabel = "データなし",
}: {
  items: NameCount[];
  color: string;
  emptyLabel?: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">{emptyLabel}</p>;
  }
  const max = items[0].count;
  return (
    <ol className="space-y-2.5">
      {items.map((it) => (
        <BarRow
          key={it.name}
          label={it.name}
          count={it.count}
          share={it.share}
          total={max}
          color={color}
        />
      ))}
    </ol>
  );
}

function SeasonalityChart({ data, color }: { data: MonthCount[]; color: string }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div>
      <div className="flex items-end gap-1 sm:gap-2" role="img" aria-label="月別事故件数">
        {data.map((d) => {
          const height = Math.max(4, (d.count / max) * 100);
          return (
            <div key={d.month} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={`w-full rounded-t ${swatch(color).bar} transition-all`}
                style={{ height: `${height}px` }}
                aria-label={`${d.month}月 ${d.count}件`}
              />
              <span className="text-[10px] tabular-nums text-slate-500 sm:text-xs dark:text-slate-400">
                {d.month}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-500">
        棒の高さは月内事故件数（業種累計）。最大{num(max)}件。
      </p>
    </div>
  );
}

function YearTrendChart({ data, color }: { data: YearCount[]; color: string }) {
  if (data.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">データなし</p>;
  }
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="flex items-end gap-1 sm:gap-2" role="img" aria-label="年別事故件数">
      {data.map((d) => {
        const height = Math.max(4, (d.count / max) * 120);
        return (
          <div key={d.year} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[10px] tabular-nums text-slate-500 dark:text-slate-400">
              {num(d.count)}
            </span>
            <div
              className={`w-full rounded-t ${swatch(color).bar}`}
              style={{ height: `${height}px` }}
              aria-label={`${d.year}年 ${d.count}件`}
            />
            <span className="text-[10px] tabular-nums text-slate-500 sm:text-xs dark:text-slate-400">
              {d.year}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const SEVERITY_TONE: Record<AccidentCase["severity"], string> = {
  軽傷: "bg-emerald-100 text-emerald-800 border-emerald-200",
  中等傷: "bg-amber-100 text-amber-800 border-amber-200",
  重傷: "bg-orange-100 text-orange-900 border-orange-300",
  死亡: "bg-rose-100 text-rose-900 border-rose-300",
};

function TopCaseCard({ accident }: { accident: AccidentCase }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <Cluster gap="xs" className="text-xs">
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 ${SEVERITY_TONE[accident.severity]}`}>
          {accident.severity}
        </span>
        <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
          <Calendar className="h-3 w-3" aria-hidden="true" />
          {accident.occurredOn || "日付不明"}
        </span>
        <span className="text-slate-500 dark:text-slate-400">・{accident.type}</span>
      </Cluster>
      <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-slate-100">
        <Link
          href={`/accidents/${accident.id}`}
          className="hover:text-emerald-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          {accident.title}
        </Link>
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{accident.summary}</p>
      {accident.mainCauses.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">主な原因</p>
          <ul className="mt-1 ml-4 list-disc text-xs leading-relaxed text-slate-700 dark:text-slate-300">
            {accident.mainCauses.slice(0, 3).map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

/* ---------- Main view --------------------------------------------- */

export function IndustryReportView({ report }: { report: IndustryReport }) {
  const {
    config,
    stats,
    topTypes,
    topCauses,
    topPrevention,
    seasonality,
    yearTrend,
    yoy,
    patterns,
    topCases,
    timeBands,
    workplaceSizes,
    severityRatio,
    worstMonths,
    dangerFactors,
    comparison,
    monthlyByYear,
  } = report;
  const sw = swatch(config.colorClass);
  const yearLabel = `${stats.yearRange.min}年〜${stats.yearRange.max}年`;
  const generatedAt = todayJp();

  return (
    <article className="accident-report-print-root">
      <ReportPrintMeta
        industryLabel={config.label}
        populationLabel={`${num(stats.total)}件`}
        yearRange={yearLabel}
        generatedAt={generatedAt}
      />

      <PageContainer width="full">
        <Breadcrumb
          items={[
            { name: "事故データベース", href: "/accidents" },
            { name: "業種別レポート", href: "/accidents-reports" },
            { name: config.label },
          ]}
        />

        {/* ---------- Header ------------------------------------------- */}
        <header className={`rounded-xl border p-5 print:rounded-none print:border-0 print:p-0 ${sw.chip}`}>
          <Cluster gap="sm">
            <span className="text-3xl" aria-hidden="true">
              {config.icon}
            </span>
            <div className="flex-1">
              <p className="text-xs font-medium opacity-80">業種別 事故分析レポート</p>
              <h1 className="text-2xl font-bold sm:text-3xl">{config.label}</h1>
            </div>
            <ReportPrintButton />
          </Cluster>
          <p className="mt-3 text-sm leading-relaxed">{config.tagline}</p>
          <p className="mt-1 text-xs opacity-70">
            {config.labelEn} ・ 集計期間 {yearLabel} ・ 死亡災害DB中心 {num(stats.total)}件 ・ 発行日 {generatedAt}
          </p>
        </header>

        {/* ---------- KPI cards ---------------------------------------- */}
        <Section title="サマリ" spacing="tight" className="mt-6 print:break-inside-avoid">
          <CardGrid cols={4} gap="md">
            <KpiCard
              label="事故事例 合計"
              value={`${num(stats.total)}件`}
              caption={`死亡災害DB＋curated事例（${yearLabel}）※休業4日以上全件は別集計`}
            />
            <KpiCard
              label="死亡事例"
              value={`${num(stats.severity.fatal)}件`}
              caption={
                stats.fatalityShareOfAll > 0
                  ? `全業種死亡災害の${pct(stats.fatalityShareOfAll)}を占める`
                  : "全業種比 算出不可"
              }
              tone="danger"
            />
            <KpiCard
              label="休業4日以上 (重傷+中等傷)"
              value={`${num(severityRatio.lostWorkday)}件`}
              caption={
                severityRatio.total > 0
                  ? `業種事例の${pct(severityRatio.lostWorkdayShare)}（事業者報告義務該当）`
                  : "—"
              }
              tone="warn"
            />
            <KpiCard
              label="前年同期比"
              value={
                yoy
                  ? `${yoy.deltaPct >= 0 ? "+" : ""}${(yoy.deltaPct * 100).toFixed(1)}%`
                  : "—"
              }
              caption={
                yoy
                  ? `${yoy.previousYear}年 ${num(yoy.previousCount)}件 → ${yoy.latestYear}年 ${num(yoy.latestCount)}件`
                  : "比較可能なデータが不足"
              }
              tone={yoy ? (yoy.deltaPct > 0.05 ? "danger" : yoy.deltaPct < -0.05 ? "good" : "default") : "default"}
            />
          </CardGrid>

          {/* Industry comparison strip */}
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 print:bg-white">
            <Cluster gap="md">
              <span className="inline-flex items-center gap-1">
                <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  業種内 死亡比率 <strong className="tabular-nums">{pct(comparison.thisFatalRate)}</strong>
                </span>
              </span>
              <span>
                他4業種平均 <span className="tabular-nums">{pct(comparison.avgFatalRate)}</span>
              </span>
              <span>
                死亡件数ランキング <strong className="tabular-nums">{comparison.rankByFatal}</strong>/{comparison.totalIndustries}位
              </span>
            </Cluster>
          </div>
        </Section>

        {/* ---------- Danger factors (Top 5) ---------------------------- */}
        {dangerFactors.length > 0 && (
          <Section
            title={
              <Cluster gap="xs">
                <AlertTriangle className={`h-4 w-4 ${sw.text}`} aria-hidden="true" />
                <span>業種特有の危険要因 Top 5</span>
              </Cluster>
            }
            description="原因 Top 集計と業種ハザード辞書を突き合わせて、業種としてのリスクポイントを抽出。"
            spacing="default"
            className="mt-8 print:break-inside-avoid"
          >
            <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {dangerFactors.map((d) => (
                <li
                  key={d.rank}
                  className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
                >
                  <Cluster gap="xs">
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${sw.chip}`}>
                      {d.rank}
                    </span>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {d.factor}
                    </p>
                  </Cluster>
                  <p className="mt-1 text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                    {num(d.count)}件 ・ 業種内 {pct(d.share)}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-700 dark:text-slate-300">{d.hint}</p>
                </li>
              ))}
            </ol>
          </Section>
        )}

        {/* ---------- Top cases --------------------------------------- */}
        {topCases.length > 0 && (
          <Section
            title={
              <Cluster gap="xs">
                <AlertTriangle className={`h-4 w-4 ${sw.text}`} aria-hidden="true" />
                <span>重大事故 Top {topCases.length}</span>
              </Cluster>
            }
            description="重傷・死亡を中心に curated 事例から代表的なケースを抽出。詳細ページで再発防止策・関連法令を確認できます。"
            spacing="default"
            className="mt-8"
          >
            <CardGrid cols={2} gap="md">
              {topCases.map((c) => (
                <TopCaseCard key={c.id} accident={c} />
              ))}
            </CardGrid>
          </Section>
        )}

        {/* ---------- Top accident types ------------------------------ */}
        <Section
          title="事故の型 Top 10"
          description="厚労省データを含む業種内全事例から事故型を集計。"
          spacing="default"
          className="mt-8 print:break-inside-avoid"
        >
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <RankList items={topTypes} color={config.colorClass} />
          </div>
        </Section>

        {/* ---------- Top causes -------------------------------------- */}
        <Section
          title="原因 Top 10"
          description="厚労省データ＋curated事例の mainCauses を統合集計。"
          spacing="default"
          className="mt-8 print:break-inside-avoid"
        >
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <RankList items={topCauses} color={config.colorClass} />
          </div>
        </Section>

        {/* ---------- Industry-specific patterns ---------------------- */}
        <Section
          title={
            <Cluster gap="xs">
              <TrendingUp className={`h-4 w-4 ${sw.text}`} aria-hidden="true" />
              <span>業種特有パターン</span>
            </Cluster>
          }
          description="事故型 × 原因の組み合わせ頻度。業種で繰り返されているシナリオを示します。"
          spacing="default"
          className="mt-8 print:break-inside-avoid"
        >
          {patterns.length === 0 ? (
            <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
              十分なパターンが抽出できませんでした。母集団が小さい業種です。
            </p>
          ) : (
            <CardGrid cols={2} gap="md">
              {patterns.map((p, i) => (
                <div
                  key={`${p.type}-${p.cause}-${i}`}
                  className={`rounded-lg border p-3 ${sw.chip}`}
                >
                  <p className="text-xs font-medium opacity-80">{p.type}</p>
                  <p className="mt-1 text-sm font-semibold">{p.cause}</p>
                  <p className="mt-1 text-xs opacity-80">
                    {num(p.count)}件 ・ 業種内 {pct(p.share)}
                  </p>
                </div>
              ))}
            </CardGrid>
          )}
          <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400 print:bg-white">
            <p className="font-semibold text-slate-700 dark:text-slate-300">業種が抱える典型的なハザード</p>
            <ul className="mt-1 ml-4 list-disc">
              {config.archetypes.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        </Section>

        {/* ---------- Time band + workplace size ---------------------- */}
        <Section
          title="時間帯・事業所規模"
          description="始業帯・残業帯など事故が集中する時間と、事業所規模ごとの分布を集計。"
          spacing="default"
          className="mt-8 print:break-inside-avoid"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <Cluster gap="xs">
                <Clock className={`h-4 w-4 ${sw.text}`} aria-hidden="true" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">時間帯別 発生比率</h3>
              </Cluster>
              <ul className="mt-2 space-y-2.5">
                {timeBands.map((b) => (
                  <BarRow
                    key={b.band}
                    label={b.label}
                    count={b.count}
                    share={b.share}
                    total={Math.max(1, ...timeBands.map((t) => t.count))}
                    color={config.colorClass}
                  />
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-500">
                厚労省 occurrenceTime（2時間幅）を 4 区分にまとめた業種内の分布。
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <Cluster gap="xs">
                <Building2 className={`h-4 w-4 ${sw.text}`} aria-hidden="true" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">事業所規模別</h3>
              </Cluster>
              <ul className="mt-2 space-y-2.5">
                {workplaceSizes.map((s) => (
                  <BarRow
                    key={s.tier}
                    label={s.label}
                    count={s.count}
                    share={s.share}
                    total={Math.max(1, ...workplaceSizes.map((t) => t.count))}
                    color={config.colorClass}
                  />
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-500">
                安衛法上の「規模別管理者選任義務」のラインで4区分。
              </p>
            </div>
          </div>
        </Section>

        {/* ---------- Worst months + multi-year line chart ------------- */}
        <Section
          title="月別 発生傾向と季節性"
          description="業種内で事故が集中する月と、過去3年の月次推移を比較表示。"
          spacing="default"
          className="mt-8 print:break-inside-avoid"
        >
          {worstMonths.length > 0 && (
            <CardGrid cols={3} gap="md">
              {worstMonths.map((m) => (
                <div
                  key={m.month}
                  className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
                >
                  <Cluster gap="xs">
                    <span className={`inline-flex h-7 min-w-[36px] items-center justify-center rounded-md px-2 text-sm font-bold ${sw.chip}`}>
                      {m.month}月
                    </span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{m.seasonTag}</span>
                  </Cluster>
                  <p className="mt-1 text-xs tabular-nums text-slate-500 dark:text-slate-400">
                    {num(m.count)}件 ・ {pct(m.share)}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-700 dark:text-slate-300">{m.hazardHint}</p>
                </div>
              ))}
            </CardGrid>
          )}
          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">月次推移（過去3年）</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              年単位の事故件数推移を月ベースで比較。季節要因と前年同月比を1画面で読み取れます。
            </p>
            <div className="mt-3">
              <MonthlyTrendChart rows={monthlyByYear.rows} years={monthlyByYear.years} />
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 print:break-inside-avoid">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">月別 全期間累計</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              業種累計の月別件数。季節要因（暑熱・降雪・年度切替）の影響を読み取るための分布です。
            </p>
            <div className="mt-3">
              <SeasonalityChart data={seasonality} color={config.colorClass} />
            </div>
          </div>
        </Section>

        {/* ---------- Year trend & YoY -------------------------------- */}
        <Section
          title="年次推移と前年同期比較"
          description="業種内の事故件数を年単位で集計。データ収録は年により濃淡があるため、絶対値ではなく構成比の変化を中心に読みます。"
          spacing="default"
          className="mt-8 print:break-inside-avoid"
        >
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <YearTrendChart data={yearTrend} color={config.colorClass} />
          </div>
        </Section>

        {/* ---------- Recommended countermeasures (frequency-based) --- */}
        <Section
          title={
            <Cluster gap="xs">
              <ShieldCheck className={`h-4 w-4 ${sw.text}`} aria-hidden="true" />
              <span>頻出 推奨対策（curated 事例ベース）</span>
            </Cluster>
          }
          description="curated 事例の preventionPoints から頻出度上位を抽出。朝礼・KY・年次計画に転記して使えます。"
          spacing="default"
          className="mt-8 print:break-inside-avoid"
        >
          {topPrevention.length === 0 ? (
            <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
              curated 事例が不足しており推奨対策を生成できませんでした。
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {topPrevention.map((p) => (
                <li
                  key={p.name}
                  className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 cursor-pointer accent-emerald-600"
                    aria-label={`${p.name} をチェック`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-slate-800 dark:text-slate-200">{p.name}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-500">
                      出現{num(p.count)}回
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* ---------- 30-item prevention checklist -------------------- */}
        <Section
          title={
            <Cluster gap="xs">
              <ListChecks className={`h-4 w-4 ${sw.text}`} aria-hidden="true" />
              <span>重大事故予防チェックリスト 30項目</span>
            </Cluster>
          }
          description="本業種で死亡災害を防ぐためのチェックリスト。6カテゴリ×5項目で構成され、PDF出力でそのまま現場会議資料に使えます。"
          spacing="default"
          className="mt-8 print:break-before-page"
        >
          <PreventionChecklist industry={config.slug as IndustrySlug} />
        </Section>

        {/* ---------- Related laws ------------------------------------ */}
        <Section
          title={
            <Cluster gap="xs">
              <BookOpen className={`h-4 w-4 ${sw.text}`} aria-hidden="true" />
              <span>関連法令マッピング</span>
            </Cluster>
          }
          description="本業種の死亡・重傷事例に対して条文遵守状況を確認すべき主要な労働安全衛生関連法令。"
          spacing="default"
          className="mt-8 print:break-inside-avoid"
        >
          <Stack gap="sm">
            {config.laws.map((law) => (
              <div
                key={law.name}
                className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
              >
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{law.name}</p>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{law.scope}</p>
              </div>
            ))}
          </Stack>
          <Cluster gap="xs" className="mt-3 text-xs print:hidden">
            <Link
              href="/laws"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              法改正一覧 <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            </Link>
            <Link
              href="/law-search"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              条文検索 <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </Cluster>
        </Section>

        {/* ---------- Compare CTA -------------------------------------- */}
        <Section title="他業種と比較" spacing="tight" className="mt-8 print:hidden">
          <Link
            href={`/accidents-reports/compare?industries=${config.slug},${
              config.slug === "construction" ? "manufacturing" : "construction"
            }`}
            className="group flex items-center gap-3 rounded-xl border-2 border-emerald-300 bg-gradient-to-r from-emerald-50 to-white p-4 transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-emerald-800 dark:from-emerald-950/30 dark:to-slate-950"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-emerald-600 text-white">
              <span className="text-2xl" aria-hidden="true">⚖️</span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                {config.label}を他業種と並べて比較
              </p>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                死亡率・主要事故型・原因・危険要因・季節性を業種横断で対比。
                2〜5業種まで自由に組み合わせて表示できます。
              </p>
            </div>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-emerald-600 transition group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </Section>

        {/* ---------- Cross-links ------------------------------------- */}
        {/* P1 関連動線強化: 業種別レポートの結末から、すぐに KY起票 / 日誌記録 へ
            進めるよう CTA を強化。AIリスク予測・統計ダッシュボードと並列に配置。 */}
        <Section title="次のアクション" spacing="tight" className="mt-8 print:hidden">
          <CardGrid cols={2} gap="md">
            <Link
              href="/ky"
              className="group rounded-lg border-2 border-emerald-300 bg-emerald-50 p-4 transition hover:border-emerald-500 hover:shadow-sm dark:border-emerald-700 dark:bg-emerald-950/40"
            >
              <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100">📝 KY用紙を起票</p>
              <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-300">本レポートの事故パターンを朝礼の危険予知活動に展開。業種別プリセット入り。</p>
            </Link>
            <Link
              href="/safety-diary/new"
              className="group rounded-lg border-2 border-sky-300 bg-sky-50 p-4 transition hover:border-sky-500 hover:shadow-sm dark:border-sky-700 dark:bg-sky-950/40"
            >
              <p className="text-sm font-bold text-sky-900 dark:text-sky-100">📓 安全衛生日誌を記録</p>
              <p className="mt-1 text-xs text-sky-800 dark:text-sky-300">本日の朝礼・KY結果・ヒヤリハットを記録。月次まとめで類似事故と連動。</p>
            </Link>
          </CardGrid>
          <CardGrid cols={3} gap="md" className="mt-3">
            <Link
              href="/accidents-analytics"
              className="group rounded-lg border border-slate-200 bg-white p-4 transition hover:border-emerald-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">📊 事故統計ダッシュボード</p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">25軸の多角分析で本業種以外も横断比較。</p>
            </Link>
            <Link
              href="/risk-prediction"
              className="group rounded-lg border border-slate-200 bg-white p-4 transition hover:border-emerald-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">🤖 AIリスク予測</p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">業種・作業内容を入力して潜在リスクを推定。</p>
            </Link>
            <Link
              href="/strategy/plan-generator"
              className="group rounded-lg border border-slate-200 bg-white p-4 transition hover:border-emerald-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">📋 年次計画ジェネレーター</p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">本レポートの結果を年次安全衛生計画書に反映。</p>
            </Link>
          </CardGrid>
        </Section>

        <p className="mt-8 text-[11px] leading-relaxed text-slate-500 dark:text-slate-500">
          出典: 厚生労働省 職場のあんぜんサイト 死亡災害DB（2019〜2024年）、労働者死傷病報告オープンデータ、編集部 curated 事例（公開情報を匿名化して再構成）。
          ※本レポートの件数集計は<strong className="font-semibold text-slate-600 dark:text-slate-400">死亡・重篤事例を中心とした記録</strong>が対象です。休業4日以上の全死傷件数（建設業は年間約14,000件規模）は含まず、別集計となります。
          本レポートは自動集計に基づく参考情報であり、個別案件の判断は所轄労働基準監督署および関係法令を確認してください。
        </p>
      </PageContainer>

      <ReportPrintFooter />
    </article>
  );
}
