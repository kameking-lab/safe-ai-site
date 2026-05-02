import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { HomeScreen } from "@/components/home-screen";
import { PageHeader } from "@/components/page-header";

import { PageJsonLd } from "@/components/page-json-ld";
export const metadata: Metadata = {
  title: "PDF出力",
  description: "KY用紙・朝礼要点のPDFプレビューと出力。",
  openGraph: {
    title: "PDF出力｜ANZEN AI",
    description: "KY用紙・朝礼要点のPDFプレビューと出力。",
  },
};

export default function PdfPage() {
  return (
    <HomeScreen variant="pdf">
      {/* SEO: WebPage + BreadcrumbList */}
      <PageJsonLd name="PDF出力" description="KY用紙・朝礼要点のPDFプレビューと出力。" path="/pdf" />
      <PageHeader
        title="PDF出力"
        description="KY用紙・朝礼要点のPDFプレビューと出力"
        icon={FileText}
        iconColor="emerald"
      />
    </HomeScreen>
  );
}
