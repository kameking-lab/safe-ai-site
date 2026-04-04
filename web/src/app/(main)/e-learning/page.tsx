import type { Metadata } from "next";
import { HomeScreen } from "@/components/home-screen";
import { Header } from "@/components/header";

export const metadata: Metadata = {
  title: "Eラーニング",
  description: "労働安全に関するテーマ別学習コンテンツとクイズで知識を確認。",
};

export default function ELearningPage() {
  return (
    <HomeScreen variant="elearning">
      <Header />
    </HomeScreen>
  );
}
