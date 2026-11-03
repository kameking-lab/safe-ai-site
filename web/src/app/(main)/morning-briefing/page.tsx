import type { Metadata } from "next";
import { getAccidentCasesDataset } from "@/data/mock/accident-cases";
import { selectMorningCases } from "@/lib/morning-briefing";
import { MorningBriefing } from "./morning-briefing";

export const metadata: Metadata = {
  title: "朝礼3分セット｜今日の注意・事例・KY",
  description: "地域と作業を選び、今日の注意、関連事例、3つの確認項目を朝礼で共有。KY用紙への引き継ぎと印刷に対応します。",
  alternates: { canonical: "/morning-briefing" },
};

export default function MorningBriefingPage() {
  return <MorningBriefing cases={selectMorningCases(getAccidentCasesDataset())} />;
}
