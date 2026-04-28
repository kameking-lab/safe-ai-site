import type { Metadata } from "next";
import { LeafletPrintView } from "./LeafletPrintView";

export const metadata: Metadata = {
  title: "リーフレット（A4両面・印刷PDF）",
  description:
    "ANZEN AI 紹介リーフレット（A4両面）。労働安全コンサルタント監修の研究プロジェクトを 1 枚で説明できる印刷用 PDF。",
  alternates: { canonical: "/leaflet" },
};

export default function LeafletPage() {
  return <LeafletPrintView />;
}
