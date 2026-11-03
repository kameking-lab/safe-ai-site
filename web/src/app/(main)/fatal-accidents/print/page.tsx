import type { Metadata } from "next";
import { FatalAccidentsPrintView } from "./print-view";
export const metadata: Metadata = {
  title: "死亡事故データベース 説明資料（印刷用）",
  description: "死亡災害事例をA4印刷用にまとめた説明資料ビュー。データセット単位の出典と追跡上の限界を表示します。",
  alternates: { canonical: "/fatal-accidents/print" },
  robots: { index: false, follow: false },
};

export const revalidate = 86400;

export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  return <FatalAccidentsPrintView initialQuery={await searchParams} initialTimestamp={new Date().toISOString()}/>;
}
