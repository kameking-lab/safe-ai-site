import type { Metadata } from "next";
import { GraduationCap } from "lucide-react";
import { HomeScreen } from "@/components/home-screen";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Eラーニング",
  description: "労働安全に関するテーマ別学習コンテンツとクイズで知識を確認。",
};

export default function ELearningPage() {
  return (
    <HomeScreen variant="elearning">
      <PageHeader
        title="Eラーニング"
        description="労働安全に関するテーマ別学習コンテンツとクイズ"
        icon={GraduationCap}
        iconColor="emerald"
      />
    </HomeScreen>
  );
}
