import type { Metadata } from "next";
import { LawSearchPanel } from "@/components/law-search-panel";

export const metadata: Metadata = {
  title: "法令全文検索",
  description: "労働安全衛生法・安全衛生規則などの条文をキーワード・条番号・法令名で全文検索できます。",
};

export default function LawSearchPage() {
  return <LawSearchPanel />;
}
