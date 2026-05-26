import type { Metadata } from "next";
import { MeetingListClient } from "@/components/meeting/meeting-list-client";

export const metadata: Metadata = {
  title: "保存した打合せ書一覧 ｜ 安全工程打合せ書",
  description: "過去に保存した安全工程打合せ書を一覧・検索し、開いて再編集・翌日用に複製できます。",
  alternates: { canonical: "/safety-diary/list" },
  robots: { index: false, follow: true },
};

export default function MeetingListPage() {
  return <MeetingListClient />;
}
