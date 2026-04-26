import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, Info, Tag, ChevronLeft, Check, ArrowRight } from "lucide-react";
import { ogImageUrl } from "@/lib/og-url";
import { JsonLd } from "@/components/json-ld";
import casesData from "@/data/cases.json";

type Case = (typeof casesData)[number];

function findCase(slug: string): Case | undefined {
  return casesData.find((c) => c.slug === slug);
}

export function generateStaticParams() {
  return casesData.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = findCase(slug);
  if (!c) return {};
  const title = `${c.company}｜${c.useCase}｜ペルソナ事例`;
  const description = c.headline;
  return {
    title,
    description,
    alternates: { canonical: `/cases/${slug}` },
    openGraph: {
      title: `${title}｜ANZEN AI`,
      description,
      images: [{ url: ogImageUrl(title, description), width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", images: [ogImageUrl(title, description)] },
  };
}

const PLAN_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Standard: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  Pro: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
  Business: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
};

function planColor(plan: string) {
  return PLAN_COLORS[plan] ?? { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" };
}

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = findCase(slug);
  if (!c) notFound();

  const pc = planColor(c.plan);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "Article",
          name: `${c.company}｜${c.useCase}`,
          description: c.headline,
          url: `https://safe-ai-site.vercel.app/cases/${c.slug}`,
          about: { "@type": "Organization", name: c.company, industry: c.industry },
        }}
      />

      {/* パンくず */}
      <nav className="mb-5 flex items-center gap-1.5 text-xs text-slate-500">
        <Link href="/cases" className="flex items-center gap-1 hover:text-emerald-600 transition-colors">
          <ChevronLeft className="h-3 w-3" />
          ユースケース一覧
        </Link>
        <span>/</span>
        <span className="text-slate-700">{c.company}</span>
      </nav>

      {/* ヘッダー */}
      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600 border border-slate-200">
            <Tag className="h-2.5 w-2.5" />
            ペルソナ事例（想定ユースケース）
          </span>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold border ${pc.bg} ${pc.text} ${pc.border}`}>
            {c.plan} プラン
          </span>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 shadow-sm">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{c.company}</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {c.industry}・{c.segment}・{c.size}名
              {"clientCount" in c ? `（顧問先${c.clientCount}社）` : ""}
            </p>
          </div>
        </div>

        <p className="mt-4 text-base font-semibold text-slate-800 leading-relaxed sm:text-lg">
          {c.headline}
        </p>
      </header>

      {/* 免責バナー */}
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <p className="text-xs leading-5 text-amber-900">
          本事例は想定ユースケースです。実際の導入事例ではありません。2026年4月リリースの新サービスのため、実導入事例は順次追加予定です。
        </p>
      </div>

      <div className="space-y-5">
        {/* 課題 */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-bold text-slate-900 flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-700 text-[10px] font-bold">課</span>
            課題・背景（想定）
          </h2>
          <p className="text-sm leading-6 text-slate-700">{c.challenge}</p>
        </section>

        {/* 解決策 */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-bold text-slate-900 flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">解</span>
            活用方法（想定）
          </h2>
          <p className="text-sm leading-6 text-slate-700">{c.solution}</p>
        </section>

        {/* 期待効果 */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-bold text-slate-900 flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">果</span>
            期待される効果（想定）
          </h2>
          <ul className="space-y-2">
            {c.results.map((r) => (
              <li key={r} className="flex items-start gap-2 text-sm text-slate-700">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                {r}
              </li>
            ))}
          </ul>
        </section>

        {/* プラン情報 */}
        <section className={`rounded-2xl border p-5 ${pc.border} ${pc.bg}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs font-bold ${pc.text}`}>{c.plan} プラン</p>
              <p className="mt-0.5 text-2xl font-bold text-slate-900">
                ¥{c.price.toLocaleString("ja-JP")}
                <span className="text-sm font-medium text-slate-500">/月（税抜）</span>
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-600">{c.planDescription}</p>
          <Link
            href="/pricing"
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline"
          >
            料金プランの詳細を見る <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>

        {/* タグ */}
        <div className="flex flex-wrap gap-2">
          {c.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 border border-slate-200"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>

      {/* CTA */}
      <section className="mt-8 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 text-center">
        <p className="text-sm font-semibold text-emerald-800">
          同様の課題をお持ちですか？
        </p>
        <p className="mt-1 text-xs text-slate-600">
          業種・規模・課題を教えていただければ、最適なプランと活用方法をご提案します。
        </p>
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
          >
            無料相談を申し込む
          </Link>
          <Link
            href="/cases"
            className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-emerald-600 transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            一覧に戻る
          </Link>
        </div>
      </section>
    </main>
  );
}
