import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink, AlertTriangle, ShieldCheck, Building2, Calendar } from "lucide-react";
import { JsonLd, breadcrumbSchema } from "@/components/json-ld";
import { AccidentActionBar } from "@/components/accidents/action-bar";
import { ContextualPpePicks } from "@/components/ContextualPpePicks";
import { getAccidentCasesDataset } from "@/data/mock/accident-cases";
import { resolveAccidentSource } from "@/lib/accident-source";
import { getAccidentRelated } from "@/lib/accident-related";
import { ogImageUrl } from "@/lib/og-url";
import type { AccidentCase } from "@/lib/types/domain";

const SITE_BASE = "https://safe-ai-site.vercel.app";

function findAccident(id: string): AccidentCase | undefined {
  return getAccidentCasesDataset().find((c) => c.id === id);
}

export function generateStaticParams() {
  // 件数が多いため、SSGは行わずオンデマンド（ISR/Dynamic）で生成する。
  // generateStaticParams は空配列を返すと Next が dynamicParams で扱う。
  return [];
}

export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const accident = findAccident(id);
  if (!accident) return {};
  const title = `${accident.title}｜事故事例詳細`;
  const description = `${accident.workCategory} ${accident.severity}「${accident.title}」（${accident.occurredOn}）の事故概要・原因・再発防止策と関連する保護具・KY起票・関連法令を確認できます。`;
  return {
    title,
    description,
    alternates: { canonical: `/accidents/${id}` },
    openGraph: {
      title: `${title}｜ANZEN AI`,
      description,
      images: [{ url: ogImageUrl(accident.title, accident.type), width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", images: [ogImageUrl(accident.title)] },
  };
}

const SEVERITY_BADGE: Record<AccidentCase["severity"], string> = {
  軽傷: "bg-emerald-100 text-emerald-800 border-emerald-200",
  中等傷: "bg-amber-100 text-amber-800 border-amber-200",
  重傷: "bg-orange-100 text-orange-900 border-orange-300",
  死亡: "bg-rose-100 text-rose-900 border-rose-300",
};

function pickSimilarAccidents(target: AccidentCase, all: AccidentCase[], limit = 3): AccidentCase[] {
  return all
    .filter((c) => c.id !== target.id && (c.type === target.type || c.workCategory === target.workCategory))
    .slice(0, limit);
}

export default async function AccidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const accident = findAccident(id);
  if (!accident) notFound();

  const source = resolveAccidentSource(accident);
  const related = getAccidentRelated(accident.type);
  const url = `${SITE_BASE}/accidents/${accident.id}`;
  const similar = pickSimilarAccidents(accident, getAccidentCasesDataset());

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <JsonLd
        schema={[
          breadcrumbSchema([
            { name: "ホーム", url: SITE_BASE },
            { name: "事故データベース", url: `${SITE_BASE}/accidents` },
            { name: accident.title, url },
          ]),
        ]}
      />

      <nav className="mb-5 flex items-center gap-1.5 text-xs text-slate-500">
        <Link href="/accidents" className="flex items-center gap-1 hover:text-emerald-600 transition-colors">
          <ChevronLeft className="h-3 w-3" />
          事故データベース
        </Link>
        <span>/</span>
        <span className="line-clamp-1 text-slate-700">{accident.title}</span>
      </nav>

      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-bold text-rose-800">
            {accident.type}
          </span>
          <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-bold text-sky-800">
            {accident.workCategory}
          </span>
          <span
            className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${SEVERITY_BADGE[accident.severity]}`}
          >
            {accident.severity}
          </span>
        </div>
        <h1 className="mt-3 text-xl font-bold leading-snug text-slate-900 sm:text-2xl">
          {accident.title}
        </h1>
        <dl className="mt-3 grid grid-cols-1 gap-1 text-xs text-slate-600 sm:grid-cols-2">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <dt className="font-bold text-slate-700">発生日:</dt>
            <dd>{accident.occurredOn}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-slate-400" />
            <dt className="font-bold text-slate-700">業種:</dt>
            <dd>{accident.industry_detail ?? accident.workCategory}</dd>
          </div>
        </dl>
      </header>

      {/* 事故概要 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900">📄 事故概要</h2>
        <p className="mt-2 text-sm leading-7 text-slate-700">{accident.summary}</p>
      </section>

      {/* 原因 */}
      <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/40 p-5 shadow-sm">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-amber-900">
          <AlertTriangle className="h-4 w-4" />
          主な原因
        </h2>
        <ul className="mt-2 space-y-1.5">
          {accident.mainCauses.map((cause, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-amber-900">
              <span className="mt-0.5 shrink-0 text-amber-600">▶</span>
              {cause}
            </li>
          ))}
        </ul>
      </section>

      {/* 再発防止策 */}
      <section className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-sm">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-emerald-900">
          <ShieldCheck className="h-4 w-4" />
          再発防止策
        </h2>
        <ul className="mt-2 space-y-1.5">
          {accident.preventionPoints.map((point, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-emerald-900">
              <span className="mt-0.5 shrink-0 text-emerald-600">✓</span>
              {point}
            </li>
          ))}
        </ul>
      </section>

      {/* 固定アクションバー（PCはinline、モバイルはsticky） */}
      <section className="mt-5">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-bold text-slate-700">この事故から次のアクションへ</p>
          <p className="mt-1 text-[11px] text-slate-500">{related.rationale}</p>
          <AccidentActionBar accident={accident} variant="inline" />
        </div>
      </section>

      {/* 出典 */}
      {source && (
        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900">📚 出典</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="text-xs text-slate-600">出典: {source.site}</span>
            {source.url && (
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                出典元を開く
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </section>
      )}

      {/* 推奨保護具（コンテキスト連動） */}
      <ContextualPpePicks
        context={`${accident.title} ${accident.type} ${accident.workCategory}`}
        fallbackCategoryIds={related.categories.length > 0 ? related.categories.slice(0, 3) : ["head-protection", "fall-protection", "hand-foot"]}
        heading="🛡 この事故の再発防止に有効な保護具"
        description="事故タイプ・業種から推奨される保護具カテゴリを抽出しました。"
      />

      {/* 類似事例 */}
      {similar.length > 0 && (
        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900">🔁 類似する事故事例</h2>
          <ul className="mt-3 space-y-2">
            {similar.map((c) => (
              <li key={c.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-800">
                    {c.type}
                  </span>
                  <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-800">
                    {c.workCategory}
                  </span>
                  <span className="text-[10px] text-slate-500">{c.occurredOn}</span>
                </div>
                <Link
                  href={`/accidents/${c.id}`}
                  className="mt-1 block text-xs font-semibold text-slate-900 hover:text-emerald-700 hover:underline"
                >
                  {c.title}
                </Link>
                <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-slate-600">{c.summary}</p>
              </li>
            ))}
          </ul>
          <Link
            href="/accidents"
            className="mt-3 inline-block text-xs font-bold text-emerald-700 hover:underline"
          >
            事故DBに戻る →
          </Link>
        </section>
      )}

      {/* モバイル用sticky action bar */}
      <AccidentActionBar accident={accident} variant="sticky" />

      <footer className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-[11px] leading-5 text-slate-600">
        <p>
          ※ 本ページは厚生労働省・労働基準局の公開情報をもとに、ANZEN AI が一覧化した労働災害事例です。
          実務適用は本文（出典元）と所管省庁の最新公表内容を必ずご確認ください。
        </p>
      </footer>
    </main>
  );
}
