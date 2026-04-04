import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { HomeScreen } from "@/components/home-screen";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "通知・配信設定",
  description: "気象警報・法改正・事故情報の通知とメール配信の設定。",
};

export default function NotificationsPage() {
  return (
    <HomeScreen variant="notifications">
      <PageHeader
        title="通知・配信設定"
        description="気象警報・法改正・事故情報の通知とメール配信の設定"
        icon={Bell}
        iconColor="blue"
      />
    </HomeScreen>
  );
}
