"use client";

import { useSearchParams } from "next/navigation";
import { Header } from "@/components/header";
import { HomeScreen } from "@/components/home-screen";
import type { TabId } from "@/components/tab-navigation";

export function LawsPageClient() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const initialLawTab: TabId = tab === "chat" ? "chat" : tab === "summary" ? "summary" : "laws";

  return (
    <HomeScreen key={initialLawTab} initialLawTab={initialLawTab} variant="laws">
      <Header />
    </HomeScreen>
  );
}
