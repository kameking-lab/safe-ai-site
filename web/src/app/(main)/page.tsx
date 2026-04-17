import type { Metadata } from "next";
import { Shield } from "lucide-react";
import { HomeScreen } from "@/components/home-screen";
import { PageHeader } from "@/components/page-header";
import { ogImageUrl } from "@/lib/og-url";

export const metadata: Metadata = {
  title: { absolute: "ANZEN AI｜現場の安全を、AIで変える。" },
  description:
    "労働安全衛生法改正・事故データベース・KY用紙・危険予知活動・Eラーニングをまとめた安全管理ポータル。建設・製造業の安全担当者を支援します。",
  openGraph: {
    title: "ANZEN AI｜現場の安全を、AIで変える。",
    description:
      "労働安全衛生法改正・事故データベース・KY用紙・危険予知活動・Eラーニングをまとめた安全管理ポータル。建設・製造業の安全担当者を支援します。",
    images: [{ url: ogImageUrl("現場の安全を、AIで変える。"), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: [ogImageUrl("現場の安全を、AIで変える。")],
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
