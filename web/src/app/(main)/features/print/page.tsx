import type { Metadata } from "next";
import { PrintFeaturesClient } from "./print-features-client";

export const metadata: Metadata = {
  title: "印刷用機能一覧 | ANZEN AI",
  description:
    "ANZEN AIの全機能をA4印刷用にレイアウト。社内検討用・稟議用に印刷してご利用ください。",
  robots: { index: false, follow: false },
};

export default function PrintFeaturesPage() {
  return <PrintFeaturesClient />;
}
