import type { Metadata } from "next";
import { Brain } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { RiskPredictionPanel } from "@/components/risk-prediction-panel";

export const metadata: Metadata = {
  title: "AIリスク予測｜ANZEN AI",
  description: "作業内容から類似事故を検索し、AIがリスクを予測。建設・製造・林業現場のKY活動を支援します。",
  openGraph: {
    title: "AIリスク予測｜ANZEN AI",
    description: "作業内容から類似事故を検索し、AIがリスクを予測。建設・製造・林業現場のKY活動を支援します。",
  },
};

export default function RiskPredictionPage() {
  return (
    <>
      <PageHeader
        title="AIリスク予測"
        description="作業内容から事故事例を検索し、AIがリスクを予測"
        icon={Brain}
        iconColor="blue"
        badge="AI"
      />
      <RiskPredictionPanel />
    </>
  );
}
