"use client";

import { useSearchParams } from "next/navigation";
import { Scale } from "lucide-react";
import { HomeScreen } from "@/components/home-screen";
import { PageHeader } from "@/components/page-header";
import type { TabId } from "@/components/tab-navigation";

export function LawsPageClient() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const initialLawTab: TabId = tab === "chat" ? "chat" : tab === "summary" ? "summary" : "laws";

  return (
    <HomeScreen key={initialLawTab} initialLawTab={initialLawTab} variant="laws">
      <PageHeader
        title="法改正一覧"
        description="労働安全衛生法の改正情報をAI要約付きで確認"
        icon={Scale}
        iconColor="blue"
      />
    </HomeScreen>
  );
}
