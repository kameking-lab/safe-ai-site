import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";
import { HomeScreen } from "@/components/home-screen";
import { PageHeader } from "@/components/page-header";
import { RelatedPageCards } from "@/components/related-page-cards";

export const metadata: Metadata = {
  title: "KY用紙",
  description: "危険予知活動表の作成・記録。音声入力対応で現場から入力できます。",
  openGraph: {
    title: "KY用紙｜ANZEN AI",
    description: "危険予知活動表の作成・記録。音声入力対応で現場から入力できます。",
  },
};

export default function KyPage() {
  return (
    <>
      <HomeScreen variant="ky">
        <PageHeader
          title="KY用紙"
          description="危険予知活動表の作成・記録。音声入力対応で現場から入力"
          icon={ClipboardList}
          iconColor="emerald"
        />
      </HomeScreen>
      <RelatedPageCards
        heading="合わせて使う"
        pages={[
          {
            href: "/risk-prediction",
            label: "AIリスク予測",
            description: "作業種別・環境条件からAIが潜在リスクを予測。KY用紙の危険予知項目の参考にできます。",
            color: "blue",
            cta: "リスクを予測する",
          },
          {
            href: "/accidents",
            label: "事故データベース",
            description: "200件以上の実事故事例を業種・種別で検索。危険予知の根拠として活用できます。",
            color: "orange",
            cta: "事故事例を確認する",
          },
        ]}
      />
    </>
  );
}
