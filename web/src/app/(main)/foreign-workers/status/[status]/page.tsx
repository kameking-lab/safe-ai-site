import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout";
import { PageJsonLd } from "@/components/page-json-ld";
import {
  getResidenceStatusIds,
  getResidenceStatusRule,
} from "@/data/foreign-worker-rules";
import {
  RESIDENCE_CATEGORY_LABELS_JA,
  SSF_FIELD_LABELS_JA,
  type ResidenceStatusId,
} from "@/types/foreign-worker";

type StatusPageProps = {
  params: Promise<{ status: string }>;
};

export function generateStaticParams() {
  return getResidenceStatusIds().map((id) => ({ status: id }));
}

export async function generateMetadata(
  props: StatusPageProps,
): Promise<Metadata> {
  const { status } = await props.params;
  const rule = getResidenceStatusRule(status as ResidenceStatusId);
  if (!rule) return { title: "在留資格ガイド" };
  const title = `${rule.labelJa}の安全衛生ガイド｜事業主義務と労働者の権利`;
  return {
    title,
    description: rule.summary,
    alternates: { canonical: `/foreign-workers/status/${rule.id}` },
    openGraph: {
      title,
      description: rule.summary,
      type: "article",
    },
  };
}

export default async function StatusDetailPage(props: StatusPageProps) {
  const { status } = await props.params;
  const rule = getResidenceStatusRule(status as ResidenceStatusId);
  if (!rule) notFound();

  return (
    <div className="min-h-screen bg-slate-50">
      <PageJsonLd
        name={`${rule.labelJa}の安全衛生ガイド`}
        description={rule.summary}
        path={`/foreign-workers/status/${rule.id}`}
        breadcrumbs={[
          { name: "ホーム", url: "https://www.anzen-ai-portal.jp" },
          {
            name: "外国人労働者の安全衛生支援",
            url: "https://www.anzen-ai-portal.jp/foreign-workers",
          },
          {
            name: rule.labelJa,
            url: `https://www.anzen-ai-portal.jp/foreign-workers/status/${rule.id}`,
          },
        ]}
      />
      <PageContainer width="prose" className="py-8 md:py-12">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            {RESIDENCE_CATEGORY_LABELS_JA[rule.category]}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            {rule.labelJa}の安全衛生ガイド
          </h1>
          <p className="mt-1 text-sm text-slate-500">{rule.labelEn}</p>
          <p className="mt-4 text-base text-slate-700">{rule.summary}</p>
        </header>

        <section className="mb-8 rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-base font-bold text-slate-900">在留資格の基本</h2>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold text-slate-500">在留期間</dt>
              <dd className="mt-0.5 text-slate-800">{rule.periodOfStay}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500">就労範囲</dt>
              <dd className="mt-0.5 text-slate-800">{rule.workScope}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500">就労制限</dt>
              <dd className="mt-0.5 text-slate-800">
                {rule.unlimitedWorkScope ? "なし（業種・職種自由）" : "あり"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500">転職</dt>
              <dd className="mt-0.5 text-slate-800">
                {rule.transferAllowed ? "可能（条件あり）" : "原則不可"}
              </dd>
            </div>
          </dl>
          {rule.ssfFields && rule.ssfFields.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-500">
                特定産業分野（適用分野）
              </p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {rule.ssfFields.map((f) => (
                  <li
                    key={f}
                    className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700"
                  >
                    {SSF_FIELD_LABELS_JA[f]}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold text-slate-900">適用される法令</h2>
          <ul className="mt-3 space-y-3">
            {rule.relevantSafetyLaws.map((law, i) => (
              <li
                key={i}
                className="rounded-lg border border-slate-200 bg-white p-4"
              >
                <p className="text-sm font-semibold text-slate-900">
                  {law.name}
                  {law.articles && law.articles.length > 0 && (
                    <span className="ml-2 text-xs font-normal text-slate-500">
                      {law.articles.join("・")}
                    </span>
                  )}
                </p>
                <p className="mt-1 text-sm text-slate-700">{law.summary}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold text-slate-900">事業主の義務</h2>
          <ol className="mt-3 space-y-3">
            {rule.employerObligations.map((ob, i) => (
              <li key={ob.id} className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900">
                  {i + 1}. {ob.title}
                </p>
                <p className="mt-1 text-sm text-amber-900/90">{ob.detail}</p>
                {ob.law && (
                  <p className="mt-2 text-xs text-amber-900/70">
                    根拠：{ob.law.name}
                    {ob.law.articles && ob.law.articles.length > 0
                      ? `（${ob.law.articles.join("・")}）`
                      : ""}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold text-slate-900">労働者の権利</h2>
          <ol className="mt-3 space-y-3">
            {rule.workerRights.map((r, i) => (
              <li
                key={r.id}
                className="rounded-lg border border-emerald-200 bg-emerald-50 p-4"
              >
                <p className="text-sm font-semibold text-emerald-900">
                  {i + 1}. {r.title}
                </p>
                <p className="mt-1 text-sm text-emerald-900/90">{r.detail}</p>
                {r.law && (
                  <p className="mt-2 text-xs text-emerald-900/70">
                    根拠：{r.law.name}
                    {r.law.articles && r.law.articles.length > 0
                      ? `（${r.law.articles.join("・")}）`
                      : ""}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold text-slate-900">よくあるトラブル事例</h2>
          <ul className="mt-3 space-y-3">
            {rule.commonTroubles.map((t) => (
              <li key={t.id} className="rounded-lg border border-rose-200 bg-rose-50 p-4">
                <p className="text-sm font-semibold text-rose-900">{t.title}</p>
                <p className="mt-1 text-sm text-rose-900/90">{t.detail}</p>
                <p className="mt-2 text-sm text-slate-700">
                  <span className="font-semibold">対応：</span>
                  {t.mitigation}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-8 rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-700">
          <h2 className="text-base font-bold text-slate-900">出典</h2>
          <ul className="mt-2 list-disc pl-5">
            {rule.sources.map((s, i) => (
              <li key={i}>{s.name}</li>
            ))}
          </ul>
        </section>

        <nav className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-6 text-sm">
          <Link
            href="/foreign-workers"
            className="text-emerald-700 hover:underline"
          >
            ← 外国人労働者支援トップへ戻る
          </Link>
          <Link
            href="/foreign-workers/safety-training"
            className="rounded-lg bg-sky-700 px-4 py-2 font-semibold text-white hover:bg-sky-800"
          >
            多言語安全教育教材を見る
          </Link>
        </nav>
      </PageContainer>
    </div>
  );
}
