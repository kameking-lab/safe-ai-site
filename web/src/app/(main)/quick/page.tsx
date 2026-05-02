import type { Metadata } from "next";
import { QuickLauncher } from "@/components/QuickLauncher";

import { PageJsonLd } from "@/components/page-json-ld";
export const metadata: Metadata = {
  title: "クイックアクセス｜ANZEN AI",
  description:
    "現場職長の朝礼3分に特化。KY用紙・事故事例検索・AIチャット・気象警報をワンタップで起動。",
};

export default function QuickPage() {
  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-slate-50 dark:bg-slate-900">
      {/* SEO: WebPage + BreadcrumbList */}
      <PageJsonLd name="クイックアクセス" description="現場職長の朝礼3分に特化。KY用紙・事故事例検索・AIチャット・気象警報をワンタップで起動。" path="/quick" />
      <div className="mx-auto max-w-7xl px-4 pt-6 pb-10">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
            朝礼クイックアクセス
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            今日の現場に必要なものを、3分で確認
          </p>
        </header>
        <QuickLauncher />
      </div>
    </div>
  );
}
