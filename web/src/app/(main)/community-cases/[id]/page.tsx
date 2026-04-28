import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { COMMUNITY_CASES_SEED } from "@/data/mock/community-cases";
import { UGC_CATEGORY_LABELS, UGC_INDUSTRY_OPTIONS } from "@/lib/ugc-types";
import { ShareButtons } from "./ShareButtons";
import { ClientFallback } from "./ClientFallback";

type RouteParams = { id: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { id } = await params;
  const found = COMMUNITY_CASES_SEED.find((c) => c.id === id);
  if (!found) {
    return {
      title: "現場の声｜ANZEN AI",
      robots: { index: false, follow: false },
    };
  }
  return {
    title: `${found.title}｜現場の声｜ANZEN AI`,
    description: found.body.slice(0, 120),
    alternates: { canonical: `/community-cases/${found.id}` },
  };
}

export default async function CommunityCaseDetailPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { id } = await params;
  const seed = COMMUNITY_CASES_SEED.find((c) => c.id === id);

  // サーバーシードに無い場合（クライアント投稿）はクライアントフォールバックに委譲
  if (!seed) {
    return <ClientFallback id={id} />;
  }

  if (seed.status === "rejected") {
    notFound();
  }

  const industryLabel =
    UGC_INDUSTRY_OPTIONS.find((i) => i.value === seed.industry)?.label ?? seed.industry;

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <Link
        href="/community-cases"
        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-emerald-600"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> 一覧に戻る
      </Link>

      <article className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">
            #{UGC_CATEGORY_LABELS[seed.category]}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-600">
            {industryLabel}
          </span>
          <span className="text-slate-400">{seed.authorAlias}</span>
          <time className="text-slate-400">
            {new Date(seed.createdAt).toLocaleDateString("ja-JP")}
          </time>
        </div>

        <h1 className="mt-4 text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">
          {seed.title}
        </h1>

        <div className="mt-6 whitespace-pre-wrap text-sm leading-7 text-slate-700">
          {seed.body}
        </div>

        {seed.supervisorComment && (
          <aside className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/60 p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              <p className="text-xs font-bold text-emerald-800">
                労働安全コンサルタントの監修コメント
              </p>
            </div>
            <p className="mt-2 text-sm leading-6 text-emerald-900">{seed.supervisorComment}</p>
          </aside>
        )}

        {seed.relatedNotices && seed.relatedNotices.length > 0 && (
          <section className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-bold text-slate-700">関連する法令・通達</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {seed.relatedNotices.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
            <Link
              href="/laws"
              className="mt-3 inline-block text-xs font-semibold text-emerald-700 hover:underline"
            >
              法改正・通達の検索 →
            </Link>
          </section>
        )}

        <div className="mt-8 border-t border-slate-200 pt-5">
          <ShareButtons title={seed.title} id={seed.id} />
        </div>
      </article>
    </main>
  );
}
