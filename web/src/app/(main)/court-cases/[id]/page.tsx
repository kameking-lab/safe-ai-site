import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Scale, ArrowLeft, ExternalLink, ClipboardList, Database, MessageSquare } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { PageJsonLd } from "@/components/page-json-ld";
import { COURT_CASES, getCourtCaseById } from "@/data/court-cases";

export function generateStaticParams() {
  return COURT_CASES.map((c) => ({ id: c.id }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const c = getCourtCaseById(id);
  if (!c) return { title: "労災裁判例｜安全AIポータル" };
  const title = `${c.name}（${c.court} ${c.dateLabelJa}）｜労災裁判例コーナー`;
  const description = `${c.oneLine} ${c.summary}`.slice(0, 120);
  return {
    title,
    description,
    alternates: { canonical: `/court-cases/${c.id}` },
    openGraph: { title, description },
  };
}

const issueColor: Record<string, string> = {
  安全配慮義務: "bg-emerald-100 text-emerald-800 border-emerald-200",
  過失相殺: "bg-amber-100 text-amber-800 border-amber-200",
  "元請・下請責任": "bg-sky-100 text-sky-800 border-sky-200",
  "国・行政責任": "bg-violet-100 text-violet-800 border-violet-200",
  労働者性: "bg-rose-100 text-rose-800 border-rose-200",
};

export default async function CourtCaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = getCourtCaseById(id);
  if (!c) notFound();

  return (
    <>
      <PageJsonLd name={`${c.name}（労災裁判例）`} description={c.oneLine} path={`/court-cases/${c.id}`} />
      <PageContainer>
        <div className="mx-auto max-w-3xl">
          <Link href="/court-cases" className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-300 print:hidden">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> 労災裁判例コーナーに戻る
          </Link>

          <header className="mt-3 border-b-2 border-slate-800 pb-3 dark:border-slate-300">
            <div className="flex flex-wrap items-center gap-2">
              {c.issues.map((i) => (
                <span key={i} className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${issueColor[i] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}>{i}</span>
              ))}
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{c.field}</span>
            </div>
            <h1 className="mt-2 flex items-start gap-2 text-xl font-bold text-slate-900 dark:text-slate-100 lg:text-2xl">
              <Scale className="mt-1 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
              {c.name}
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {c.court}　{c.dateLabelJa}（{c.date.replace(/-/g, "/")}）{c.citation ? `　${c.citation}` : ""}
            </p>
            <p className="mt-2 text-sm font-medium text-emerald-900 dark:text-emerald-200">{c.oneLine}</p>
          </header>

          <section className="mt-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">事案の概要</h2>
            <p className="mt-1 text-[15px] leading-relaxed text-slate-800 dark:text-slate-200">{c.summary}</p>
          </section>

          <section className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/5">
            <h2 className="text-sm font-bold text-emerald-800 dark:text-emerald-300">裁判所の判断（要旨）</h2>
            <p className="mt-1 text-[15px] leading-relaxed text-slate-800 dark:text-slate-100">{c.holding}</p>
          </section>

          <section className="mt-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">実務上のポイント（一般原則）</h2>
            <ul className="mt-1 space-y-1.5">
              {c.practicePoints.map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-[15px] leading-relaxed text-slate-800 dark:text-slate-200">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
                  {p}
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-5">
            <h2 className="flex items-center gap-1 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> 出典
            </h2>
            <ul className="mt-1 space-y-1">
              {c.sources.map((s, i) => (
                <li key={i} className="text-sm text-slate-700 dark:text-slate-300">
                  {s.url ? (
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-900 dark:text-emerald-300">
                      {s.label}
                    </a>
                  ) : (
                    <span>{s.label}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-[12px] leading-relaxed text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
            ※ 上記の要旨は、裁判所「裁判例検索」・公的機関の解説等をもとにした<strong className="font-semibold">当サイトによる要約</strong>です。
            正確な内容は出典の判決原文をご確認ください。本ページは一般的な情報提供であり、個別の事案への法的助言ではありません。
            具体的な対応は弁護士・社会保険労務士・労働安全/衛生コンサルタント等の専門家にご相談ください。
          </p>

          {/* 現場の実務へ */}
          <section className="mt-6 print:hidden">
            <h2 className="mb-2 text-sm font-bold text-slate-700 dark:text-slate-200">現場の実務につなげる</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <Link href="/ky/paper" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-sm hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900">
                <ClipboardList className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" /> <span className="font-semibold">KY用紙で危険予知</span>
              </Link>
              <Link href="/accident-news" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-sm hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900">
                <Database className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" /> <span className="font-semibold">重大災害事例を見る</span>
              </Link>
              <Link href="/chatbot" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-sm hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900">
                <MessageSquare className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" /> <span className="font-semibold">安衛法を質問する</span>
              </Link>
            </div>
          </section>
        </div>
      </PageContainer>
    </>
  );
}
