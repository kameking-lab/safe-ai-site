import type { Metadata } from "next";
import { LeafletPrintView } from "./LeafletPrintView";

import { PageJsonLd } from "@/components/page-json-ld";
export const metadata: Metadata = {
  title: "リーフレット（A4両面・印刷PDF）",
  description:
    "ANZEN AI 紹介リーフレット（A4両面）。労働安全コンサルタント監修の研究プロジェクトを 1 枚で説明できる印刷用 PDF。",
  alternates: { canonical: "/leaflet" },
};

export default function LeafletPage() {
  return (
    <>
      <PageJsonLd name="啓発リーフレット" description="現場での朝礼・安全教育で使える啓発リーフレットを印刷用にレイアウト。" path="/leaflet" />
      <LeafletPrintView />
    </>
  );
}
