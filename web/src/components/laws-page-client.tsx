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
      <div className="mt-2">
        <LastUpdatedBadge />
      </div>
    </HomeScreen>
  );
}
