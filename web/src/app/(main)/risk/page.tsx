import type { Metadata } from "next";
import { Zap } from "lucide-react";
import { HomeScreen } from "@/components/home-screen";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "今日の現場リスク",
  description: "地域・作業種別ごとの気象リスクを確認。朝礼での安全確認に活用できます。",
};

export default function RiskPage() {
  return (
    <HomeScreen variant="risk">
      <PageHeader
        title="今日の現場リスク"
        description="地域・作業種別ごとの気象リスクを確認。朝礼での安全確認に"
        icon={Zap}
        iconColor="amber"
      />
    </HomeScreen>
  );
}
