import type { NextConfig } from "next";

// GA4 (gtag.js) loads from www.googletagmanager.com and beacons to
// www.google-analytics.com / *.analytics.google.com. AdSense loads from
// pagead2.googlesyndication.com and renders ad iframes from
// googleads.g.doubleclick.net and tpc.googlesyndication.com.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://pagead2.googlesyndication.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://formspree.io https://generativelanguage.googleapis.com https://www.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://pagead2.googlesyndication.com",
  "frame-src https://googleads.g.doubleclick.net https://tpc.googlesyndication.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://formspree.io",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  // pdfjs-dist はブラウザ専用。canvas モジュールを無効化してSSRビルドエラーを防ぐ
  webpack: (config) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (config.resolve as any).alias["canvas"] = false;
    return config;
  },
  // Turbopack のルートディレクトリを明示（monorepo/worktree 環境での誤検知防止）
  turbopack: {
    root: process.cwd(),
  },
  // /admin/status が同階層の report.md をサーバ読込するため明示的にトレース
  outputFileTracingIncludes: {
    "/admin/status": ["./src/app/admin/status/report.md"],
  },
  // 画像最適化（AVIF/WebP）
  images: {
    formats: ["image/avif", "image/webp"],
  },
  // 本番ビルドでconsole.logを除去してJSサイズを削減
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  // Ship browser source maps in production so error reports group by original
  // file/line. Lighthouse audit 2026-05-14 (B-14) flagged 32x missing source
  // maps; this also makes future React #418-style hydration errors traceable
  // (B-2 took manual repro work because of the missing maps).
  productionBrowserSourceMaps: true,
  // 直感URL（短い・単数形・別表記・日英両パターン）から正規ページへの恒久リダイレクト
  async redirects() {
    return [
      // Apex → www canonical (301 for unambiguous SEO consolidation; Vercel's
      // default apex alias responds with 307 Temporary which weakens the signal).
      {
        source: "/:path*",
        has: [{ type: "host", value: "anzen-ai-portal.jp" }],
        destination: "https://www.anzen-ai-portal.jp/:path*",
        statusCode: 301,
      },
      // 旧Vercelドメイン → 本番カスタムドメインへの恒久転送
      {
        source: "/:path*",
        has: [{ type: "host", value: "safe-ai-site.vercel.app" }],
        destination: "https://www.anzen-ai-portal.jp/:path*",
        permanent: true,
      },
      // フィードバック → コンテクスト付きお問い合わせ
      { source: "/feedback", destination: "/contact?category=demo", permanent: true },
      // 廃止・移動ページ
      { source: "/cases", destination: "/", permanent: true },
      { source: "/cases/:slug", destination: "/", permanent: true },
      { source: "/bear-map", destination: "/risk", permanent: true },
      // 英語短縮形・単数形
      { source: "/chat", destination: "/chatbot", permanent: true },
      { source: "/law", destination: "/laws", permanent: true },
      { source: "/accident", destination: "/accidents", permanent: true },
      { source: "/equipment-search", destination: "/equipment-finder", permanent: true },
      // /quiz is now served by a real page that re-renders the /exam-quiz
      // component with a canonical pointing at /exam-quiz. Lighthouse B-10
      // (PR #135) measured ~316 ms wasted on the 308 redirect; the re-export
      // collapses that hop while keeping SEO consolidated via canonical.
      { source: "/e-learn", destination: "/e-learning", permanent: true },
      { source: "/elearning", destination: "/e-learning", permanent: true },
      { source: "/support", destination: "/contact", permanent: true },
      { source: "/help", destination: "/contact", permanent: true },
      { source: "/price", destination: "/pricing", permanent: true },
      { source: "/faq", destination: "/qa-knowledge", permanent: true },
      // 安全日誌（日本語2パターン）
      { source: "/anzen-nisshi", destination: "/safety-diary", permanent: true },
      { source: "/anzen-eisei-nisshi", destination: "/safety-diary", permanent: true },
      // 法改正（英語・日本語）
      { source: "/regulations", destination: "/laws", permanent: true },
      { source: "/houkaisei", destination: "/laws", permanent: true },
      // 事故DB（英語・日本語）
      { source: "/news", destination: "/accidents", permanent: true },
      { source: "/jiko", destination: "/accidents", permanent: true },
      // 化学物質DB
      { source: "/chemical-search-db", destination: "/chemical-database", permanent: true },
      { source: "/kagaku-bushitsu", destination: "/chemical-ra", permanent: true },
      // サイネージ
      { source: "/safety-signage", destination: "/signage", permanent: true },
      // KY（危険予知の日本語フルネーム）
      { source: "/kiken-yochi", destination: "/ky", permanent: true },
      // 廃止ページ → 近接ページへ転送
      { source: "/partnership", destination: "/contact", permanent: true },
    ];
  },
  // セキュリティ・キャッシュヘッダー
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          // 2 years + includeSubDomains + preload is the canonical config
          // required by hstspreload.org for the Chrome HSTS Preload List.
          // Site owner must submit the domain at https://hstspreload.org/
          // separately; this header only makes the site eligible.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      // Note: /_next/static/* は Next.js が自動的に immutable な Cache-Control を設定するため
      // 明示的なオーバーライドは不要（指定すると build 警告が出る）
    ];
  },
    serverExternalPackages: ["@google-analytics/data", "@grpc/grpc-js", "google-gax", "google-auth-library"],
};

export default nextConfig;
