import type { Metadata } from "next";
import { KeywordLandingView } from "@/components/seo/keyword-landing-view";
import { KeywordLandingJsonLd } from "@/components/seo/keyword-landing-jsonld";
import { getKeywordLandingBySlug } from "@/data/seo/keyword-landing";
import { ogImageUrl } from "@/lib/og-url";
import { withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";

const data = getKeywordLandingBySlug("industry-accident-reports")!;

export const metadata: Metadata = {
  title: data.title,
  description: data.description,
  keywords: data.keywords,
  alternates: { canonical: `/guides/${data.slug}` },
  openGraph: withSiteOpenGraph(`/guides/${data.slug}`, {
    title: data.title,
    description: data.description,
    images: [{ url: ogImageUrl(data.title, data.description), width: 1200, height: 630 }],
  }),
  twitter: withSiteTwitter({
    title: data.title,
    description: data.description,
    images: [ogImageUrl(data.title, data.description)],
  }),
};

export default function GuideIndustryAccidentReportsPage() {
  return (
    <>
      <KeywordLandingJsonLd data={data} />
      <KeywordLandingView data={data} />
    </>
  );
}
