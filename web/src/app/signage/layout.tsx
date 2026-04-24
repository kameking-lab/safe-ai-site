import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "現場サイネージ",
  description: "建設・製造現場向けデジタルサイネージ。気象警報・労働災害トレンド・法改正をリアルタイム表示。大型モニター対応。",
  // 画面表示専用ページのため検索エンジンからは除外（04-21 SEO指摘への対応）
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "現場サイネージ｜ANZEN AI",
    description: "建設・製造現場向けデジタルサイネージ。気象警報・労働災害トレンド・法改正をリアルタイム表示。大型モニター対応。",
  },
};

export default function SignageLayout({ children }: { children: React.ReactNode }) {
  return children;
}
