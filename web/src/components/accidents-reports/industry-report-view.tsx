import Link from "next/link";
import { ArrowUpRight, AlertTriangle, ShieldCheck, BookOpen, TrendingUp, Calendar } from "lucide-react";
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
  const { config, stats, topTypes, topCauses, topPrevention, seasonality, yearTrend, yoy, patterns, topCases } = report;
  const sw = swatch(config.colorClass);

  return (
    <PageContainer width="full">
      <Breadcrumb
        items={[
          { name: "事故データベース", href: "/accidents" },
          { name: "業種別レポート", href: "/accidents-reports" },
          { name: config.label },
        ]}
      />

      {/* ---------- Header ------------------------------------------- */}
      <header className={`rounded-xl border p-5 ${sw.chip}`}>
        <Cluster gap="sm">
          <span className="text-3xl" aria-hidden="true">
            {config.icon}
          </span>
          <div>
            <p className="text-xs font-medium opacity-80">業種別 事故分析レポート</p>
            <h1 className="text-2xl font-bold sm:text-3xl">{config.label}</h1>
          </div>
        </Cluster>
        <p className="mt-3 text-sm leading-relaxed">{config.tagline}</p>
        <p className="mt-1 text-xs opacity-70">
          {config.labelEn} ・ 集計期間 {stats.yearRange.min}年〜{stats.yearRange.max}年 ・ 母集団{num(stats.total)}件
        </p>
      </header>

      {/* ---------- KPI cards ---------------------------------------- */}
      <Section title="サマリ" spacing="tight" className="mt-6">
        <CardGrid cols={4} gap="md">
          <KpiCard
            label="事故事例 合計"
            value={`${num(stats.total)}件`}
            caption={`厚労省データ＋curated事例の合算（${stats.yearRange.min}-${stats.yearRange.max}）`}
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
            label="curated詳細事例"
            value={`${num(stats.totalCurated)}件`}
            caption="原因・予防策の解説付き"
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
      </Section>

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
        className="mt-8"
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
        className="mt-8"
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
        className="mt-8"
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
        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
          <p className="font-semibold text-slate-700 dark:text-slate-300">業種が抱える典型的なハザード</p>
          <ul className="mt-1 ml-4 list-disc">
            {config.archetypes.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      </Section>

      {/* ---------- Seasonality ------------------------------------ */}
      <Section
        title="月別 発生傾向"
        description="季節要因（暑熱・降雪・年度切替）を読み取るための業種内の月別集計。"
        spacing="default"
        className="mt-8"
      >
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <SeasonalityChart data={seasonality} color={config.colorClass} />
        </div>
      </Section>

      {/* ---------- Year trend & YoY -------------------------------- */}
      <Section
        title="年次推移と前年同期比較"
        description="業種内の事故件数を年単位で集計。データ収録は年により濃淡があるため、絶対値ではなく構成比の変化を中心に読みます。"
        spacing="default"
        className="mt-8"
      >
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <YearTrendChart data={yearTrend} color={config.colorClass} />
        </div>
      </Section>

      {/* ---------- Recommended countermeasures --------------------- */}
      <Section
        title={
          <Cluster gap="xs">
            <ShieldCheck className={`h-4 w-4 ${sw.text}`} aria-hidden="true" />
            <span>推奨対策チェックリスト</span>
          </Cluster>
        }
        description="curated 事例の preventionPoints から頻出度上位を抽出。朝礼・KY・年次計画に転記して使えます。"
        spacing="default"
        className="mt-8"
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
        className="mt-8"
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
        <Cluster gap="xs" className="mt-3 text-xs">
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

      {/* ---------- Cross-links ------------------------------------- */}
      <Section title="次のアクション" spacing="tight" className="mt-8">
        <CardGrid cols={3} gap="md">
          <Link
            href="/accidents-analytics"
            className="group rounded-lg border border-slate-200 bg-white p-4 transition hover:border-emerald-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">📊 事故統計ダッシュボード</p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">25軸の多角分析で本業種以外も横断比較。</p>
          </Link>
          <Link
            href="/ky"
            className="group rounded-lg border border-slate-200 bg-white p-4 transition hover:border-emerald-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">📝 KY用紙を起票</p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">本レポートのパターンを朝礼の危険予知活動に展開。</p>
          </Link>
          <Link
            href="/risk-prediction"
            className="group rounded-lg border border-slate-200 bg-white p-4 transition hover:border-emerald-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">🤖 AIリスク予測</p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">業種・作業内容を入力して潜在リスクを推定。</p>
          </Link>
        </CardGrid>
      </Section>

      <p className="mt-8 text-[11px] leading-relaxed text-slate-500 dark:text-slate-500">
        出典: 厚生労働省 職場のあんぜんサイト 死亡災害DB、労働者死傷病報告オープンデータ、編集部 curated 事例（公開情報を匿名化して再構成）。
        本レポートは自動集計に基づく参考情報であり、個別案件の判断は所轄労働基準監督署および関係法令を確認してください。
      </p>
    </PageContainer>
  );
}
