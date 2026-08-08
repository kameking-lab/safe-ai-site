import type { Metadata } from "next";
import {
  JsonLd,
  breadcrumbSchema,
  webApplicationSchema,
  webPageSchema,
} from "@/components/json-ld";
import { ogImageUrl } from "@/lib/og-url";
import {
  SITE_URL,
  withSiteOpenGraph,
  withSiteTwitter,
} from "@/lib/seo-metadata";
import { ChatbotBody } from "./ChatbotBody";

const TITLE = "安衛法AI｜現場の言葉で法令を確認";
const DESCRIPTION =
  "作業や設備を普段の言葉で質問し、労働安全衛生法令の結論・適用条件・施行状態と公式根拠を一つの会話で確認できます。";

type SearchParams = Record<string, string | string[] | undefined>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const params = await searchParams;
  const hasQuestionVariant = Object.keys(params).length > 0;
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: { canonical: "/chatbot" },
    referrer: hasQuestionVariant ? "no-referrer" : undefined,
    robots: hasQuestionVariant
      ? {
          index: false,
          follow: true,
          noarchive: true,
          googleBot: { index: false, follow: true, noarchive: true },
        }
      : undefined,
    openGraph: withSiteOpenGraph("/chatbot", {
      title: TITLE,
      description: DESCRIPTION,
      images: [
        {
          url: ogImageUrl(TITLE, DESCRIPTION),
          width: 1200,
          height: 630,
        },
      ],
    }),
    twitter: withSiteTwitter({
      images: [ogImageUrl(TITLE, DESCRIPTION)],
    }),
  };
}

export default function ChatbotPage() {
  const url = `${SITE_URL}/chatbot`;
  return (
    <>
      <style>{`body:has([data-chatbot-page]) [data-site-footer] { display: none !important; }`}</style>
      <JsonLd
        schema={[
          webPageSchema({
            name: TITLE,
            description: DESCRIPTION,
            url,
            keywords: [
              "労働安全衛生法",
              "安衛則",
              "法令相談",
              "e-Gov",
            ],
          }),
          breadcrumbSchema([
            { name: "ホーム", url: SITE_URL },
            { name: "安衛法AI", url },
          ]),
          webApplicationSchema({
            name: "安衛法AI",
            description: DESCRIPTION,
            url,
            applicationCategory: "BusinessApplication",
            featureList: [
              "現場の言葉による法令検索",
              "会話中の作業条件を踏まえた回答",
              "公式原文と該当箇所の表示",
              "条件不足時の確認質問",
            ],
          }),
        ]}
      />
      <div data-chatbot-page>
        <ChatbotBody />
      </div>
    </>
  );
}
