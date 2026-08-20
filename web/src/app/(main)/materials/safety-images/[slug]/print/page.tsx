import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getSafetyImageTheme,
  SAFETY_IMAGE_THEMES,
} from "@/data/safety-image-library";

type PageProps = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export const metadata: Metadata = {
  title: "安全画像 印刷用HTML",
  robots: { index: false, follow: true, nocache: true },
};

export function generateStaticParams() {
  return SAFETY_IMAGE_THEMES.map((theme) => ({ slug: theme.slug }));
}

export default async function SafetyImagePrintPage({ params }: PageProps) {
  const { slug } = await params;
  const theme = getSafetyImageTheme(slug);
  if (!theme) notFound();
  const pdfHref = `/api/safety-images/${theme.slug}/download?mode=default&lang=ja&brand=branded&paper=A4&orientation=${theme.orientation}&format=pdf`;
  return (
    <div className="mx-auto max-w-5xl bg-white p-4 text-slate-950 sm:p-8">
      <style>{`@page { size: A4 ${theme.orientation}; margin: 0; } @media print { .print-controls { display: none !important; } body { background: white !important; } .print-sheet { width: 100vw !important; height: 100vh !important; border: 0 !important; box-shadow: none !important; } }`}</style>
      <div className="print-controls mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div>
          <h1 className="font-black">{theme.title}・印刷用HTML</h1>
          <p className="mt-1 text-sm">ブラウザーの印刷機能を使用してください。</p>
        </div>
        <div className="flex gap-3">
          <Link href={theme.detailPath} className="rounded-lg border border-slate-400 bg-white px-4 py-3 font-black">詳細へ戻る</Link>
          <a href={pdfHref} className="rounded-lg bg-emerald-800 px-4 py-3 font-black text-white">PDFを開く</a>
        </div>
      </div>
      <article className={`print-sheet relative mx-auto overflow-hidden border border-slate-300 bg-[#eef7f7] shadow-lg ${theme.orientation === "portrait" ? "aspect-[1/1.414] max-h-[calc(100vh-2rem)]" : "aspect-[1.414/1] max-w-full"}`} aria-label={`${theme.title}の印刷用安全掲示`}>
        <Image src={theme.originalPath} alt={`${theme.title}の文字なし生成イラスト`} fill priority sizes="100vw" className="object-contain" />
        <div className={`absolute left-[5%] z-10 w-[90%] whitespace-pre-wrap break-words rounded-xl border-2 border-slate-900 bg-white/95 px-[3.5%] py-[3%] text-center text-[clamp(1.5rem,5vw,4.5rem)] font-black leading-tight text-sky-950 ${theme.orientation === "portrait" ? "top-[5%]" : "bottom-[16%]"}`}>
          {theme.texts.ja}
        </div>
        <div className="absolute bottom-[2%] right-[2%] z-20 flex items-center gap-2 rounded-xl border-2 border-emerald-700 bg-white/95 px-3 py-2 text-sm font-black">
          <Image src="/mascot/mascot-head-256.png" alt="安全AIポータルのチワワ" width={48} height={48} className="h-10 w-10 object-contain" />
          <span>© 安全AIポータル</span>
        </div>
      </article>
    </div>
  );
}
