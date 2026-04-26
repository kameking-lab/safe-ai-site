import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { FuriganaProvider } from "@/contexts/furigana-context";
import { EasyJapaneseProvider } from "@/contexts/easy-japanese-context";
import { LanguageProvider } from "@/contexts/language-context";
import { JsonLd, organizationSchema, webSiteSchema, personSchema } from "@/components/json-ld";
import { ServiceWorkerRegistrar } from "@/components/service-worker-registrar";
import { CommandPaletteProvider } from "@/components/CommandPaletteProvider";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/lib/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1a7a4c",
};

export const metadata: Metadata = {
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48", type: "image/x-icon" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
  },
  title: {
    default: "ANZEN AI｜現場の安全を、AIで変える。",
    template: "%s｜ANZEN AI",
  },
  verification: {
    google: 'y_-VOPrIGDyyHEdjP0PtPk96E7V5KTh4zdTzhKy9ZBE',
  },
  description:
    "法改正・現場リスク・事故データベース・KY用紙・化学物質RA・Eラーニングをまとめた労働安全ポータル。建設・製造・林業・運輸・医療福祉の安全担当者を支援します。",
  metadataBase: new URL("https://safe-ai-site.vercel.app"),
  alternates: {
    canonical: "https://safe-ai-site.vercel.app",
  },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "ANZEN AI",
    title: "ANZEN AI｜現場の安全を、AIで変える。",
    description: "法改正・現場リスク・事故データベース・KY用紙・化学物質RA・Eラーニングをまとめた労働安全ポータル。",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "ANZEN AI — 現場の安全を、AIで変える。",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ANZEN AI｜現場の安全を、AIで変える。",
    description: "法改正・現場リスク・事故データベース・KY用紙・化学物質RA・Eラーニングをまとめた労働安全ポータル。",
    images: ["/api/og"],
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
      suppressHydrationWarning
    >
      <head>
        {/* FOUC 抑止: hydration 前に html.dark を確定させる */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full bg-slate-50 font-sans text-slate-900 dark:bg-slate-900 dark:text-slate-100">
        <JsonLd schema={organizationSchema()} />
        <JsonLd schema={webSiteSchema()} />
        <JsonLd schema={personSchema()} />
        <ServiceWorkerRegistrar />
        <ThemeProvider>
          <LanguageProvider>
            <FuriganaProvider>
              <EasyJapaneseProvider>
                <CommandPaletteProvider>
                  {children}
                </CommandPaletteProvider>
              </EasyJapaneseProvider>
            </FuriganaProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
