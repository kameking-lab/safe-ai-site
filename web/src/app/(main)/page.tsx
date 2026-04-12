import type { Metadata } from "next";
import { Shield } from "lucide-react";
import { HomeScreen } from "@/components/home-screen";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  openGraph: {
    title: "ANZEN AI｜現場の安全を、AIで変える。",
    description: "法改正・現場リスク・事故データベース・KY用紙・Eラーニングをまとめた労働安全ポータル。建設・製造現場の安全担当者を支援します。",
  },
};

export default function HomePage() {
  return (
    <HomeScreen variant="portal">
      <PageHeader
        title="現場の安全情報を、すばやく確認"
        description="法改正・現場リスク・事故DB・KY用紙をまとめて確認"
        icon={Shield}
        iconColor="emerald"
      />
    </HomeScreen>
  );
}
