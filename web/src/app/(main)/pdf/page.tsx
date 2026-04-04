import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { HomeScreen } from "@/components/home-screen";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "PDF出力",
  description: "KY用紙・朝礼要点のPDFプレビューと出力。",
};

export default function PdfPage() {
  return (
    <HomeScreen variant="pdf">
      <PageHeader
        title="PDF出力"
        description="KY用紙・朝礼要点のPDFプレビューと出力"
        icon={FileText}
        iconColor="emerald"
      />
    </HomeScreen>
  );
}
