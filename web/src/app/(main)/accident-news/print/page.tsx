import type { Metadata } from "next";
import { AccidentNewsPrintView } from "./print-view";
export const metadata: Metadata = {
  title: "重大災害事例 説明資料（印刷用）",
  description: "重大災害事例をA4印刷用にまとめた説明資料ビュー。データセット単位の出典と追跡上の限界を表示します。",
  alternates: { canonical: "/accident-news/print" },
  robots: { index: false },
};

export const revalidate = 86400;

export default async function AccidentNewsPrintPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  return <AccidentNewsPrintView initialQuery={await searchParams} initialTimestamp={new Date().toISOString()}/>;
}
