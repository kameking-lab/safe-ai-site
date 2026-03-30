import { Header } from "@/components/header";
import { TabNavigation } from "@/components/tab-navigation";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <Header />
      <TabNavigation />
      <section className="border-t border-slate-100 px-4 py-5">
        <p className="text-sm leading-6 text-slate-600">
          この下に、法改正一覧・AI要約・質問チャットの内容を順番に実装します。
        </p>
      </section>
    </main>
  );
}
