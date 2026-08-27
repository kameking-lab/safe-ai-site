import type { Metadata } from "next";
import Link from "next/link";
import {
  SAFETY_IMAGE_LIBRARY_PATH,
  SAFETY_IMAGE_LIBRARY_RIGHTS_PATH,
} from "@/data/safety-image-library";

export const metadata: Metadata = {
  title: "安全看板を準備中｜安全AIポータル",
  description: "安全AIポータルの安全看板ライブラリは、現在公開準備中です。",
  alternates: { canonical: SAFETY_IMAGE_LIBRARY_PATH },
  robots: { index: false, follow: true },
};

export default function SafetyImageLibraryPreparationPage() {
  return (
    <div className="mx-auto flex min-h-[48vh] max-w-3xl flex-col items-start justify-center px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-5xl dark:text-white">
        安全看板を準備中
      </h1>
      <Link
        href={SAFETY_IMAGE_LIBRARY_RIGHTS_PATH}
        className="mt-6 inline-flex min-h-11 items-center font-black text-emerald-800 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 dark:text-emerald-300"
      >
        利用条件
      </Link>
    </div>
  );
}
