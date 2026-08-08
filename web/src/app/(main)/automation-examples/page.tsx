import type { Metadata } from "next";
import { AutomationExamplesContent } from "@/components/automation/automation-examples-content";
import { PageJsonLd } from "@/components/page-json-ld";
import { ogImageUrl } from "@/lib/og-url";
import { withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";

const title = "安全業務の自動化サンプル｜Safety Labs";
const description =
  "サイト内で試せる安全業務の改善例を、できること・制限・必要な外部設定・データの扱いとともに紹介します。主力機能や本番導入済みサービスとは区別して表示します。";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/automation-examples" },
  openGraph: withSiteOpenGraph("/automation-examples", {
    title,
    description,
    images: [
      {
        url: ogImageUrl("安全業務の自動化サンプル"),
        width: 1200,
        height: 630,
      },
    ],
  }),
  twitter: withSiteTwitter({
    title,
    description,
    images: [ogImageUrl("安全業務の自動化サンプル")],
  }),
};

export default function AutomationExamplesPage() {
  return (
    <>
      <PageJsonLd
        name={title}
        description={description}
        path="/automation-examples"
      />
      <AutomationExamplesContent />
    </>
  );
}
