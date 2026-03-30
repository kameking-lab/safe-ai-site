import { Header } from "@/components/header";
import { LawRevisionList } from "@/components/law-revision-list";
import { TabNavigation } from "@/components/tab-navigation";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <Header />
      <TabNavigation />
      <LawRevisionList />
    </main>
  );
}
