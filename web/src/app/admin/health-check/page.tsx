import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  CRITICAL_PERCENT,
  fetchUsageSnapshot,
  formatQuantity,
  judgeHobbyReadiness,
  recommendedActions,
  statusFor,
  statusForLevel,
  summarizeAlerts,
  WARN_PERCENT,
  WATCH_PERCENT,
  type HobbyReadiness,
  type QuotaKey,
  type SampleStatus,
  type UsageSample,
  type UsageSnapshot,
} from "@/lib/vercel-monitoring";
import { UsageTrendChart } from "./UsageTrendChart";

export const metadata: Metadata = {
  title: "Vercel 利用量モニタリング 内部",
  robots: { index: false, follow: false, nocache: true, noarchive: true },
};

export const dynamic = "force-dynamic";

const TRENDABLE_QUOTAS: QuotaKey[] = [
  "isrWrites",
  "edgeRequests",
  "functionInvocations",
  "bandwidth",
];

interface Props {
  searchParams: Promise<{ key?: string }>;
}

export default async function HealthCheckPage({ searchParams }: Props) {
  const params = await searchParams;
  const validKey = process.env.STRATEGY_AUTH_PASSWORD ?? "";
  if (!validKey || params.key !== validKey) {
    notFound();
  }

  const snapshot = await fetchUsageSnapshot();
  const readiness = judgeHobbyReadiness(snapshot);
  const alerts = summarizeAlerts(snapshot.samples);
  const overallStatus = statusForLevel(alerts.worstLevel);
  const actions = recommendedActions(alerts.worstLevel);
  const resetDate = snapshot.period.end.slice(0, 10);

  return (
    <div className="min-h-screen bg-slate-50">
      <Header snapshot={snapshot} overall={overallStatus} resetDate={resetDate} />

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {snapshot.warningMessage && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong className="font-semibold">注意:</strong> {snapshot.warningMessage}
          </div>
        )}

        <SummaryBar snapshot={snapshot} readiness={readiness} />

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <SectionHeading title="クォータ別 利用状況" subtitle="月初リセット基準" />
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3">クォータ</th>
                  <th className="px-4 py-3">現状</th>
                  <th className="px-4 py-3">Hobby上限</th>
                  <th className="px-4 py-3 w-1/3">使用率</th>
                  <th className="px-4 py-3">ステータス</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {snapshot.samples.map((sample) => (
                  <UsageRow key={sample.key} sample={sample} />
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <SectionHeading
            title="過去30日の日次トレンド"
            subtitle="日割上限を100%として正規化した使用率（4クォータ）"
          />
          <div className="p-4">
            <UsageTrendChart trend={snapshot.trend} series={TRENDABLE_QUOTAS} />
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <SectionHeading
            title="Hobby復帰判定"
            subtitle="直近14日平均 × 30日 でHobby月間予測 / 80%以下が復帰条件"
          />
          <ReadinessPanel readiness={readiness} />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <SectionHeading title="推奨アクション" subtitle="現在の警告レベルに応じた推奨運用" />
          <ul className="p-4 space-y-2 text-sm text-slate-700">
            {actions.map((action) => (
              <li key={action} className="flex gap-2">
                <span className="text-slate-400" aria-hidden>
                  ▸
                </span>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </section>

        <Footer snapshot={snapshot} resetDate={resetDate} />
      </div>
    </div>
  );
}

function Header({
  snapshot,
  overall,
  resetDate,
}: {
  snapshot: UsageSnapshot;
  overall: SampleStatus;
  resetDate: string;
}) {
  const sourceLabel = SOURCE_LABEL[snapshot.source];
  return (
    <div className="bg-slate-800 text-white px-4 py-6">
      <div className="max-w-6xl mx-auto flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-slate-400 mb-1">安全AIポータル 内部 / noindex</p>
          <h1 className="text-xl font-bold leading-snug">Vercel 利用量モニタリング</h1>
          <p className="text-sm text-slate-300 mt-1">
            生成: {snapshot.generatedAt} / データソース: {sourceLabel} / 月末リセット予定: {resetDate}
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${overall.bg} ${overall.fg}`}
        >
          総合: {overall.label}
        </span>
      </div>
    </div>
  );
}

function SummaryBar({
  snapshot,
  readiness,
}: {
  snapshot: UsageSnapshot;
  readiness: HobbyReadiness;
}) {
  const cards: Array<{ label: string; value: string; hint: string }> = [
    {
      label: "月内経過",
      value: `${snapshot.period.daysIntoPeriod} / ${snapshot.period.totalDays} 日`,
      hint: `残り${snapshot.period.daysRemaining}日`,
    },
    {
      label: "最大使用率",
      value: maxPercentLabel(snapshot.samples),
      hint: maxPercentTarget(snapshot.samples),
    },
    {
      label: "Hobby復帰判定",
      value: READINESS_LABEL[readiness.status],
      hint: readiness.summary,
    },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {card.label}
          </p>
          <p className="mt-1 text-lg font-bold text-slate-900">{card.value}</p>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed">{card.hint}</p>
        </div>
      ))}
    </div>
  );
}

function UsageRow({ sample }: { sample: UsageSample }) {
  const status = statusFor(sample);
  const percent = sample.percent ?? 0;
  const barColor = barColorFor(percent, sample.percent === null);
  const limitLabel = sample.limit === null ? "上限なし（Hobby非該当）" : formatQuantity(sample.limit, sample.spec.unit);
  return (
    <tr className="align-top">
      <td className="px-4 py-3">
        <div className="font-semibold text-slate-900">{sample.spec.label}</div>
        <div className="text-xs text-slate-500">{sample.key}</div>
      </td>
      <td className="px-4 py-3 text-slate-700">
        {formatQuantity(sample.current, sample.spec.unit)}
      </td>
      <td className="px-4 py-3 text-slate-700">{limitLabel}</td>
      <td className="px-4 py-3">
        {sample.percent === null ? (
          <span className="text-xs text-slate-500">参考値（上限未公開）</span>
        ) : (
          <div className="flex items-center gap-3">
            <div className="relative flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 ${barColor}`}
                style={{ width: `${Math.min(100, percent)}%` }}
              />
              {percent > 100 && (
                <div
                  className="absolute inset-y-0 left-0 bg-red-700 mix-blend-multiply"
                  style={{ width: "100%" }}
                  aria-hidden
                />
              )}
            </div>
            <span className="text-xs font-mono text-slate-700 min-w-[3.5rem] text-right">
              {percent.toFixed(1)}%
            </span>
          </div>
        )}
        {sample.percent !== null && (
          <div className="mt-1 text-[10px] text-slate-400">
            閾値: 警告 {WATCH_PERCENT}% / 危険 {WARN_PERCENT}% / 停止 {CRITICAL_PERCENT}%
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${status.bg} ${status.fg}`}
        >
          {status.label}
        </span>
      </td>
    </tr>
  );
}

function ReadinessPanel({ readiness }: { readiness: HobbyReadiness }) {
  return (
    <div className="p-4 space-y-3">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        <strong className="font-semibold text-slate-900">判定:</strong>{" "}
        <span className={READINESS_TEXT[readiness.status]}>{READINESS_LABEL[readiness.status]}</span>
        <p className="mt-1 text-xs text-slate-600">{readiness.summary}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-100 text-left font-semibold uppercase text-slate-600">
            <tr>
              <th className="px-3 py-2">クォータ</th>
              <th className="px-3 py-2">直近14日 → 月間予測</th>
              <th className="px-3 py-2">Hobby上限</th>
              <th className="px-3 py-2">予測使用率</th>
              <th className="px-3 py-2">判定</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {readiness.projections.map((p) => (
              <tr key={p.key} className="align-top">
                <td className="px-3 py-2 text-slate-800">{p.spec.label}</td>
                <td className="px-3 py-2 text-slate-700 font-mono">
                  {formatQuantity(p.projected, p.spec.unit)}
                </td>
                <td className="px-3 py-2 text-slate-600">
                  {p.limit === null ? "—" : formatQuantity(p.limit, p.spec.unit)}
                </td>
                <td className="px-3 py-2 text-slate-700 font-mono">
                  {p.percent === null ? "—" : `${p.percent.toFixed(1)}%`}
                </td>
                <td className="px-3 py-2">
                  <span className={`text-xs font-semibold ${READINESS_TEXT[p.verdict]}`}>
                    {READINESS_LABEL[p.verdict]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {readiness.recommendations.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 space-y-1">
          <p className="font-semibold">復帰のための削減提案:</p>
          <ul className="space-y-1">
            {readiness.recommendations.map((r) => (
              <li key={r}>・{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Footer({ snapshot, resetDate }: { snapshot: UsageSnapshot; resetDate: string }) {
  return (
    <footer className="border-t border-slate-200 pt-6 pb-10 text-center text-xs text-slate-500">
      <p>
        Hobby復帰準備ダッシュボード / 月末リセット予定 {resetDate} / データソース:{" "}
        {SOURCE_LABEL[snapshot.source]}
      </p>
      <p className="mt-1 text-slate-400">
        VERCEL_TOKEN / VERCEL_TEAM_ID 未設定時はモックデータで動作。値はサーバ側のみで参照され、画面には表示されません。
      </p>
    </footer>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="border-b border-slate-100 px-4 py-3">
      <h2 className="text-sm font-bold text-slate-900">{title}</h2>
      <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
    </div>
  );
}

const SOURCE_LABEL: Record<UsageSnapshot["source"], string> = {
  live: "ライブ取得",
  cache: "キャッシュ（1時間TTL）",
  mock: "モック（VERCEL_TOKEN未設定）",
  fallback: "フォールバック（API障害時）",
};

const READINESS_LABEL: Record<HobbyReadiness["status"], string> = {
  ready: "復帰OK",
  borderline: "境界（余裕なし）",
  blocked: "復帰危険",
  unknown: "判定保留",
};

const READINESS_TEXT: Record<HobbyReadiness["status"], string> = {
  ready: "text-emerald-700",
  borderline: "text-amber-700",
  blocked: "text-red-700",
  unknown: "text-slate-500",
};

function barColorFor(percent: number, unknown: boolean): string {
  if (unknown) return "bg-slate-300";
  if (percent >= CRITICAL_PERCENT) return "bg-red-500";
  if (percent >= WARN_PERCENT) return "bg-orange-500";
  if (percent >= WATCH_PERCENT) return "bg-amber-500";
  return "bg-emerald-500";
}

function maxPercentLabel(samples: UsageSample[]): string {
  const values = samples
    .map((s) => s.percent)
    .filter((v): v is number => typeof v === "number");
  if (values.length === 0) return "—";
  const max = Math.max(...values);
  return `${max.toFixed(1)}%`;
}

function maxPercentTarget(samples: UsageSample[]): string {
  const top = samples
    .filter((s) => typeof s.percent === "number")
    .sort((a, b) => (b.percent ?? 0) - (a.percent ?? 0))[0];
  if (!top) return "データ不足";
  return `${top.spec.label} がボトルネック`;
}
