import type { Metadata } from "next";
import { SignageMapClient } from "@/components/signage-map/signage-map-client";

export const metadata: Metadata = {
  title: "サイネージ フルスクリーン",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ fullscreen?: string }>;
};

export default async function SignageDisplayPage({ searchParams }: Props) {
  const sp = await searchParams;
  const fullscreen = sp?.fullscreen !== "false";
  return <SignageMapClient initialFullscreen={fullscreen} />;
}
