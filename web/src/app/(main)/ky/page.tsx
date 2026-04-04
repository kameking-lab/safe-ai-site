import type { Metadata } from "next";
import { HomeScreen } from "@/components/home-screen";
import { Header } from "@/components/header";

export const metadata: Metadata = {
  title: "KY用紙",
  description: "危険予知活動表の作成・記録。音声入力対応で現場から入力できます。",
};

export default function KyPage() {
  return (
    <HomeScreen variant="ky">
      <Header />
    </HomeScreen>
  );
}
