import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageJsonLd } from "@/components/page-json-ld";
import { SafetyImageLibraryClient } from "@/components/safety-image-library/safety-image-library-client";
import {
  getSafetyImageCategory,
  SAFETY_IMAGE_CATEGORIES,
  SAFETY_IMAGE_LIBRARY_PATH,
  SAFETY_IMAGE_THEMES,
  type SafetyImageCategory,
} from "@/data/safety-image-library";
import { withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";

type PageProps = { params: Promise<{ category: string }> };
export const dynamicParams = false;

export function generateStaticParams() {
  return SAFETY_IMAGE_CATEGORIES.map((category) => ({ category: category.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const category = getSafetyImageCategory((await params).category);
  if (!category) return {};
  const path = `${SAFETY_IMAGE_LIBRARY_PATH}/category/${category.id}`;
  const count = SAFETY_IMAGE_THEMES.filter((theme) => theme.category === category.id).length;
  const title = `${category.label}｜現場安全看板を無料編集`;
  const description = `${category.description} オリジナル${count}点を、文字編集・5言語・JPEG・PNG・PDF・市場サイズで利用できます。`;
  const first = SAFETY_IMAGE_THEMES.find((theme) => theme.category === category.id);
  return {
    title,
    description,
    alternates: { canonical: path },
    robots: { index: true, follow: true },
    openGraph: withSiteOpenGraph(path, {
      title,
      description,
      type: "website",
      images: first ? [{ url: first.previewPath, width: 720, height: first.orientation === "portrait" ? 1080 : 720, alt: `${first.title}の安全看板イラスト` }] : undefined,
    }),
    twitter: withSiteTwitter({ title, description, images: first ? [first.previewPath] : undefined }),
  };
}

export default async function SafetyImageCategoryPage({ params }: PageProps) {
  const category = getSafetyImageCategory((await params).category);
  if (!category) notFound();
  const themes = SAFETY_IMAGE_THEMES.filter((theme) => theme.category === category.id);
  const path = `${SAFETY_IMAGE_LIBRARY_PATH}/category/${category.id}`;
  return (
    <div className="pb-16">
      <PageJsonLd name={category.label} description={`${category.description} ${themes.length}点を公開しています。`} path={path} />
      <header className="border-b border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-sky-50 px-4 py-8 sm:px-6 dark:border-emerald-950 dark:from-slate-950 dark:to-emerald-950">
        <div className="mx-auto max-w-7xl">
          <Link href={SAFETY_IMAGE_LIBRARY_PATH} className="inline-flex min-h-11 items-center gap-1 text-sm font-black text-emerald-800 underline underline-offset-4 dark:text-emerald-300">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />現場安全看板ライブラリへ
          </Link>
          <p className="mt-3 text-sm font-black text-emerald-800 dark:text-emerald-300">{themes.length}点</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl dark:text-white">{category.label}</h1>
          <p className="mt-3 max-w-3xl text-base font-bold leading-7 text-slate-700 dark:text-slate-200">{category.description}</p>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
        <SafetyImageLibraryClient themes={SAFETY_IMAGE_THEMES} initialCategory={category.id as SafetyImageCategory} />
      </div>
    </div>
  );
}
