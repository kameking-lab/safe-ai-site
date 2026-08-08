import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { selectDailyVisualKy } from "@/lib/visual-ky/daily";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "今日の5分KYT",
  alternates: { canonical: "/training/visual-ky" },
  robots: { index: false, follow: true },
};

export default function TodayVisualKyPage() {
  const daily = selectDailyVisualKy();
  redirect(`/training/visual-ky/${daily.scenario.slug}`);
}
