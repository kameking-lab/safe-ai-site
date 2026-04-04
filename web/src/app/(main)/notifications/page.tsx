import type { Metadata } from "next";
import { HomeScreen } from "@/components/home-screen";
import { Header } from "@/components/header";

export const metadata: Metadata = {
  title: "通知・配信設定",
  description: "気象警報・法改正・事故情報の通知とメール配信の設定。",
};

export default function NotificationsPage() {
  return (
    <HomeScreen variant="notifications">
      <Header />
    </HomeScreen>
  );
}
