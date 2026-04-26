import type { Metadata } from "next";
import { MlitResourcesClient } from "@/components/mlit-resources-client";
import { mlitResources } from "@/data/mlit-resources";

const TITLE = "国交省・建災防 安全資料DB";
const DESCRIPTION = `国土交通省（航空・道路・鉄道・港湾・河川）と建設業労働災害防止協会の安全関連ガイドライン・マニュアル・通達を ${mlitResources.length} 件横断検索。一次ソース（PDF・公式ページ）への直リンク付き。`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: `${TITLE}｜ANZEN AI`,
    description: DESCRIPTION,
  },
};

export default function MlitResourcesPage() {
  return <MlitResourcesClient />;
}
