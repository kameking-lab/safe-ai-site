import type { Metadata } from "next";
import { Suspense } from "react";
import { FileText } from "lucide-react";
import { HomeScreen } from "@/components/home-screen";
import { PageHeader } from "@/components/page-header";

import { PageJsonLd } from "@/components/page-json-ld";
export const metadata: Metadata = {
  alternates: { canonical: "/pdf" },
  title: "PDF出力",
  description: "KY用紙・朝礼要点のPDFプレビューと出力。",
  openGraph: {
    title: "PDF出力",
    description: "KY用紙・朝礼要点のPDFプレビューと出力。",
  },
};

export default function PdfPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl space-y-3 px-4 py-6">
          <div className="h-40 animate-pulse rounded-lg bg-slate-100" />
        </div>
      }
    >
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
    </Suspense>
  );
}
