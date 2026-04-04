import type { Metadata } from "next";
import { HomeScreen } from "@/components/home-screen";
import { Header } from "@/components/header";

export const metadata: Metadata = {
  title: "PDF出力",
  description: "KY用紙・朝礼要点のPDFプレビューと出力。",
};

export default function PdfPage() {
  return (
    <HomeScreen variant="pdf">
      <Header />
    </HomeScreen>
  );
}
