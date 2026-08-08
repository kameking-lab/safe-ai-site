import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { hasAdminPageAccess } from "@/lib/server/admin-access";
import {
  getOperationsCockpitData,
  type OperationalStatus,
} from "@/lib/operations/cockpit-data";
import type { RumMetricSummary } from "@/lib/operations/rum-aggregation";

export const metadata: Metadata = {
  title: "運用・成長コックピット | 管理者",
  description: "安全AIポータルの非公開運用・成長コックピット",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
  },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STATUS_STYLE: Record<OperationalStatus, string> = {
  operational: "border-emerald-700 bg-emerald-50 text-emerald-950",
  degraded: "border-amber-700 bg-amber-50 text-amber-950",
  stale: "border-orange-700 bg-orange-50 text-orange-950",
  unavailable: "border-red-700 bg-red-50 text-red-950",
  disabled: "border-slate-600 bg-slate-100 text-slate-900",
  "pending-external": "border-violet-700 bg-violet-50 text-violet-950",
  unknown: "border-slate-600 bg-white text-slate-900",
};

function StatusBadge({ status }: { status: OperationalStatus }) {
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 text-xs font-bold ${STATUS_STYLE[status]}`}
    >
      {status}
    </span>
  );
}

function StateBadge({ value }: { value: string }) {
  const positive =
    /^(?:PASS|active|available|configured|ready|confirmed|true)$/i.test(value);
  const waiting = /pending|preparing|blocked|domain|ready-for-test/i.test(
    value,
  );
  const style = positive
    ? "border-emerald-700 bg-emerald-50 text-emerald-950"
    : waiting
      ? "border-amber-700 bg-amber-50 text-amber-950"
      : "border-slate-600 bg-white text-slate-950";
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 text-xs font-bold ${style}`}
    >
      {value}
    </span>
  );
}

function yesNo(value: boolean): string {
  return value ? "あり" : "なし";
}

function formatDate(value: string | null): string {
  if (!value) return "データなし";
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function metricValue(metric: RumMetricSummary["metric"], value: number | null) {
  if (value === null) return "—";
  if (metric === "CLS") return value.toFixed(3);
  return `${Math.round(value)} ms`;
}

function percent(value: number | null): string {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

function change(value: number | null, metric?: RumMetricSummary["metric"]) {
  if (value === null) return "比較データなし";
  const formatted =
    metric === "CLS" ? value.toFixed(3) : `${Math.round(value)} ms`;
  return `${value > 0 ? "+" : ""}${formatted}`;
}

function DefinitionGrid({ entries }: { entries: Array<[string, ReactNode]> }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {entries.map(([label, value]) => (
        <div
          key={label}
          className="min-w-0 rounded-xl border border-slate-300 bg-white p-3"
        >
          <dt className="text-xs font-bold text-slate-600">{label}</dt>
          <dd className="mt-1 break-words text-sm font-semibold text-slate-950">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default async function OperationsPage() {
  // Parent layout already enforces this. Re-check before any operational query
  // so a future layout refactor cannot make data loading precede authorization.
  if (!(await hasAdminPageAccess())) notFound();
  const data = await getOperationsCockpitData();
  const funnelCounts = data.funnel.counts;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-700 bg-slate-950 px-4 py-7 text-white">
        <div className="mx-auto max-w-[110rem]">
          <p className="text-xs font-bold tracking-[0.18em] text-emerald-300">
            ADMIN ONLY · NOINDEX · NO-STORE
          </p>
          <h1 className="mt-2 text-2xl font-black sm:text-3xl">
            運用・成長コックピット
          </h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-200">
            完全URL・query・token・個人情報・相談本文を扱わず、固定route
            templateと粗い分類値だけで本番状態、性能、成約ファネル、更新品質を確認します。
          </p>
          <p className="mt-2 text-xs text-slate-300">
            生成: {formatDate(data.generatedAt)}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-[110rem] space-y-8 px-4 py-8">
        <section aria-labelledby="production-state-title">
          <h2 id="production-state-title" className="text-xl font-black">
            1. 本番状態
          </h2>
          <div className="mt-4">
            <DefinitionGrid
              entries={[
                ["Deployment ID", data.deployment.deploymentId],
                ["Build ID", data.deployment.buildId],
                ["Deployment時刻", data.deployment.deploymentAt],
                ["Production URL", data.deployment.productionUrl],
                [
                  "Health",
                  <StatusBadge key="health" status={data.deployment.health} />,
                ],
                ["Rollback先", data.deployment.rollbackDeploymentId],
                [
                  "最終smoke",
                  `${data.deployment.lastSmoke.status} / ${data.deployment.lastSmoke.at} / ${data.deployment.lastSmoke.deploymentId}`,
                ],
                [
                  "最終full gate",
                  `${data.deployment.lastFullGate.status} / ${data.deployment.lastFullGate.at}`,
                ],
              ]}
            />
          </div>
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-300 bg-white">
            <table className="min-w-full text-left text-sm">
              <caption className="px-4 py-3 text-left font-bold">
                Feature flags（値・秘密情報は非表示）
              </caption>
              <thead className="bg-slate-200">
                <tr>
                  <th className="px-4 py-2">機能</th>
                  <th className="px-4 py-2">状態</th>
                </tr>
              </thead>
              <tbody>
                {data.deployment.featureFlags.map((flag) => (
                  <tr key={flag.name} className="border-t border-slate-200">
                    <th scope="row" className="px-4 py-3 font-semibold">
                      {flag.name}
                    </th>
                    <td className="px-4 py-3">
                      <StateBadge
                        value={flag.enabled ? "active" : "disabled"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="rum-title">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="rum-title" className="text-xl font-black">
                2. Core Web Vitals・RUM
              </h2>
              <p className="mt-1 text-sm text-slate-700">
                期間: {formatDate(data.rum.period.start)}〜
                {formatDate(data.rum.period.end)} / 実データ範囲:{" "}
                {formatDate(data.rum.actualRange.firstAt)}〜
                {formatDate(data.rum.actualRange.lastAt)}
              </p>
            </div>
            <StateBadge
              value={data.rum.available ? "configured" : "unavailable"}
            />
          </div>
          <div className="mt-4">
            <DefinitionGrid
              entries={[
                ["サンプル件数", data.rum.sampleCount],
                ["匿名bucket数", data.rum.distinctAnonymousBuckets],
                ["deployment数", data.rum.deploymentCount],
                ["データ不足route数", data.rum.insufficientRouteCount],
              ]}
            />
          </div>
          <p
            role="status"
            className="mt-4 rounded-xl border-2 border-amber-700 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-950"
          >
            route内の観測済み各metricが100件以上、または実データ範囲7日以上になるまで「データ不足」です。
            少数データから性能改修の結論は出しません。
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {data.rum.overallMetrics.map((metric) => (
              <article
                key={metric.metric}
                className="rounded-xl border border-slate-300 bg-white p-4"
              >
                <h3 className="font-black">{metric.metric}</h3>
                <p className="mt-2 text-sm">
                  p50 {metricValue(metric.metric, metric.p50)}
                </p>
                <p className="text-sm">
                  p75 {metricValue(metric.metric, metric.p75)}
                </p>
                <p className="text-sm">
                  p95 {metricValue(metric.metric, metric.p95)}
                </p>
                <p className="mt-2 text-xs">
                  n={metric.sampleCount} / rating {metric.rating}
                </p>
                <p className="text-xs">
                  前期間p75差 {change(metric.p75Change, metric.metric)} /{" "}
                  {metric.trend}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-300 bg-white">
            <table className="min-w-[88rem] text-left text-xs">
              <caption className="px-4 py-3 text-left text-sm font-bold">
                route template別RUM（URL・query・匿名bucket値は非表示）
              </caption>
              <thead className="bg-slate-200">
                <tr>
                  <th className="px-3 py-2">route</th>
                  <th className="px-3 py-2">metric</th>
                  <th className="px-3 py-2">n</th>
                  <th className="px-3 py-2">p50</th>
                  <th className="px-3 py-2">p75</th>
                  <th className="px-3 py-2">p95</th>
                  <th className="px-3 py-2">rating</th>
                  <th className="px-3 py-2">前期間差</th>
                  <th className="px-3 py-2">device</th>
                  <th className="px-3 py-2">connection</th>
                  <th className="px-3 py-2">navigation</th>
                  <th className="px-3 py-2">
                    bucket / deploy / observed days / min metric n
                  </th>
                  <th className="px-3 py-2">判定</th>
                </tr>
              </thead>
              <tbody>
                {data.rum.routes.flatMap((route) =>
                  route.metrics.map((metric, index) => (
                    <tr
                      key={`${route.routeTemplate}:${metric.metric}`}
                      className="border-t border-slate-200 align-top"
                    >
                      <th scope="row" className="px-3 py-2 font-mono">
                        {index === 0 ? route.routeTemplate : ""}
                      </th>
                      <td className="px-3 py-2 font-bold">{metric.metric}</td>
                      <td className="px-3 py-2">{metric.sampleCount}</td>
                      <td className="px-3 py-2">
                        {metricValue(metric.metric, metric.p50)}
                      </td>
                      <td className="px-3 py-2">
                        {metricValue(metric.metric, metric.p75)}
                      </td>
                      <td className="px-3 py-2">
                        {metricValue(metric.metric, metric.p95)}
                      </td>
                      <td className="px-3 py-2">{metric.rating}</td>
                      <td className="px-3 py-2">
                        {change(metric.p75Change, metric.metric)}
                      </td>
                      <td className="px-3 py-2">
                        {route.deviceClasses
                          .map((item) => `${item.value}:${item.sampleCount}`)
                          .join(" / ") || "—"}
                      </td>
                      <td className="px-3 py-2">
                        {route.connectionClasses
                          .map((item) => `${item.value}:${item.sampleCount}`)
                          .join(" / ") || "—"}
                      </td>
                      <td className="px-3 py-2">
                        {route.navigationTypes
                          .map((item) => `${item.value}:${item.sampleCount}`)
                          .join(" / ") || "—"}
                      </td>
                      <td className="px-3 py-2">
                        {route.distinctAnonymousBuckets} /{" "}
                        {route.deploymentCount} / {route.observedDayCount}
                        {" / "}
                        {route.minimumMetricSampleCount}
                      </td>
                      <td className="px-3 py-2 font-bold">
                        {route.dataSufficient
                          ? `利用可 (${route.sufficiencyReason})`
                          : `データ不足 (${route.sufficiencyReason})`}
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
          <h3 className="mt-5 text-base font-bold">直近2 deploymentの比較</h3>
          <div className="mt-2 overflow-x-auto rounded-xl border border-slate-300 bg-white">
            <table className="min-w-[56rem] text-left text-xs">
              <thead className="bg-slate-200">
                <tr>
                  <th className="px-3 py-2">deployment</th>
                  <th className="px-3 py-2">期間</th>
                  <th className="px-3 py-2">sample</th>
                  {["LCP", "CLS", "INP", "FCP", "TTFB"].map((metric) => (
                    <th key={metric} className="px-3 py-2">
                      {metric} p75
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rum.deploymentComparisons.length > 0 ? (
                  data.rum.deploymentComparisons.map((deployment) => (
                    <tr
                      key={deployment.deployment}
                      className="border-t border-slate-200"
                    >
                      <th scope="row" className="px-3 py-2 font-mono">
                        {deployment.deployment}
                      </th>
                      <td className="px-3 py-2">
                        {formatDate(deployment.firstAt)}〜
                        {formatDate(deployment.lastAt)}
                      </td>
                      <td className="px-3 py-2">{deployment.sampleCount}</td>
                      {deployment.metrics.map((metric) => (
                        <td key={metric.metric} className="px-3 py-2">
                          {metricValue(metric.metric, metric.p75)}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-3 py-4 font-bold">
                      比較可能なdeploymentデータなし
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="errors-title">
          <h2 id="errors-title" className="text-xl font-black">
            3. エラー
          </h2>
          <p className="mt-1 text-sm text-slate-700">
            最終読取レビュー: {data.errors.observedAt} / deployment{" "}
            {data.errors.deployment}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-600">
            データ種別: {data.errors.source}
          </p>
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-300 bg-white">
            <table className="min-w-[72rem] text-left text-sm">
              <thead className="bg-slate-200">
                <tr>
                  <th className="px-3 py-2">status</th>
                  <th className="px-3 py-2">route template</th>
                  <th className="px-3 py-2">件数</th>
                  <th className="px-3 py-2">最終発生</th>
                  <th className="px-3 py-2">前期間差</th>
                  <th className="px-3 py-2">traffic分類</th>
                  <th className="px-3 py-2">再現状況</th>
                  <th className="px-3 py-2">対応状態</th>
                </tr>
              </thead>
              <tbody>
                {data.errors.rows.map((row) => (
                  <tr
                    key={`${row.statusClass}:${row.routeTemplate}`}
                    className="border-t border-slate-200"
                  >
                    <th scope="row" className="px-3 py-3">
                      {row.statusClass}
                    </th>
                    <td className="px-3 py-3 font-mono">{row.routeTemplate}</td>
                    <td className="px-3 py-3">{row.count}</td>
                    <td className="px-3 py-3">{row.lastObserved}</td>
                    <td className="px-3 py-3">比較データなし</td>
                    <td className="px-3 py-3">{row.trafficClass}</td>
                    <td className="px-3 py-3">{row.reproduction}</td>
                    <td className="px-3 py-3">{row.responseStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-slate-600">{data.errors.privacy}</p>
        </section>

        <section aria-labelledby="features-title">
          <h2 id="features-title" className="text-xl font-black">
            4. 機能稼働状態
          </h2>
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-300 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-200">
                <tr>
                  <th className="px-4 py-2">機能</th>
                  <th className="px-4 py-2">状態</th>
                  <th className="px-4 py-2">境界・補足</th>
                </tr>
              </thead>
              <tbody>
                {data.features.map(([name, status, note]) => (
                  <tr key={name} className="border-t border-slate-200">
                    <th scope="row" className="px-4 py-3">
                      {name}
                    </th>
                    <td className="px-4 py-3">
                      <StatusBadge status={status} />
                    </td>
                    <td className="px-4 py-3">{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="consult-title">
          <h2 id="consult-title" className="text-xl font-black">
            5. 自動化相談
          </h2>
          <div className="mt-4">
            <DefinitionGrid
              entries={[
                ["受付状態", data.consultation.label],
                ["フォーム表示", yesNo(data.consultation.accepting)],
                ["recipient設定", yesNo(data.consultation.recipientConfigured)],
                ["From設定", yesNo(data.consultation.fromConfigured)],
                ["provider設定", yesNo(data.consultation.providerConfigured)],
                ["provider readiness", data.consultation.providerReadiness],
                ["共有state", data.consultation.sharedState],
                ["rate limit", data.consultation.rateLimit],
                ["idempotency", data.consultation.idempotency],
                [
                  "最終dry-run",
                  `${data.consultation.lastDryRun.status} / ${data.consultation.lastDryRun.at} / ${data.consultation.lastDryRun.scope}`,
                ],
                [
                  "最終provider accepted",
                  `${data.consultation.lastProviderAccepted.status} / ${data.consultation.lastProviderAccepted.at} / ${data.consultation.lastProviderAccepted.scope}`,
                ],
                ["bounce・complaint", data.consultation.bounceComplaint],
              ]}
            />
          </div>
          <div className="mt-4 rounded-xl border border-slate-300 bg-white p-4 text-sm">
            <h3 className="font-bold">Productionでフォームを表示できる条件</h3>
            <p className="mt-1 leading-6">
              {data.consultation.formDisplayCondition}
            </p>
            <h3 className="mt-3 font-bold">未設定項目</h3>
            <p className="mt-1">
              {data.consultation.missingItems.join("、") || "なし"}
            </p>
            <p className="mt-2 text-xs text-slate-600">
              受信者アドレス・相談内容・受付番号は表示しません。
            </p>
          </div>
        </section>

        <section aria-labelledby="funnel-title">
          <h2 id="funnel-title" className="text-xl font-black">
            6. 相談・成約ファネル
          </h2>
          <p className="mt-1 text-sm text-slate-700">
            明示同意後・production
            only。Webフォーム停止中のため完了0件は異常扱いしません。
            unavailableは通常離脱と分離しています。
          </p>
          <div className="mt-4">
            <DefinitionGrid
              entries={[
                ["サービス閲覧", funnelCounts.automation_service_view],
                ["料金閲覧", funnelCounts.automation_pricing_view],
                ["CTAクリック", funnelCounts.automation_cta_click],
                ["フォーム開始", funnelCounts.automation_form_start],
                ["unavailable", funnelCounts.automation_form_unavailable],
                [
                  "validation error",
                  funnelCounts.automation_form_validation_error,
                ],
                ["完了", funnelCounts.automation_form_success],
                ["匿名bucket", data.funnel.distinctAnonymousBuckets],
              ]}
            />
          </div>
          <div className="mt-4">
            <DefinitionGrid
              entries={[
                ["料金閲覧率", percent(data.funnel.rates.pricingViewRate)],
                ["CTAクリック率", percent(data.funnel.rates.ctaClickRate)],
                ["フォーム開始率", percent(data.funnel.rates.formStartRate)],
                ["unavailable率", percent(data.funnel.rates.unavailableRate)],
                [
                  "validation error率",
                  percent(data.funnel.rates.validationErrorRate),
                ],
                ["完了率", percent(data.funnel.rates.completionRate)],
                [
                  "対象期間",
                  `${formatDate(data.funnel.period.start)}〜${formatDate(data.funnel.period.end)}`,
                ],
                ["保存境界", "PIIなし・queryなし・tokenなし・exact UAなし"],
              ]}
            />
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <div className="overflow-x-auto rounded-xl border border-slate-300 bg-white">
              <table className="min-w-full text-left text-sm">
                <caption className="px-4 py-3 text-left font-bold">
                  デバイス別
                </caption>
                <thead className="bg-slate-200">
                  <tr>
                    <th className="px-3 py-2">device</th>
                    <th className="px-3 py-2">service</th>
                    <th className="px-3 py-2">CTA</th>
                    <th className="px-3 py-2">start</th>
                    <th className="px-3 py-2">success</th>
                  </tr>
                </thead>
                <tbody>
                  {data.funnel.deviceBreakdown.length ? (
                    data.funnel.deviceBreakdown.map((item) => (
                      <tr
                        key={item.deviceClass}
                        className="border-t border-slate-200"
                      >
                        <th className="px-3 py-2">{item.deviceClass}</th>
                        <td className="px-3 py-2">
                          {item.counts.automation_service_view}
                        </td>
                        <td className="px-3 py-2">
                          {item.counts.automation_cta_click}
                        </td>
                        <td className="px-3 py-2">
                          {item.counts.automation_form_start}
                        </td>
                        <td className="px-3 py-2">
                          {item.counts.automation_form_success}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-3 py-4">
                        データなし
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-300 bg-white">
              <table className="min-w-full text-left text-sm">
                <caption className="px-4 py-3 text-left font-bold">
                  CTA位置別
                </caption>
                <thead className="bg-slate-200">
                  <tr>
                    <th className="px-3 py-2">position</th>
                    <th className="px-3 py-2">click</th>
                    <th className="px-3 py-2">start</th>
                    <th className="px-3 py-2">success</th>
                  </tr>
                </thead>
                <tbody>
                  {data.funnel.ctaPositionBreakdown.length ? (
                    data.funnel.ctaPositionBreakdown.map((item) => (
                      <tr
                        key={item.ctaPosition}
                        className="border-t border-slate-200"
                      >
                        <th className="px-3 py-2">{item.ctaPosition}</th>
                        <td className="px-3 py-2">
                          {item.counts.automation_cta_click}
                        </td>
                        <td className="px-3 py-2">
                          {item.counts.automation_form_start}
                        </td>
                        <td className="px-3 py-2">
                          {item.counts.automation_form_success}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-3 py-4">
                        データなし
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section aria-labelledby="search-console-title">
          <h2 id="search-console-title" className="text-xl font-black">
            7. SEO・Search Console
          </h2>
          <div className="mt-4">
            <DefinitionGrid
              entries={[
                ["状態", data.searchConsole.status],
                ["service account", data.searchConsole.serviceAccount],
                ["OAuth", data.searchConsole.oauth],
                ["対象property", data.searchConsole.targetProperty],
                [
                  "必要な外部操作1件",
                  data.searchConsole.requiredExternalAction,
                ],
                ["必要権限", data.searchConsole.requiredPermission],
                ["最終確認", data.searchConsole.lastCheckedAt],
                ["データ種別", data.searchConsole.snapshotKind],
                ["自動実行", data.searchConsole.operationsCron],
                ["Preview除外", yesNo(data.searchConsole.previewExcluded)],
                ["clicks", data.searchConsole.clicks ?? "取得不能"],
                ["impressions", data.searchConsole.impressions ?? "取得不能"],
                ["CTR", data.searchConsole.ctr ?? "取得不能"],
                [
                  "average position",
                  data.searchConsole.averagePosition ?? "取得不能",
                ],
                ["index status", data.searchConsole.indexStatus],
                ["sitemap status", data.searchConsole.sitemapStatus],
                ["Core Web Vitals", data.searchConsole.coreWebVitals],
              ]}
            />
          </div>
        </section>

        <section aria-labelledby="data-quality-title">
          <h2 id="data-quality-title" className="text-xl font-black">
            8. データ品質
          </h2>
          <div className="mt-4">
            <DefinitionGrid
              entries={[
                ["source registry", data.dataQuality.sourceRegistryCount],
                ["stale", data.dataQuality.stale],
                ["quarantine", data.dataQuality.quarantine],
                ["human review pending", data.dataQuality.humanReviewPending],
                ["broken source", data.dataQuality.brokenSource],
                ["hash mismatch", data.dataQuality.hashMismatch],
                ["claim drift", data.dataQuality.claimDrift],
                ["synthetic", data.dataQuality.synthetic],
                ["official", data.dataQuality.official],
                [
                  "last successful update",
                  data.dataQuality.lastSuccessfulUpdate,
                ],
                ["last failure", data.dataQuality.lastFailure],
              ]}
            />
          </div>
        </section>

        <section aria-labelledby="heat-review-title">
          <h2 id="heat-review-title" className="text-xl font-black">
            9. 熱中症review
          </h2>
          <div className="mt-4">
            <DefinitionGrid
              entries={[
                ["legal", data.heatReview.legal],
                ["medical", data.heatReview.medical],
                ["editorial", data.heatReview.editorial],
                ["duplicate", data.heatReview.duplicate],
                ["source-gap", data.heatReview.sourceGap],
                ["needs-rewrite", data.heatReview.needsRewrite],
                ["approved", data.heatReview.approved],
                ["pending", data.heatReview.pending],
                ["noindex", yesNo(data.heatReview.noindex)],
                ["sitemap除外", yesNo(data.heatReview.sitemapExcluded)],
                ["最終claim drift", data.heatReview.lastClaimDrift],
                ["import validator", data.heatReview.importValidator],
                ["最終確認", data.heatReview.asOf],
                ["データ種別", data.heatReview.snapshotKind],
              ]}
            />
          </div>
          <p className="mt-4 rounded-xl border-2 border-violet-700 bg-violet-50 p-4 text-sm font-bold leading-6 text-violet-950">
            {data.heatReview.releaseBoundary}
          </p>
        </section>

        <section aria-labelledby="gates-title">
          <h2 id="gates-title" className="text-xl font-black">
            10. 自動品質ゲート
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.qualityGates.map((gate) => (
              <div
                key={gate.name}
                className="rounded-xl border border-slate-300 bg-white p-3"
              >
                <h3 className="font-bold">{gate.name}</h3>
                <div className="mt-2">
                  <StateBadge value={gate.status} />
                </div>
                <p className="mt-2 text-xs text-slate-600">{gate.lastRunAt}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
