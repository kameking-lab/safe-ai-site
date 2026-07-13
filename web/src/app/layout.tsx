import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { FuriganaProvider } from "@/contexts/furigana-context";
import { EasyJapaneseProvider } from "@/contexts/easy-japanese-context";
import { JsonLd, organizationSchema, webSiteSchema } from "@/components/json-ld";
import {
  SITE_URL,
  SITE_NAME,
  SITE_LOCALE,
  SITE_ALTERNATE_LOCALES,
} from "@/lib/seo-metadata";
import { ServiceWorkerRegistrar } from "@/components/service-worker-registrar";
import { InstallPwaPrompt } from "@/components/install-pwa-prompt";
import { CommandPaletteProvider } from "@/components/CommandPaletteProvider";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/lib/theme";
import { A11Y_HINT_INIT_SCRIPT } from "@/lib/a11y-hint";
import Analytics from "@/components/Analytics";
import AdSenseScript from "@/components/AdSenseScript";
import { rssAlternateTypes } from "@/lib/seo/feeds";
import { isGaEnabled } from "@/lib/analytics-env";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  // C-1: Geist は latin 専用で、日本語UIの本文・見出し（CJK）はシステムフォントで
  // 描画される。preload すると 30KB の woff2 が全ページの LCP クリティカル窓に
  // 入るため preload しない（数字・英字は swap で置き換わる）。
  preload: false,
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
  // 柱C-3 / S DRY: ルート metadata の絶対URLオリジン（metadataBase・サイトルート
  // canonical）も seo-metadata.ts の SITE_URL 単一ソースへ集約する。sitemap/robots/
  // og-image/json-ld/page-json-ld は既に SITE_URL 集約済みで、ルート layout.tsx の
  // metadataBase と canonical だけがドメイン直書きの取り残しだった。ここは全ページの
  // og:url/canonical 解決の基点かつサイトルート canonical という最重要箇所で、SITE_URL を
  // 別ドメインへ替えても追従しない構造上の穴だった。SITE_URL は末尾スラッシュ無し＝従来の
  // 直書き値と同値のため出力は byte-identical。
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: SITE_URL,
    // 実在する公開RSSフィード（/feed/*.xml）を全ページ <head> で広告し、RSSリーダー・
    // ブラウザ・クローラからの自動発見を有効化する。登録簿は lib/seo/feeds.ts が単一ソース。
    types: rssAlternateTypes(),
  },
  openGraph: {
    type: "website",
    // locale/alternateLocale/siteName も seo-metadata.ts の単一ソースへ集約
    //（SITE_LOCALE="ja_JP" / SITE_ALTERNATE_LOCALES=["en_US"] / SITE_NAME="安全AIポータル"
    // ＝従来の直書き値と同値のため出力は byte-identical）。
    locale: SITE_LOCALE,
    alternateLocale: [...SITE_ALTERNATE_LOCALES],
    siteName: SITE_NAME,
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
        {/* CLS抑止: a11y案内バナーの既読判定を first paint 前に確定させる（C-1） */}
        <script dangerouslySetInnerHTML={{ __html: A11Y_HINT_INIT_SCRIPT }} />
        {/* Warm up TCP/TLS for third-party origins before they're requested (B-15) */}
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://pagead2.googlesyndication.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        <link rel="dns-prefetch" href="https://generativelanguage.googleapis.com" />
        <link rel="dns-prefetch" href="https://formspree.io" />
      </head>
      <body className="min-h-full bg-slate-50 font-sans text-slate-900 dark:bg-slate-900 dark:text-slate-100">
        {isGaEnabled() && <Analytics />}
        <AdSenseScript />
        <JsonLd schema={organizationSchema()} />
        <JsonLd schema={webSiteSchema()} />
        <ServiceWorkerRegistrar />
        <InstallPwaPrompt />
        <ThemeProvider>
          <FuriganaProvider>
            <EasyJapaneseProvider>
              <CommandPaletteProvider>
                {children}
              </CommandPaletteProvider>
            </EasyJapaneseProvider>
          </FuriganaProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
