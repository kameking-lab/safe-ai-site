import type { Metadata } from "next";
import { ogImageUrl } from "@/lib/og-url";
import { ChatbotBody } from "./ChatbotBody";

import { PageJsonLd } from "@/components/page-json-ld";
const _title = "安衛法 AI チャットボット｜法令質問";
const _desc =
  "労働安全衛生法・安衛則・石綿則・じん肺法・粉じん則・有機則・特化則・酸欠則・ボイラー則など全33法令以上の条文をAIが即答。現場の法令の疑問をその場で解決。";

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

export default function ChatbotPage() {
  return (
    <>
      <PageJsonLd name="安衛法AIチャットボット" description="労働安全衛生法・関連法令についてのAIチャットボット。条文・通達の根拠を明示。" path="/chatbot" />
      <ChatbotBody />
    </>
  );
}
