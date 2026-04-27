import { Suspense } from "react";
import type { Metadata } from "next";
import { ChemicalRaPanel } from "@/components/chemical-ra-panel";
import { TranslatedPageHeader } from "@/components/translated-page-header";
import { EnterpriseFunnel } from "@/components/EnterpriseFunnel";
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
    <>
      <div className="mx-auto max-w-7xl px-4 pt-6">
        <TranslatedPageHeader
          titleJa="化学物質リスクアセスメント"
          titleEn="Chemical Substance Risk Assessment"
          descriptionJa="化学物質名を入力してSDS・GHS分類・保護具・安全対策を確認。安衛法令和4年改正（自律管理）対応"
          descriptionEn="Enter a substance name to view SDS, GHS classification, required PPE, and safety checklists. Compliant with the 2024 OSH Act chemical management reforms (安衛法令和4年改正)"
          iconName="Search"
          iconColor="blue"
        />
      </div>
      <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-6 text-sm text-slate-500">読み込み中…</div>}>
        <ChemicalRaPanel />
      </Suspense>
      <EnterpriseFunnel
        service="chemical"
        headline="化学物質の自律管理体制を、まるごと整備"
        subline="SDS収集 → リスクアセスメント → 教育 → 記録保存まで、安衛法令和4年改正に沿った運用フローを貴社向けに設計します。"
      />
    </>
  );
}
