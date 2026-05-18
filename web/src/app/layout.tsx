import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { FuriganaProvider } from "@/contexts/furigana-context";
import { EasyJapaneseProvider } from "@/contexts/easy-japanese-context";
import { LanguageProvider } from "@/contexts/language-context";
import { JsonLd, organizationSchema, webSiteSchema } from "@/components/json-ld";
import { ServiceWorkerRegistrar } from "@/components/service-worker-registrar";
import { InstallPwaPrompt } from "@/components/install-pwa-prompt";
import { CommandPaletteProvider } from "@/components/CommandPaletteProvider";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/lib/theme";
import Analytics from "@/components/Analytics";
import AdSenseScript from "@/components/AdSenseScript";

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
    default: "安全AIポータル｜現場の安全を、AIで変える。",
    template: "%s｜安全AIポータル",
  },
  ...(process.env.GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
    : {}),
  description:
    "労働安全衛生分野のAI・DX活用研究プロジェクト。通達・事故事例・化学物質情報を一次ソース付きで無料公開。",
  metadataBase: new URL("https://www.anzen-ai-portal.jp"),
  alternates: {
    canonical: "https://www.anzen-ai-portal.jp",
  },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    alternateLocale: ["en_US"],
    siteName: "安全AIポータル",
    title: {
      default: "安全AIポータル｜現場の安全を、AIで変える。",
      template: "%s｜安全AIポータル",
    },
    description: "法改正・現場リスク・事故データベース・KY用紙・化学物質RA・Eラーニングをまとめた労働安全ポータル。",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "安全AIポータル — 現場の安全を、AIで変える。",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: {
      default: "安全AIポータル｜現場の安全を、AIで変える。",
      template: "%s｜安全AIポータル",
    },
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
        {/* Warm up TCP/TLS for third-party origins before they're requested (B-15) */}
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://pagead2.googlesyndication.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        <link rel="dns-prefetch" href="https://generativelanguage.googleapis.com" />
        <link rel="dns-prefetch" href="https://formspree.io" />
      </head>
      <body className="min-h-full bg-slate-50 font-sans text-slate-900 dark:bg-slate-900 dark:text-slate-100">
        <Analytics />
        <AdSenseScript />
        <JsonLd schema={organizationSchema()} />
        <JsonLd schema={webSiteSchema()} />
        <ServiceWorkerRegistrar />
        <InstallPwaPrompt />
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
