import type { Metadata } from "next";
import { Database } from "lucide-react";
import { HomeScreen } from "@/components/home-screen";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "事故データベース",
  description: "厚労省「職場のあんぜんサイト」等の実事例200件以上を収録。業種・事故種別で検索し、再発防止に活用できます。",
  openGraph: {
    title: "事故データベース｜ANZEN AI",
    description: "厚労省「職場のあんぜんサイト」等の実事例200件以上を収録。業種・事故種別で検索し、再発防止に活用できます。",
  },
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
