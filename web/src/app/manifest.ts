import type { MetadataRoute } from "next";

/**
 * Next.js App Router 規約準拠の dynamic manifest。
 * `public/manifest.json` を残したまま App Router 側で上書き配信することで、
 * ID_010 指摘の SEO 3 点セット（sitemap/robots/manifest）のうち manifest を
 * フレームワーク生成に統一する。
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ANZEN AI — 現場の安全情報ポータル",
    short_name: "ANZEN AI",
    description:
      "法改正・事故DB・KY用紙・化学物質RA・Eラーニングを1つに。100人レビューで週次進化する唯一の安全ポータル。",
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
    shortcuts: [
      {
        name: "今日のKY",
        short_name: "KY",
        description: "KY用紙を開く",
        url: "/ky",
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
  };
}
