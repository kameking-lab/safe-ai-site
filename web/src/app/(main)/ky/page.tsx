import type { Metadata } from "next";
import { HomeScreen } from "@/components/home-screen";
import { TranslatedPageHeader } from "@/components/translated-page-header";
import { RelatedPageCards } from "@/components/related-page-cards";
import { ogImageUrl } from "@/lib/og-url";

const _title = "KY用紙 作成ツール｜危険予知活動";
const _desc =
  "危険予知活動表（KY用紙）をオンラインで作成・記録。音声入力対応で現場から入力。建設・製造・土木の安全朝礼KY活動に。";

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

export default function KyPage() {
  return (
    <>
      <HomeScreen variant="ky">
        <TranslatedPageHeader
          titleJa="KY用紙"
          titleEn="KY Form (Hazard Identification)"
          descriptionJa="危険予知活動表の作成・記録。音声入力対応で現場から入力"
          descriptionEn="Create and record hazard identification sheets. Voice input supported."
          iconName="ClipboardList"
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
