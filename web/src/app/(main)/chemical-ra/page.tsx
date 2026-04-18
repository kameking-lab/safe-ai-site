import { Suspense } from "react";
import type { Metadata } from "next";
import { ChemicalRaPanel } from "@/components/chemical-ra-panel";
import { ogImageUrl } from "@/lib/og-url";

const _title = "化学物質 リスクアセスメント ツール";
const _desc =
  "化学物質名を入力するとSDS・GHS分類・必要保護具・安全対策チェックリストを表示。安衛法令和4年改正対応。厚労省データ参考。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  openGraph: {
    title: `${_title}｜ANZEN AI`,
    description: _desc,
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: [ogImageUrl(_title, _desc)],
  },
};

export default function ChemicalRaPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-6 text-sm text-slate-500">読み込み中…</div>}>
      <ChemicalRaPanel />
    </Suspense>
  );
}
