import type { Metadata } from "next";
import { Brain } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { RiskPredictionPanel } from "@/components/risk-prediction-panel";

export const metadata: Metadata = {
  title: "AIリスク予測",
  description: "作業内容から事故事例を検索し、AIがリスクを予測。朝礼KY資料としてPDF出力も可能。",
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
