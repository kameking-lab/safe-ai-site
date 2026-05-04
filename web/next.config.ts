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
  // 直感URL（短い・単数形・別表記・日英両パターン）から正規ページへの恒久リダイレクト
  async redirects() {
    return [
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
      { source: "/quiz", destination: "/exam-quiz", permanent: true },
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
      // Note: /_next/static/* は Next.js が自動的に immutable な Cache-Control を設定するため
      // 明示的なオーバーライドは不要（指定すると build 警告が出る）
    ];
  },
};

export default nextConfig;
