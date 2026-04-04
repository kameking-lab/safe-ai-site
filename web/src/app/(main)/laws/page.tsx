import type { Metadata } from "next";
import { Suspense } from "react";
import { LawsPageClient } from "@/components/laws-page-client";

export const metadata: Metadata = {
  title: "法改正一覧",
  description: "労働安全衛生法の改正情報をAI要約付きで確認。質問チャットも利用可能。",
};

export default function LawsPage() {
  return (
    <Suspense fallback={<p className="px-4 py-6 text-sm text-slate-600">読み込み中…</p>}>
      <LawsPageClient />
    </Suspense>
  );
}
