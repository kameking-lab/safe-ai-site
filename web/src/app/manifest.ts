import type { MetadataRoute } from "next";

/**
 * Next.js App Router 規約準拠の dynamic manifest。
 * `public/manifest.json` を残したまま App Router 側で上書き配信することで、
 * ID_010 指摘の SEO 3 点セット（sitemap/robots/manifest）のうち manifest を
 * フレームワーク生成に統一する。
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "安全AIポータル — 現場の安全情報ポータル",
    short_name: "安全AIポータル",
    description:
      "法改正・事故DB・KY用紙・化学物質RA・Eラーニングを1つに。現場担当者の声を反映して継続的に改善される安全ポータル。",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    theme_color: "#1a7a4c",
    background_color: "#ffffff",
    lang: "ja",
    dir: "ltr",
    categories: ["productivity", "utilities", "business", "education"],
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    // ホーム画面ロングタップのクイックアクション。現場でよく使う順に並べる。
    // 横断検索(/search)＝発見性の入口・AI質問(/chatbot)＝安衛法の即答をショートカット化し、
    // インストール済みユーザーが1タップで到達できるようにする。URL は全て実在ルートで、
    // manifest.test.ts が page.tsx の実在を回帰固定する（幽霊ショートカット防止）。
    shortcuts: [
      {
        name: "今日のKY",
        short_name: "KY",
        description: "KY用紙を開く",
        url: "/ky",
      },
      {
        name: "横断検索",
        short_name: "検索",
        description: "法令・通達・事故・用語をまとめて検索",
        url: "/search",
      },
      {
        name: "AIに質問（安衛法）",
        short_name: "AI質問",
        description: "安衛法をその場でAIに質問",
        url: "/chatbot",
      },
      {
        name: "法改正",
        short_name: "法改正",
        description: "最新の法改正",
        url: "/laws",
      },
      {
        name: "事故DB",
        short_name: "事故",
        description: "事故データベース",
        url: "/accidents",
      },
    ],
    screenshots: [
      {
        src: "/screenshots/home-desktop.png",
        sizes: "2560x1600",
        type: "image/png",
        form_factor: "wide",
        label: "ホーム — 法改正・事故DB・KYへのクイックアクセス",
      },
      {
        src: "/screenshots/ky-desktop.png",
        sizes: "2560x1600",
        type: "image/png",
        form_factor: "wide",
        label: "KY用紙 — 朝礼で使える危険予知シート",
      },
      {
        src: "/screenshots/chatbot-desktop.png",
        sizes: "2560x1600",
        type: "image/png",
        form_factor: "wide",
        label: "AIチャットボット — 安衛法をその場で質問",
      },
      {
        src: "/screenshots/home-mobile.png",
        sizes: "750x1334",
        type: "image/png",
        form_factor: "narrow",
        label: "ホーム (モバイル)",
      },
      {
        src: "/screenshots/ky-mobile.png",
        sizes: "750x1334",
        type: "image/png",
        form_factor: "narrow",
        label: "KY用紙 (モバイル)",
      },
      {
        src: "/screenshots/chatbot-mobile.png",
        sizes: "750x1334",
        type: "image/png",
        form_factor: "narrow",
        label: "AIチャットボット (モバイル)",
      },
    ],
  };
}
