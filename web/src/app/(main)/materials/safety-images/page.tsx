import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Images, Languages, PencilLine, ShieldCheck } from "lucide-react";
import { PageJsonLd } from "@/components/page-json-ld";
import { SafetyImageLibraryClient } from "@/components/safety-image-library/safety-image-library-client";
import { SafetySignCustomization } from "@/components/safety-image-library/safety-sign-customization";
import {
  SAFETY_IMAGE_CATEGORIES,
  SAFETY_IMAGE_LIBRARY_PATH,
  SAFETY_IMAGE_LIBRARY_RIGHTS_PATH,
  SAFETY_IMAGE_THEMES,
} from "@/data/safety-image-library";
import { withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";

const TITLE = "現場安全看板ライブラリ｜文字編集・多言語・無料ダウンロード";
const DESCRIPTION =
  "建設現場で実際に使われるテーマを調査して制作した安全看板100点。文字なし、推奨文字入り、自由編集を5言語・JPEG・PNG・PDF・市場サイズで利用できます。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: SAFETY_IMAGE_LIBRARY_PATH },
  robots: { index: true, follow: true },
  openGraph: withSiteOpenGraph(SAFETY_IMAGE_LIBRARY_PATH, {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    images: [{
      url: "/safety-images/library/previews/helmet-required.webp",
      width: 720,
      height: 1080,
      alt: "保護帽着用を表す安全AIポータル制作の安全看板イラスト",
    }],
  }),
  twitter: withSiteTwitter({
    title: TITLE,
    description: DESCRIPTION,
    images: ["/safety-images/library/previews/helmet-required.webp"],
  }),
};

const QUICK_CATEGORY_IDS = [
  "protective-equipment",
  "entry-prohibition",
  "hazard-warning",
  "traffic-guidance",
  "editable-numeric",
  "heat-emergency",
] as const;

export default function SafetyImageLibraryPage() {
  const featured = SAFETY_IMAGE_THEMES.filter((theme) => theme.recommended).slice(0, 3);
  return (
    <div className="pb-16">
      <PageJsonLd name="現場安全看板ライブラリ" description={DESCRIPTION} path={SAFETY_IMAGE_LIBRARY_PATH} />
      <header className="border-b border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-sky-50 px-4 py-9 sm:px-6 dark:border-emerald-950 dark:from-slate-950 dark:via-slate-950 dark:to-emerald-950">
        <div className="mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(28rem,1fr)]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-white px-3 py-1.5 text-xs font-black text-emerald-900 shadow-sm dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-200">
              <BadgeCheck className="h-4 w-4" aria-hidden="true" />市場調査・独立QA済み100点
            </p>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl dark:text-white">
              現場安全看板ライブラリ
            </h1>
            <p className="mt-3 max-w-2xl text-lg font-bold leading-8 text-slate-700 dark:text-slate-200">
              現場に合う看板を選び、文字と数値を変えてすぐ使えます。
            </p>
            <div className="mt-5 grid max-w-xl grid-cols-3 gap-2 text-center">
              <HeroStat value="100点" label="オリジナル" icon={<Images className="h-5 w-5" aria-hidden="true" />} />
              <HeroStat value="5言語" label="文字を切替" icon={<Languages className="h-5 w-5" aria-hidden="true" />} />
              <HeroStat value="編集" label="文字・数値" icon={<PencilLine className="h-5 w-5" aria-hidden="true" />} />
            </div>
          </div>
          <div className="grid grid-cols-3 items-end gap-3" aria-label="安全看板の例">
            {featured.map((theme, index) => (
              <Link key={theme.slug} href={theme.detailPath} className={`relative overflow-hidden rounded-2xl border-4 border-white bg-white shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 ${index === 1 ? "-translate-y-4" : ""}`}>
                <div className={theme.orientation === "square" ? "relative aspect-square" : theme.orientation === "portrait" ? "relative aspect-[4/5]" : "relative aspect-[3/2]"}>
                  <Image src={theme.previewPath} alt={`${theme.title}の安全看板イラスト`} fill priority sizes="(max-width: 1024px) 30vw, 14vw" className="object-contain" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
        <section aria-labelledby="quick-entry-heading">
          <h2 id="quick-entry-heading" className="text-2xl font-black text-slate-950 dark:text-white">よく使う看板から探す</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {QUICK_CATEGORY_IDS.map((id) => {
              const category = SAFETY_IMAGE_CATEGORIES.find((item) => item.id === id);
              if (!category) return null;
              const count = SAFETY_IMAGE_THEMES.filter((theme) => theme.category === id).length;
              return (
                <Link key={id} href={`${SAFETY_IMAGE_LIBRARY_PATH}/category/${id}`} className="min-h-20 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-emerald-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 dark:border-slate-800 dark:bg-slate-950">
                  <span className="text-xs font-black text-emerald-800 dark:text-emerald-300">{count}点</span>
                  <span className="mt-1 block font-black text-slate-950 dark:text-white">{category.shortLabel}</span>
                </Link>
              );
            })}
          </div>
        </section>

        <div id="library" className="mt-8 scroll-mt-24">
          <SafetyImageLibraryClient themes={SAFETY_IMAGE_THEMES} />
        </div>

        <section className="mt-10 grid gap-5 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-7 dark:border-emerald-900 dark:bg-emerald-950">
          <div>
            <p className="flex items-center gap-2 font-black text-emerald-950 dark:text-emerald-100">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />安全AIポータル作成／商用利用可／加工可
            </p>
            <p className="mt-2 text-sm font-bold leading-6 text-emerald-900 dark:text-emerald-200">
              現場掲示、施工計画書、作業手順書、報告書、教育資料へ利用できます。
            </p>
          </div>
          <Link href={SAFETY_IMAGE_LIBRARY_RIGHTS_PATH} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-emerald-800 bg-white px-4 text-sm font-black text-emerald-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 dark:bg-slate-950 dark:text-emerald-100">
            利用条件
          </Link>
        </section>

        <div className="mt-8"><SafetySignCustomization /></div>
      </div>
    </div>
  );
}

function HeroStat({ value, label, icon }: { value: string; label: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/80 bg-white/90 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-center gap-1 text-emerald-800 dark:text-emerald-300">{icon}<span className="text-lg font-black">{value}</span></div>
      <p className="mt-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">{label}</p>
    </div>
  );
}
