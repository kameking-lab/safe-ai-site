import type { Metadata } from "next";
import { JsonLd, WEBSITE_ID, breadcrumbSchema } from "@/components/json-ld";
import { ogImageUrl } from "@/lib/og-url";
import {
  SITE_NAME,
  SITE_URL,
  withSiteAlternates,
  withSiteOpenGraph,
  withSiteTwitter,
} from "@/lib/seo-metadata";
import { ProjectStoryContent } from "./project-story-content";

const TITLE = "プロジェクトについて";
const DESCRIPTION =
  "安全AIポータルの目的、編集体制、品質確認、プライバシー方針と、AIを最終判断の代わりにしない運用原則を説明します。";
const PATH = "/about/project-story";
const URL = `${SITE_URL}${PATH}`;
const PUBLISHED_AT = "2026-08-01";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: withSiteAlternates(PATH),
  openGraph: withSiteOpenGraph(PATH, {
    title: `${TITLE}｜${SITE_NAME}`,
    description: DESCRIPTION,
    images: [
      {
        url: ogImageUrl("現場の時間を、安全と本質的な仕事へ。", DESCRIPTION),
        width: 1200,
        height: 630,
        alt: `${TITLE}｜${SITE_NAME}`,
      },
    ],
  }),
  twitter: withSiteTwitter({
    title: `${TITLE}｜${SITE_NAME}`,
    description: DESCRIPTION,
    images: [ogImageUrl("現場の時間を、安全と本質的な仕事へ。", DESCRIPTION)],
  }),
};

export default function ProjectStoryPage() {
  return (
    <>
      <JsonLd
        schema={[
          {
            "@context": "https://schema.org",
            "@type": "AboutPage",
            "@id": URL,
            url: URL,
            name: TITLE,
            headline: "労働安全と生成AIを、根拠を確認できる形へ。",
            description: DESCRIPTION,
            inLanguage: "ja",
            datePublished: PUBLISHED_AT,
            dateModified: PUBLISHED_AT,
            isPartOf: { "@id": WEBSITE_ID },
          },
          breadcrumbSchema([
            { name: "ホーム", url: SITE_URL },
            { name: "このサイトについて", url: `${SITE_URL}/about` },
            { name: TITLE, url: URL },
          ]),
        ]}
      />

      <ProjectStoryContent />
    </>
  );
}
