import type { Metadata } from "next";
import { HomeScreen } from "@/components/home-screen";
import { Header } from "@/components/header";

export const metadata: Metadata = {
  title: "事故データベース",
  description: "労働災害の事故事例を検索・閲覧。厚労省データベースへのリンクも掲載。",
};

export default function AccidentsPage() {
  return (
    <HomeScreen variant="accidents">
      <Header />
    </HomeScreen>
  );
}
