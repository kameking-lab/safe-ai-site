import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Images, Languages, PencilLine, ShieldCheck } from "lucide-react";
import { PageJsonLd } from "@/components/page-json-ld";
import { SafetyImageLibraryClient } from "@/components/safety-image-library/safety-image-library-client";
import {
  SAFETY_IMAGE_CATEGORIES,
  SAFETY_IMAGE_LIBRARY_PATH,
  SAFETY_IMAGE_THEMES,
} from "@/data/safety-image-library";
import { withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";

const TITLE = "安全掲示・イラスト倉庫｜無料で編集・JPEG/PDFダウンロード";
const DESCRIPTION =
  "安全AIポータルが新規制作した安全看板・施工計画イラスト100点。文字なし、推奨文字入り、自由編集を5言語・A4/A3・JPEG/PDFで利用できます。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: SAFETY_IMAGE_LIBRARY_PATH },
  robots: { index: true, follow: true },
  openGraph: withSiteOpenGraph(SAFETY_IMAGE_LIBRARY_PATH, {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    images: [
      {
        url: "/safety-images/library/previews/helmet-required.webp",
        width: 720,
        height: 899,
        alt: "保護帽を正しく着用した作業員の安全教育イラスト",
      },
    ],
  }),
  twitter: withSiteTwitter({
    title: TITLE,
    description: DESCRIPTION,
    images: ["/safety-images/library/previews/helmet-required.webp"],
  }),
};

export default function SafetyImageLibraryPage() {
  const featured = SAFETY_IMAGE_THEMES.filter((theme) => theme.recommended).slice(0, 3);
  return (
    <div className="pb-16">
      <PageJsonLd name="安全掲示・イラスト倉庫" description={DESCRIPTION} path={SAFETY_IMAGE_LIBRARY_PATH} />
      <section className="overflow-hidden border-b border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-sky-50 px-4 py-9 sm:px-6 sm:py-12 dark:border-emerald-950 dark:from-slate-950 dark:via-slate-950 dark:to-emerald-950">
        <div className="mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(28rem,.9fr)]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-white px-3 py-1.5 text-xs font-black text-emerald-900 shadow-sm dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-200">
              <BadgeCheck className="h-4 w-4" aria-hidden="true" />安全AIポータル新規制作・公開中100点
            </p>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl dark:text-white">
              安全掲示・イラスト倉庫
            </h1>
            <p className="mt-3 max-w-2xl text-lg font-bold leading-8 text-slate-700 dark:text-slate-200">
              見つけて、文字を変えて、すぐ現場で使えます。
            </p>
            <div className="mt-6 grid max-w-xl grid-cols-3 gap-3 text-center">
              <HeroStat value="100点" label="生成画像" icon={<Images className="h-5 w-5" aria-hidden="true" />} />
              <HeroStat value="5言語" label="文字を切替" icon={<Languages className="h-5 w-5" aria-hidden="true" />} />
              <HeroStat value="自由編集" label="文字・色・数値" icon={<PencilLine className="h-5 w-5" aria-hidden="true" />} />
            </div>
            <a href="#library-results-heading" className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-6 font-black text-white shadow-sm hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300">
              画像から選ぶ <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </a>
          </div>
          <div className="grid grid-cols-3 items-end gap-3" aria-label="安全画像の例">
            {featured.map((theme, index) => (
              <Link key={theme.slug} href={theme.detailPath} className={`relative overflow-hidden rounded-2xl border-4 border-white bg-white shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 ${index === 1 ? "-translate-y-4" : ""}`}>
                <div className="relative aspect-[4/5]">
                  <Image src={theme.previewPath} alt={`${theme.title}の安全イラスト`} fill priority sizes="(max-width: 1024px) 30vw, 13vw" className="object-cover" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
        <section aria-labelledby="category-heading">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-black text-emerald-800 dark:text-emerald-300">用途別にすぐ探す</p>
              <h2 id="category-heading" className="mt-1 text-2xl font-black text-slate-950 dark:text-white">5つのカテゴリ</h2>
            </div>
            <Link href={`${SAFETY_IMAGE_LIBRARY_PATH}/pilot/helmet-required`} className="text-sm font-black text-slate-600 underline underline-offset-4 dark:text-slate-300">
              文字の作り方A/B比較を見る
            </Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {SAFETY_IMAGE_CATEGORIES.map((category) => {
              const count = SAFETY_IMAGE_THEMES.filter((theme) => theme.category === category.id).length;
              return (
                <Link key={category.id} href={`${SAFETY_IMAGE_LIBRARY_PATH}/category/${category.id}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-emerald-500 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 dark:border-slate-800 dark:bg-slate-950">
                  <p className="text-2xl font-black text-emerald-800 dark:text-emerald-300">{count}点</p>
                  <h3 className="mt-1 font-black text-slate-950 dark:text-white">{category.shortLabel}</h3>
                </Link>
              );
            })}
          </div>
        </section>

        <div className="mt-8">
          <SafetyImageLibraryClient themes={SAFETY_IMAGE_THEMES} />
        </div>

        <section className="mt-12 grid gap-5 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-7 dark:border-emerald-900 dark:bg-emerald-950">
          <div>
            <p className="flex items-center gap-2 font-black text-emerald-950 dark:text-emerald-100">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />安全AIポータル作成／商用利用可／加工可
            </p>
            <p className="mt-2 text-sm font-bold leading-6 text-emerald-900 dark:text-emerald-200">
              クリーンマスターと文字・チワワ・©のレイヤーを分離して管理しています。
            </p>
          </div>
          <Link href={`${SAFETY_IMAGE_LIBRARY_PATH}/terms`} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-emerald-800 bg-white px-4 text-sm font-black text-emerald-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 dark:bg-slate-950 dark:text-emerald-100">
            利用条件を確認
          </Link>
        </section>
      </div>
    </div>
  );
}

function HeroStat({ value, label, icon }: { value: string; label: string; icon: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/80 bg-white/90 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-center gap-1 text-emerald-800 dark:text-emerald-300">{icon}<span className="text-lg font-black">{value}</span></div>
      <p className="mt-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">{label}</p>
    </div>
  );
}
