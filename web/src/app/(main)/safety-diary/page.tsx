import type { Metadata } from "next";
import { SafetyDiaryPanel } from "@/components/safety-diary-panel";

export const metadata: Metadata = {
  title: "安全衛生日誌",
  description: "現場の安全活動を記録する安全衛生日誌。テーブルの行・列・項目を自由に編集でき、ブラウザに保存されます。",
  openGraph: {
    title: "安全衛生日誌｜ANZEN AI",
    description: "現場の安全活動を記録する安全衛生日誌。行・列・項目を自由に編集でき、ブラウザに保存。",
  },
};

export default function SafetyDiaryPage() {
  return <SafetyDiaryPanel />;
}
