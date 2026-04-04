import { Shield } from "lucide-react";
import { HomeScreen } from "@/components/home-screen";
import { PageHeader } from "@/components/page-header";

export default function HomePage() {
  return (
    <HomeScreen variant="portal">
      <PageHeader
        title="現場の安全情報を、すばやく確認"
        description="法改正・現場リスク・事故DB・KY用紙をまとめて確認"
        icon={Shield}
        iconColor="emerald"
      />
    </HomeScreen>
  );
}
