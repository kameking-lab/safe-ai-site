import type { NextConfig } from "next";

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
  // 画像最適化（AVIF/WebP）
  images: {
    formats: ["image/avif", "image/webp"],
  },
  // 本番ビルドでconsole.logを除去してJSサイズを削減
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  // セキュリティ・キャッシュヘッダー
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
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
