import type { Metadata } from "next";
import { SignageMapClient } from "@/components/signage-map/signage-map-client";

export const metadata: Metadata = {
  title: "サイネージ地図 | 安全AIサイト",
  description: "気象庁の警報・天気・地震情報を地図上にリアルタイム表示するサイネージモード。",
};

export default function SignageMapPage() {
  return <SignageMapClient initialFullscreen={false} />;
}
