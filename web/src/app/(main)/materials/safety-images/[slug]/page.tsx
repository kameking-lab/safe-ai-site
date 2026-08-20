import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, FileImage, Languages, ShieldCheck } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { PageJsonLd } from "@/components/page-json-ld";
import { SafetyImageEditor } from "@/components/safety-image-library/safety-image-editor";
import {
  getSafetyImageTheme,
  SAFETY_IMAGE_LIBRARY_PATH,
  SAFETY_IMAGE_LIBRARY_RIGHTS_PATH,
  SAFETY_IMAGE_THEMES,
} from "@/data/safety-image-library";
import { SITE_URL, withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";

type PageProps = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return SAFETY_IMAGE_THEMES.map((theme) => ({ slug: theme.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const theme = getSafetyImageTheme(slug);
  if (!theme) return {};
  const title = `${theme.title}｜無料安全イラスト・看板を文字編集`;
  const description = `${theme.title}の安全AIポータル新規制作イラスト。文字なし・推奨文字入り・自由編集を5言語、A4/A3縦横、JPEG/PDFでダウンロードできます。`;
  return {
    title,
    description,
    alternates: { canonical: theme.detailPath },
    robots: { index: true, follow: true },
    openGraph: withSiteOpenGraph(theme.detailPath, {
      title,
      description,
      type: "article",
      images: [
        {
          url: theme.previewPath,
          width: 720,
          height: theme.orientation === "portrait" ? 899 : 480,
          alt: `${theme.title}を表す文字なし安全イラスト`,
        },
      ],
    }),
    twitter: withSiteTwitter({ title, description, images: [theme.previewPath] }),
  };
}

export default async function SafetyImageDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const theme = getSafetyImageTheme(slug);
  if (!theme) notFound();
  const related = SAFETY_IMAGE_THEMES.filter(
    (candidate) => candidate.category === theme.category && candidate.slug !== theme.slug,
  ).slice(0, 4);
  const description = `${theme.title}の文字なし生成画像へ、文字・言語・数値・ブランドを後付けして利用できます。`;
  return (
    <div className="pb-16">
      <PageJsonLd
        name={theme.title}
        description={description}
        path={theme.detailPath}
        breadcrumbs={[
          { name: "ホーム", url: SITE_URL },
          { name: "安全掲示・イラスト倉庫", url: `${SITE_URL}${SAFETY_IMAGE_LIBRARY_PATH}` },
          { name: theme.title, url: `${SITE_URL}${theme.detailPath}` },
        ]}
      />
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "ImageObject",
          name: theme.title,
          caption: description,
          description,
          contentUrl: `${SITE_URL}${theme.originalPath}`,
          thumbnailUrl: `${SITE_URL}${theme.previewPath}`,
          acquireLicensePage: `${SITE_URL}${SAFETY_IMAGE_LIBRARY_RIGHTS_PATH}`,
          creditText: "安全AIポータル作成",
          copyrightNotice: "© 安全AIポータル",
          creator: { "@type": "Organization", name: "安全AIポータル", url: SITE_URL },
          inLanguage: ["ja", "en", "vi", "zh-CN", "id"],
          representativeOfPage: true,
        }}
      />
      <header className="border-b border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-sky-50 px-4 pb-8 pt-3 sm:px-6 dark:border-emerald-950 dark:from-slate-950 dark:to-emerald-950">
        <div className="mx-auto max-w-7xl">
          <Link href={SAFETY_IMAGE_LIBRARY_PATH} className="inline-flex min-h-11 items-center gap-1 text-sm font-black text-emerald-800 underline underline-offset-4 dark:text-emerald-300">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />安全画像倉庫へ
          </Link>
          <div className="mt-3 grid items-center gap-7 lg:grid-cols-[minmax(18rem,.74fr)_minmax(25rem,1.26fr)]">
            <div className={`relative mx-auto w-full max-w-lg overflow-hidden rounded-3xl border-4 border-white bg-[#eef7f7] shadow-xl ${theme.orientation === "portrait" ? "aspect-[4/5]" : "aspect-[3/2]"}`}>
              <Image src={theme.previewPath} alt={`${theme.title}を表す、文字やロゴを含まない安全教育用イラスト`} fill priority sizes="(max-width: 1024px) 92vw, 35vw" className="object-contain" />
            </div>
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-950 dark:bg-emerald-900 dark:text-emerald-100">
                <BadgeCheck className="h-4 w-4" aria-hidden="true" />生成画像・人体/PPE QA合格
              </p>
              <p className="mt-4 text-sm font-black text-emerald-800 dark:text-emerald-300">{theme.categoryLabel}</p>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl dark:text-white">{theme.title}</h1>
              <p className="mt-3 max-w-2xl text-base font-bold leading-7 text-slate-700 dark:text-slate-200">
                文字なし生成画像へ、読みやすい文字を後付け。内容を自由に変えられます。
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs font-black text-slate-700 dark:text-slate-200">
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1.5 dark:border-slate-700 dark:bg-slate-900"><Languages className="h-4 w-4" aria-hidden="true" />5言語</span>
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1.5 dark:border-slate-700 dark:bg-slate-900"><FileImage className="h-4 w-4" aria-hidden="true" />A4/A3・縦横</span>
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1.5 dark:border-slate-700 dark:bg-slate-900">JPEG/PDF{theme.pngAvailable ? "/PNG" : ""}</span>
              </div>
              <p className="mt-5 flex items-start gap-2 text-sm font-black leading-6 text-slate-700 dark:text-slate-200">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />安全AIポータル作成／商用利用可／加工可
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
        <SafetyImageEditor theme={theme} />
        <section className="mt-6 rounded-2xl border border-slate-300 bg-white p-5 dark:border-slate-700 dark:bg-slate-950">
          <h2 className="font-black text-slate-950 dark:text-white">JavaScriptなしで利用する</h2>
          <p className="mt-2 text-sm font-bold text-slate-600 dark:text-slate-300">文字なし画像と、既定の日本語を入れた印刷用PDF・印刷用HTMLは通常リンクで開けます。</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <a href={theme.originalPath} download={`${theme.slug}-clean-master.png`} className="font-black text-emerald-800 underline dark:text-emerald-300">文字なし画像</a>
            <a href={`/api/safety-images/${theme.slug}/download?mode=default&lang=ja&brand=branded&paper=A4&orientation=${theme.orientation}&format=pdf`} className="font-black text-emerald-800 underline dark:text-emerald-300">A4印刷用PDF</a>
            <a href={`${theme.detailPath}/print`} className="font-black text-emerald-800 underline dark:text-emerald-300">印刷用HTML</a>
          </div>
        </section>

        <section className="mt-12" aria-labelledby="related-heading">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-black text-emerald-800 dark:text-emerald-300">同じカテゴリ</p>
              <h2 id="related-heading" className="mt-1 text-2xl font-black text-slate-950 dark:text-white">関連画像</h2>
            </div>
            <Link href={`${SAFETY_IMAGE_LIBRARY_PATH}/category/${theme.category}`} className="text-sm font-black text-emerald-800 underline underline-offset-4 dark:text-emerald-300">カテゴリをすべて見る</Link>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((candidate) => (
              <Link key={candidate.slug} href={candidate.detailPath} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:border-emerald-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 dark:border-slate-800 dark:bg-slate-950">
                <div className={`relative bg-slate-100 ${candidate.orientation === "portrait" ? "aspect-[4/5]" : "aspect-[3/2]"}`}>
                  <Image src={candidate.previewPath} alt={`${candidate.title}の安全イラスト`} fill sizes="(max-width: 640px) 92vw, 24vw" className="object-contain" />
                </div>
                <p className="p-3 font-black text-slate-950 dark:text-white">{candidate.title}</p>
              </Link>
            ))}
          </div>
        </section>

        <p className="mt-9 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold leading-7 text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
          利用前に各現場の安全判断と必要な法定表示をご確認ください。素材そのものの再販売・素材集としての再配布は
          <Link href={SAFETY_IMAGE_LIBRARY_RIGHTS_PATH} className="mx-1 font-black text-emerald-800 underline underline-offset-4 dark:text-emerald-300">利用条件</Link>
          に従ってください。
        </p>
      </div>
    </div>
  );
}
