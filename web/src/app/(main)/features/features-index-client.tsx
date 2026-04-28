"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import {
  FEATURES,
  FEATURE_CATEGORIES,
  categoryColorClasses,
  type FeatureCategoryId,
} from "@/data/features-catalog";
import casesData from "@/data/cases.json";

type CaseEntry = {
  slug: string;
  company: string;
  industry: string;
  useCase: string;
  headline: string;
  results?: string[];
  tags?: string[];
};

const QUICK_LINKS = [
  { href: "/features/quick-tour", label: "5分ツアー", emoji: "⏱" },
  { href: "/features/use-cases", label: "業種別の使い方", emoji: "🏗" },
  { href: "/features/comparison", label: "従来比較", emoji: "⚖" },
  { href: "/features/print", label: "印刷用一覧", emoji: "🖨" },
];

export function FeaturesIndexClient() {
  const [activeCategory, setActiveCategory] = useState<FeatureCategoryId | "all">("all");

  const filteredFeatures = useMemo(() => {
    if (activeCategory === "all") return FEATURES;
    return FEATURES.filter((f) => f.category === activeCategory);
  }, [activeCategory]);

  const latestCases: CaseEntry[] = useMemo(() => {
    return (casesData as CaseEntry[]).slice(0, 3);
  }, []);

  return (
    <div className="px-4 py-6 sm:py-10">
      {/* Hero */}
      <section className="mx-auto max-w-5xl text-center">
        <p className="text-xs font-bold tracking-widest text-emerald-700">FEATURES</p>
        <h1 className="mt-2 text-2xl font-bold leading-tight text-slate-900 sm:text-3xl md:text-4xl">
          ANZEN AIの全機能を、1ページで。
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          労働安全衛生法対応・現場運用ツール・AIアシスタント・教育コンテンツを{FEATURES.length}機能で提供しています。
          スクリーンショットと一緒に、用途やカテゴリから探せます。
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50"
            >
              <span aria-hidden>{link.emoji}</span>
              {link.label}
            </Link>
          ))}
        </div>
      </section>

      {/* Category filter */}
      <section className="mx-auto mt-8 max-w-6xl">
        <div className="overflow-x-auto">
          <div className="flex gap-2 pb-2">
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeCategory === "all"
                  ? "bg-slate-900 text-white shadow"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              すべて（{FEATURES.length}）
            </button>
            {FEATURE_CATEGORIES.map((cat) => {
              const count = FEATURES.filter((f) => f.category === cat.id).length;
              const colors = categoryColorClasses(cat.accent);
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? `bg-gradient-to-r ${colors.gradient} text-white shadow`
                      : `border ${colors.border} ${colors.bg} ${colors.text} hover:opacity-90`
                  }`}
                >
                  {cat.title}（{count}）
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="mx-auto mt-6 max-w-6xl">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredFeatures.map((feature) => {
            const cat = FEATURE_CATEGORIES.find((c) => c.id === feature.category);
            const colors = categoryColorClasses(cat?.accent || "emerald");
            return (
              <article
                key={feature.slug}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                  <Image
                    src={`/screenshots/${feature.slug}-desktop.svg`}
                    alt={`${feature.title}のスクリーンショット`}
                    width={640}
                    height={400}
                    className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                    unoptimized
                  />
                  <span
                    className={`absolute left-3 top-3 rounded-full ${colors.bg} ${colors.text} ${colors.border} border px-2.5 py-0.5 text-[11px] font-bold`}
                  >
                    {cat?.title}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <h2 className="text-base font-bold leading-snug text-slate-900">
                    {feature.title}
                  </h2>
                  <p className="line-clamp-2 text-sm leading-relaxed text-slate-600">
                    {feature.summary}
                  </p>
                  {feature.tags && feature.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {feature.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                    <Link
                      href={feature.href}
                      className={`inline-flex flex-1 items-center justify-center rounded-lg bg-gradient-to-r ${colors.gradient} px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90`}
                    >
                      機能を試す →
                    </Link>
                    <Link
                      href={`/features/${feature.category}`}
                      className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      詳しく見る
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* 利用者の声（最新3件） */}
      {latestCases.length > 0 && (
        <section className="mx-auto mt-12 max-w-6xl">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-xs font-bold tracking-widest text-emerald-700">USER VOICES</p>
              <h2 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">利用者の声・導入事例</h2>
            </div>
            <Link
              href="/cases"
              className="text-sm font-semibold text-emerald-700 hover:underline"
            >
              すべて見る →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {latestCases.map((c) => (
              <Link
                key={c.slug}
                href={`/cases/${c.slug}`}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <p className="text-[11px] font-bold tracking-widest text-emerald-700">
                  {c.industry}
                </p>
                <p className="mt-1 text-sm font-bold text-slate-900">{c.company}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  「{c.headline}」
                </p>
                {c.results && c.results.length > 0 && (
                  <ul className="mt-3 space-y-1 border-t border-slate-100 pt-2 text-[11px] text-slate-600">
                    {c.results.slice(0, 2).map((r) => (
                      <li key={r} className="flex items-start gap-1">
                        <span aria-hidden className="text-emerald-600">✓</span>
                        <span className="line-clamp-2">{r}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                  <span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                    {c.useCase}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-700">詳しく →</span>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-xs text-emerald-900">
              ご利用中の方へ：改善提案・追加機能の要望は随時受付中です。
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
            >
              ご意見を送る →
            </Link>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="mx-auto mt-12 max-w-5xl rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 text-center sm:p-8">
        <h2 className="text-xl font-bold text-emerald-900 sm:text-2xl">
          試したい機能はありますか？
        </h2>
        <p className="mt-2 text-sm text-emerald-800">
          ご意見・改善提案・追加機能の要望は、安全コンサルタントが直接対応します。
        </p>
        <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row">
          <Link
            href="/contact"
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-emerald-700"
          >
            ご意見・改善提案を送る →
          </Link>
          <Link
            href="/features/quick-tour"
            className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-5 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-50"
          >
            5分ツアーを見る
          </Link>
        </div>
      </section>
    </div>
  );
}
