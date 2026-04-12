import type { Metadata } from "next";
import { Suspense } from "react";
import { LawsPageClient } from "@/components/laws-page-client";

export const metadata: Metadata = {
  title: "法改正一覧",
  description: "労働安全衛生法・化学物質管理など100件以上の法改正をAI要約付きで確認。最新の法令改正を見逃さずキャッチアップ。",
  openGraph: {
    title: "法改正一覧｜ANZEN AI",
    description: "労働安全衛生法・化学物質管理など100件以上の法改正をAI要約付きで確認。最新の法令改正を見逃さずキャッチアップ。",
  },
};

export default function LawsPage() {
  return (
    <Suspense fallback={<p className="px-4 py-6 text-sm text-slate-600">読み込み中…</p>}>
      <LawsPageClient />
    </Suspense>
  );
}
