import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { PageJsonLd } from "@/components/page-json-ld";
import { SafetyImageLibraryClient } from "@/components/safety-image-library/safety-image-library-client";
import { SafetySignCustomization } from "@/components/safety-image-library/safety-sign-customization";
import { SafetyImageFirstRelease } from "@/components/safety-image-library/safety-image-first-release";
import {
  SAFETY_IMAGE_LIBRARY_PATH,
  SAFETY_IMAGE_LIBRARY_RIGHTS_PATH,
  SAFETY_IMAGE_LIBRARY_CARD_THEMES,
} from "@/data/safety-image-library";
import { withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";

const TITLE = "現場安全看板ライブラリ｜文字編集・多言語・無料ダウンロード";
const DESCRIPTION =
  "建設現場で実際に使われるテーマを調査して制作した安全看板100点。縦横を選び、日本語を先頭に最大5言語を1枚へ表示。JPEG・PNG・PDFで利用できます。";

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

export default function SafetyImageLibraryPage() {
  return (
    <div className="pb-16">
      <PageJsonLd name="現場安全看板ライブラリ" description={DESCRIPTION} path={SAFETY_IMAGE_LIBRARY_PATH} />
      <header className="border-b border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-sky-50 px-4 py-5 sm:px-6 dark:border-emerald-950 dark:from-slate-950 dark:via-slate-950 dark:to-emerald-950">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">
            現場安全看板ライブラリ
          </h1>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-700 sm:text-base dark:text-slate-200">
            100点から探して、文字・5言語・縦横を編集できます。
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
        <div id="library" className="scroll-mt-24">
          <SafetyImageLibraryClient themes={SAFETY_IMAGE_LIBRARY_CARD_THEMES} />
        </div>
        <div className="mt-10"><SafetyImageFirstRelease /></div>

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
