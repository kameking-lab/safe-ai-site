"use client";

import { useSearchParams } from "next/navigation";
import { HomeScreen } from "@/components/home-screen";
import { LastUpdatedBadge } from "@/components/last-updated-badge";
import { TranslatedPageHeader } from "@/components/translated-page-header";
import type { TabId } from "@/components/tab-navigation";

export function LawsPageClient() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const initialLawTab: TabId = tab === "chat" ? "chat" : tab === "summary" ? "summary" : "laws";

  return (
    <HomeScreen key={initialLawTab} initialLawTab={initialLawTab} variant="laws">
      <TranslatedPageHeader
        titleJa="法改正一覧"
        titleEn="Law Updates"
        descriptionJa="労働安全衛生法の改正情報をAI要約付きで確認"
        descriptionEn="Stay up to date with occupational safety law revisions (AI summaries included)"
        iconName="Scale"
        iconColor="blue"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <LastUpdatedBadge />
        <a
          href="https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/anzen/index.html"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
        >
          📑 厚労省 安衛法 新旧対照表（公式）
        </a>
        <a
          href="/laws/glossary"
          className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 hover:bg-purple-100"
        >
          📘 法令用語集
        </a>
      </div>
    </HomeScreen>
  );
}
