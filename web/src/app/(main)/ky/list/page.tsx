import type { Metadata } from "next";
import { KyListClient } from "@/components/ky/ky-list-client";

export const metadata: Metadata = {
  title: "保存したKY一覧｜危険予知活動",
  description: "過去に保存したKYを一覧・検索し、開いて再編集・今日用に複製できます。",
  alternates: { canonical: "/ky/list" },
  robots: { index: false, follow: true },
};

export default function KyListPage() {
  return <KyListClient />;
}
