import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "安全AIポータル",
    short_name: "安全AI",
    description:
      "法令・事故・KY・化学物質・気象を、出典と確認状態を見ながら扱う労働安全衛生の現場運用ポータル。",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    theme_color: "#0b5d4b",
    background_color: "#ffffff",
    lang: "ja",
    dir: "ltr",
    categories: ["productivity", "utilities", "business"],
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
    shortcuts: [
      {
        name: "今日の安全",
        short_name: "今日の安全",
        description: "地域を選び、警報と現場リスクを確認",
        url: "/risk",
      },
      {
        name: "KY用紙",
        short_name: "KY",
        description: "KY用紙を作成",
        url: "/ky/paper",
      },
      {
        name: "横断検索",
        short_name: "検索",
        description: "法令・通達・事故・化学物質・ガイドを横断検索",
        url: "/search",
      },
      {
        name: "法令ナビ",
        short_name: "法令",
        description: "一次資料へ条件から到達",
        url: "/law-navi",
      },
    ],
    screenshots: [
      {
        src: "/screenshots/home-desktop.png",
        sizes: "2560x1600",
        type: "image/png",
        form_factor: "wide",
        label: "安全AIポータルのホーム画面",
      },
      {
        src: "/screenshots/ky-desktop.png",
        sizes: "2560x1600",
        type: "image/png",
        form_factor: "wide",
        label: "KY用紙のデスクトップ画面",
      },
      {
        src: "/screenshots/home-mobile.png",
        sizes: "750x1334",
        type: "image/png",
        form_factor: "narrow",
        label: "安全AIポータルのモバイル画面",
      },
      {
        src: "/screenshots/ky-mobile.png",
        sizes: "750x1334",
        type: "image/png",
        form_factor: "narrow",
        label: "KY用紙のモバイル画面",
      },
    ],
  };
}
