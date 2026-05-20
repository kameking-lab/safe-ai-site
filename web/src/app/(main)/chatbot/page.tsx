import type { Metadata } from "next";
import { ogImageUrl } from "@/lib/og-url";
import { ChatbotBody } from "./ChatbotBody";
import { withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";
import { SITE_URL } from "@/lib/seo-metadata";
import {
  JsonLd,
  webPageSchema,
  breadcrumbSchema,
  qaPageSchema,
  webApplicationSchema,
  COPILOT_FEATURE_PEERS,
} from "@/components/json-ld";
const _title = "安衛法AIチャットボット｜33法令以上を根拠条文付きで即答（無料）";
const _desc =
  "安衛法 AI チャットボット（無料）— 労働安全衛生法・安衛則・特化則・有機則・酸欠則・粉じん則・石綿則・じん肺法など33法令以上を根拠条文付きで即答。RAG方式・出典必須。元方事業者の統括責任から化学物質 自律的管理まで幅広く対応。使い方ガイドは /guides/anzeneho-ai-chatbot を参照。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/chatbot" },
  openGraph: withSiteOpenGraph("/chatbot", {
    title: _title,
    description: _desc,
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  }),
  twitter: withSiteTwitter({
    images: [ogImageUrl(_title, _desc)],
  }),
};

export default function ChatbotPage() {
  const url = `${SITE_URL}/chatbot`;
  return (
    <>
      <JsonLd
        schema={[
          webPageSchema({ name: _title, description: _desc, url, keywords: ["安衛法 AI チャットボット 無料", "労働安全衛生法 条文 即答", "33法令 根拠条文付き", "元方事業者 統括責任 Q&A", "化学物質 自律的管理 法令"] }),
          breadcrumbSchema([
            { name: "ホーム", url: SITE_URL },
            { name: "AIチャットボット", url },
          ]),
          qaPageSchema({ name: _title, description: _desc, url }),
          webApplicationSchema({
            name: "安衛法AIチャットボット",
            description:
              "労働安全衛生法・関連規則 33法令以上に対応した RAG 方式の安衛法AIチャットボット。根拠条文付きで回答します。",
            url,
            applicationCategory: "BusinessApplication",
            mentions: [COPILOT_FEATURE_PEERS.accidentsReports, COPILOT_FEATURE_PEERS.planGenerator],
            searchUrlTemplate: `${SITE_URL}/chatbot?q={search_term_string}`,
            featureList: [
              "労働安全衛生法・関連規則 33法令以上に対応",
              "根拠条文付き回答（RAG 方式）",
              "業種別 事故レポートへの自動誘導",
              "年次安全衛生計画ジェネレーターへの連携",
            ],
          }),
        ]}
      />
      <ChatbotBody />
    </>
  );
}
