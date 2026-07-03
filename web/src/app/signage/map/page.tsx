import type { Metadata } from "next";
import { SignageMapClient } from "@/components/signage-map/signage-map-client";
import { ogImageUrl } from "@/lib/og-url";
import { withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";

const TITLE = "サイネージ地図（全国の警報・地震） | 安全AIポータル";
const DESCRIPTION = "気象庁の警報・天気・地震情報を地図上にリアルタイム表示するサイネージモード。台風・地震時の防災監視用。TVの全画面表示にも対応。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/signage/map" },
  openGraph: withSiteOpenGraph("/signage/map", {
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: ogImageUrl(TITLE, DESCRIPTION), width: 1200, height: 630 }],
  }),
  twitter: withSiteTwitter({
    images: [ogImageUrl(TITLE, DESCRIPTION)],
  }),
};

export default function SignageMapPage() {
  return <SignageMapClient initialFullscreen={false} />;
}
