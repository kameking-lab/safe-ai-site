import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { SITE_URL, SITE_NAME, SITE_LOCALE } from "@/lib/seo-metadata";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { APP_SHELL_INTERACTIONS_SCRIPT } from "@/lib/app-shell-interactions-script";
import { PREHYDRATION_INTERACTIONS_SCRIPT } from "@/lib/prehydration-interactions";
import { rssAlternateTypes } from "@/lib/seo/feeds";
import { isGaEnabled } from "@/lib/analytics-env";
import { isPreviewSafetyMode } from "@/lib/server/deployment-safety";
import { getRumServerReadiness } from "@/lib/rum/server-readiness";
import { DeferredGlobalEnhancements } from "@/components/deferred-global-enhancements";
import { CspNonceProvider } from "@/components/csp-nonce-context";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b5d4b",
};

const PORTAL_DESCRIPTION =
  "労働安全衛生の一次資料へ到達し、今日の現場リスク、KY、法令、事故、化学物質を出典と確認状態つきで扱うための運用ポータルです。AIは補助であり、最終判断には公式資料と人による確認が必要です。";
const PREVIEW_SAFETY_MODE = isPreviewSafetyMode();
const FIRST_PAINT_INTERACTIONS_SCRIPT =
  APP_SHELL_INTERACTIONS_SCRIPT + PREHYDRATION_INTERACTIONS_SCRIPT;
const PREVIEW_ROBOTS: NonNullable<Metadata["robots"]> = {
  index: false,
  follow: false,
  nocache: true,
  googleBot: {
    index: false,
    follow: false,
    noimageindex: true,
  },
};

const metadataDefinition: Metadata = {
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
  },
  title: {
    default: "安全AIポータル｜根拠から、現場の行動へ",
    template: "%s｜安全AIポータル",
  },
  ...(process.env.GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
    : {}),
  description:
    "労働安全衛生分野のAI・DX活用研究プロジェクト。通達・事故事例・化学物質情報を一次ソース付きで無料公開。",
  ...(PREVIEW_SAFETY_MODE
    ? {
        robots: PREVIEW_ROBOTS,
      }
    : {}),
  // 柱C-3 / S DRY: ルート metadata の絶対URLオリジン（metadataBase・サイトルート
  // canonical）も seo-metadata.ts の SITE_URL 単一ソースへ集約する。sitemap/robots/
  // og-image/json-ld/page-json-ld は既に SITE_URL 集約済みで、ルート layout.tsx の
  // metadataBase と canonical だけがドメイン直書きの取り残しだった。ここは全ページの
  // og:url/canonical 解決の基点かつサイトルート canonical という最重要箇所で、SITE_URL を
  // 別ドメインへ替えても追従しない構造上の穴だった。SITE_URL は末尾スラッシュ無し＝従来の
  // 直書き値と同値のため出力は byte-identical。
  metadataBase: new URL(SITE_URL),
  alternates: {
    // 実在する公開RSSフィード（/feed/*.xml）を全ページ <head> で広告し、RSSリーダー・
    // ブラウザ・クローラからの自動発見を有効化する。登録簿は lib/seo/feeds.ts が単一ソース。
    types: rssAlternateTypes(),
  },
  openGraph: {
    type: "website",
    // 実在する別言語URLはまだないため alternateLocale / hreflang は出力しない。
    // locale/siteName は seo-metadata.ts の単一ソースへ集約する。
    locale: SITE_LOCALE,
    siteName: SITE_NAME,
    title: {
      default: "安全AIポータル｜根拠から、現場の行動へ",
      template: "%s｜安全AIポータル",
    },
    description:
      "法改正・現場リスク・事故データベース・KY用紙・化学物質RA・Eラーニングをまとめた労働安全ポータル。",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "安全AIポータル — 根拠から、現場の行動へ",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: {
      default: "安全AIポータル｜根拠から、現場の行動へ",
      template: "%s｜安全AIポータル",
    },
    description:
      "法改正・現場リスク・事故データベース・KY用紙・化学物質RA・Eラーニングをまとめた労働安全ポータル。",
    images: ["/api/og"],
  },
};

export const metadata: Metadata = {
  ...metadataDefinition,
  description: PORTAL_DESCRIPTION,
  openGraph: metadataDefinition.openGraph
    ? {
        ...metadataDefinition.openGraph,
        description: PORTAL_DESCRIPTION,
      }
    : undefined,
  twitter: metadataDefinition.twitter
    ? {
        ...metadataDefinition.twitter,
        description: PORTAL_DESCRIPTION,
      }
    : undefined,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? "";
  const analyticsEnabled = isGaEnabled();
  const rumReadiness = getRumServerReadiness();
  const rawRumBuildId =
    process.env.VERCEL_DEPLOYMENT_ID ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    "production-build";
  const rumBuildId =
    rawRumBuildId.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 80) ||
    "production-build";
  const adsEnabled =
    !PREVIEW_SAFETY_MODE && Boolean(process.env.NEXT_PUBLIC_ADSENSE_PUB_ID);
  return (
    <html lang="ja" className="h-full antialiased" suppressHydrationWarning>
      <head>
        {/* FOUC 抑止: hydration 前に html.dark を確定させる */}
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
        {/* CLS抑止とhydration前のEnter/Escapeをnonce付きで確定させる。 */}
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: FIRST_PAINT_INTERACTIONS_SCRIPT }}
        />
        <link rel="stylesheet" href="/print.css" media="print" />
      </head>
      <body className="min-h-full bg-slate-50 font-sans text-slate-900 dark:bg-slate-900 dark:text-slate-100">
        <noscript>
          <style>{`[data-display-settings]{display:none!important}`}</style>
          <div className="border-b-4 border-amber-700 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-950">
            <p className="font-bold">
              JavaScriptが無効です。動的な安全判定・保存・通知は動作していません。
            </p>
            <p>
              画面の「読み込み中」を安全情報として扱わず、
              <a
                className="mx-1 font-bold underline"
                href="https://www.jma.go.jp/bosai/warning/"
              >
                気象庁の警報・注意報
              </a>
              と
              <a
                className="mx-1 font-bold underline"
                href="https://laws.e-gov.go.jp/"
              >
                e-Gov現行法令
              </a>
              を直接確認してください。緊急時は現場の安全を確認し119番通報を優先してください。
            </p>
          </div>
        </noscript>
        <CspNonceProvider nonce={nonce}>
          <DeferredGlobalEnhancements
            analyticsEnabled={analyticsEnabled}
            adsEnabled={adsEnabled}
            rumReady={rumReadiness.ready}
            rumBuildId={rumBuildId}
            rumSampleRate={rumReadiness.sampleRate}
            previewSafetyMode={PREVIEW_SAFETY_MODE}
            nonce={nonce}
          />
          {children}
        </CspNonceProvider>
      </body>
    </html>
  );
}
