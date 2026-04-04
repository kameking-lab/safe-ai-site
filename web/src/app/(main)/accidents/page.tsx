import type { Metadata } from "next";
import { Database } from "lucide-react";
import { HomeScreen } from "@/components/home-screen";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "事故データベース",
  description: "労働災害の事故事例を検索・閲覧。厚労省データベースへのリンクも掲載。",
};

export default function AccidentsPage() {
  return (
    <HomeScreen variant="accidents">
      <PageHeader
        title="事故データベース"
        description="労働災害の事故事例を検索・閲覧。厚労省データベースへのリンクも掲載"
        icon={Database}
        iconColor="red"
      />
    </HomeScreen>
  );
}
