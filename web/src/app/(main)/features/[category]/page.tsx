import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  FEATURE_CATEGORIES,
  getCategoryById,
  getFeaturesByCategory,
  categoryColorClasses,
  type FeatureCategoryId,
} from "@/data/features-catalog";

export function generateStaticParams() {
  return FEATURE_CATEGORIES.map((c) => ({ category: c.id }));
}

type Params = { category: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { category } = await params;
  const cat = getCategoryById(category);
  if (!cat) return { title: "機能カテゴリ | ANZEN AI" };
  return {
    title: `${cat.title} | 機能紹介 | ANZEN AI`,
    description: cat.description,
    openGraph: {
      title: `${cat.title} | 機能紹介 | ANZEN AI`,
      description: cat.description,
    },
  };
}

export default async function CategoryDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { category } = await params;
  const cat = getCategoryById(category);
  if (!cat) notFound();

  const features = getFeaturesByCategory(cat.id as FeatureCategoryId);
  const colors = categoryColorClasses(cat.accent);

  return (
    <div className="px-4 py-6 sm:py-10">
      {/* パンくず */}
      <nav aria-label="パンくず" className="mx-auto max-w-5xl text-xs text-slate-500">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/features" className="hover:text-slate-800 hover:underline">
              機能紹介
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li className="font-semibold text-slate-700">{cat.title}</li>
        </ol>
      </nav>

      {/* Hero */}
      <header className={`mx-auto mt-4 max-w-5xl rounded-2xl border ${colors.border} ${colors.bg} p-6 sm:p-8`}>
        <p className={`text-xs font-bold tracking-widest ${colors.text}`}>CATEGORY</p>
        <h1 className="mt-1 text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">
          {cat.title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-700 sm:text-base">
          {cat.description}
        </p>
        <p className="mt-3 text-sm font-semibold text-slate-700">
          このカテゴリには <span className={colors.text}>{features.length}機能</span> あります。
        </p>
      </header>

      {/* スクショギャラリー */}
      <section className="mx-auto mt-8 max-w-6xl">
        <h2 className="mb-3 text-lg font-bold text-slate-900 sm:text-xl">スクリーンショット</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.slug} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="relative aspect-[16/10] w-full bg-slate-100">
                <Image
                  src={`/screenshots/${f.slug}-desktop.svg`}
                  alt={`${f.title}のスクリーンショット`}
                  width={640}
                  height={400}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              </div>
              <div className="p-3 text-sm">
                <p className="font-bold text-slate-900">{f.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">{f.summary}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 機能詳細 */}
      <section className="mx-auto mt-10 max-w-5xl">
        <h2 className="mb-3 text-lg font-bold text-slate-900 sm:text-xl">機能の詳細</h2>
        <div className="space-y-4">
          {features.map((f) => (
            <article
              key={f.slug}
              className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-start sm:p-5"
            >
              <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:w-56">
                <Image
                  src={`/screenshots/${f.slug}-mobile.svg`}
                  alt={`${f.title}のモバイル表示`}
                  width={300}
                  height={188}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900 sm:text-lg">{f.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-700">{f.description}</p>
                {f.tags && f.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {f.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={f.href}
                    className={`inline-flex items-center rounded-lg bg-gradient-to-r ${colors.gradient} px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90`}
                  >
                    機能を試す →
                  </Link>
                  <Link
                    href={`/features#${f.slug}`}
                    className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    一覧に戻る
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className={`mx-auto mt-12 max-w-5xl rounded-2xl border ${colors.border} ${colors.bg} p-6 text-center sm:p-8`}>
        <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
          {cat.title}のご意見・改善提案を募集中
        </h2>
        <p className="mt-2 text-sm text-slate-700">
          現場で「もう一歩」と感じる点があれば、ぜひお寄せください。安全コンサルタントが直接対応します。
        </p>
        <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row">
          <Link
            href="/contact"
            className={`inline-flex items-center rounded-lg bg-gradient-to-r ${colors.gradient} px-5 py-2.5 text-sm font-bold text-white shadow hover:opacity-90`}
          >
            ご意見・改善提案を送る →
          </Link>
          <Link
            href="/features"
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            他のカテゴリを見る
          </Link>
        </div>
      </section>

      {/* 他カテゴリへ */}
      <section className="mx-auto mt-8 max-w-5xl">
        <h2 className="mb-3 text-sm font-bold text-slate-700">他のカテゴリ</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {FEATURE_CATEGORIES.filter((c) => c.id !== cat.id).map((c) => {
            const oc = categoryColorClasses(c.accent);
            return (
              <Link
                key={c.id}
                href={`/features/${c.id}`}
                className={`rounded-lg border ${oc.border} ${oc.bg} p-3 text-sm font-semibold ${oc.text} hover:opacity-90`}
              >
                {c.title}
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
