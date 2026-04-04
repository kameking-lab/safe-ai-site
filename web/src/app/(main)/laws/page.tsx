import { Suspense } from "react";
import { LawsPageClient } from "@/components/laws-page-client";

export default function LawsPage() {
  return (
    <Suspense fallback={<p className="px-4 py-6 text-sm text-slate-600">読み込み中…</p>}>
      <LawsPageClient />
    </Suspense>
  );
}
