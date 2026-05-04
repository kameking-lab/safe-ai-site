import type { NextConfig } from "next";

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://formspree.io https://generativelanguage.googleapis.com",
  "frame-src 'none'",
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
  // 直感URL（短い・単数形・別表記）から正規ページへの 301 リダイレクト。
  // 旧URL互換に加え、ユーザーが推測しがちな URL を恒久転送する。
  async redirects() {
    return [
      // 既存
      { source: "/feedback", destination: "/contact?category=demo", permanent: true },
      { source: "/cases", destination: "/", permanent: true },
      { source: "/cases/:slug", destination: "/", permanent: true },
      { source: "/bear-map", destination: "/risk", permanent: true },
      // 直感URL 10件（推測しがちな短縮形・単数形・英数別表記）
      { source: "/chat", destination: "/chatbot", permanent: true },
      { source: "/law", destination: "/laws", permanent: true },
      { source: "/accident", destination: "/accidents", permanent: true },
      { source: "/equipment-search", destination: "/equipment-finder", permanent: true },
      { source: "/quiz", destination: "/exam-quiz", permanent: true },
      { source: "/e-learn", destination: "/e-learning", permanent: true },
      { source: "/elearning", destination: "/e-learning", permanent: true },
      { source: "/support", destination: "/contact", permanent: true },
      { source: "/help", destination: "/contact", permanent: true },
      { source: "/price", destination: "/pricing", permanent: true },
      { source: "/faq", destination: "/qa-knowledge", permanent: true },
    ];
  },
  // セキュリティ・キャッシュヘッダー
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
