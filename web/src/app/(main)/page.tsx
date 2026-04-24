import type { Metadata } from "next";
import { HomeScreen } from "@/components/home-screen";
import { TranslatedPageHeader } from "@/components/translated-page-header";
import { ogImageUrl } from "@/lib/og-url";

export const metadata: Metadata = {
  title: { absolute: "ANZEN AI｜現場の安全を、AIで変える。" },
  description:
    "法改正・現場リスク・事故データベース・KY用紙・化学物質RA・Eラーニングをまとめた労働安全ポータル。建設・製造・林業・運輸・医療福祉の安全担当者を支援します。",
  openGraph: {
    title: "ANZEN AI｜現場の安全を、AIで変える。",
    description:
      "法改正・現場リスク・事故データベース・KY用紙・化学物質RA・Eラーニングをまとめた労働安全ポータル。建設・製造・林業・運輸・医療福祉の安全担当者を支援します。",
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
      <TranslatedPageHeader
        titleJa="現場の安全情報を、すばやく確認"
        titleEn="Quick access to workplace safety information"
        descriptionJa="法改正・現場リスク・事故DB・KY用紙をまとめて確認"
        descriptionEn="Review law updates, field risks, accident DB, and KY forms in one place"
        iconName="Shield"
        iconColor="emerald"
      />
    </HomeScreen>
  );
}
