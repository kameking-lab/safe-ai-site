import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
    ],
  },
  title: {
    default: "安全AIサイト｜労働安全の現場運用ポータル",
    template: "%s｜安全AIサイト",
  },
  description:
    "法改正・現場リスク・事故データベース・KY用紙・Eラーニングをまとめた労働安全ポータル。建設・製造現場の安全担当者を支援します。",
  metadataBase: new URL("https://safe-ai-site.vercel.app"),
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "安全AIサイト",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-50 font-sans text-slate-900">{children}</body>
    </html>
  );
}