import type { MetadataRoute } from "next";

// 一般向け非公開パス（UA:* と AI検索系の両方に適用）
const COMMON_DISALLOW = ["/admin/", "/api/", "/auth/", "/dev/", "/handover", "/lms", "/api-docs", "/dpa"];

// 学習用クローラ・大量スクレイパ: 全面遮断を維持
// （Vercel帯域/Function枠の浪費防止＋学習利用拒否。2026-06-11 オーナー決裁で「検索引用系」と分離）
// 注: FacebookBot（Meta の広告/インデックス用クローラ）は遮断を維持する。
//     ユーザーがリンクを貼った時だけ動く facebookexternalhit（OGP取得）とは別物。
const AI_TRAINING_CRAWLERS = [
  "GPTBot",
  "ClaudeBot",
  "anthropic-ai",
  "Bytespider",
  "Amazonbot",
  "CCBot",
  "FacebookBot",
  "ImgProxy",
  "Diffbot",
  "omgili",
  "omgilibot",
];

// AI検索・引用系（回答に出典リンクを付けるボット／ユーザー操作起点のフェッチ）: 許可
// 一般UAと同じ非公開パスのみ除外。許可UAはクロール量が増えるため、帯域逼迫時はここを見直す。
const AI_SEARCH_CITATION_BOTS = [
  "OAI-SearchBot", // ChatGPT search のインデックス
  "ChatGPT-User", // ChatGPT ユーザー操作起点のフェッチ
  "PerplexityBot", // Perplexity のインデックス
  "Claude-Web", // Anthropic ユーザー操作起点（旧称）
  "YouBot", // You.com 検索
];

// SNSリンクプレビュー取得ボット（ユーザーがURLを貼った瞬間だけ動く OGP フェッチャ）: 許可
// 2026-06-11 オーナー決裁A: FB/Messenger/Instagram でリンクカード（og:image/og:title）を
// 復活させる。学習用 FacebookBot とは別UAで、遮断するとプレビューが出ず拡散性を損なう。
// 一般UAと同じ非公開パスのみ除外。
const SOCIAL_LINK_PREVIEW_BOTS = [
  "facebookexternalhit", // Facebook / Messenger / Instagram のリンクカード
];

export default function robots(): MetadataRoute.Robots {
  const trainingRules: MetadataRoute.Robots["rules"] = AI_TRAINING_CRAWLERS.map((ua) => ({
    userAgent: ua,
    disallow: "/",
  }));
  const searchBotRules: MetadataRoute.Robots["rules"] = AI_SEARCH_CITATION_BOTS.map((ua) => ({
    userAgent: ua,
    allow: "/",
    disallow: COMMON_DISALLOW,
  }));
  const socialPreviewRules: MetadataRoute.Robots["rules"] = SOCIAL_LINK_PREVIEW_BOTS.map((ua) => ({
    userAgent: ua,
    allow: "/",
    disallow: COMMON_DISALLOW,
  }));

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Pre-launch features and internal pages: also covered by per-page noindex.
        disallow: COMMON_DISALLOW,
      },
      ...searchBotRules,
      ...socialPreviewRules,
      ...trainingRules,
    ],
    sitemap: "https://www.anzen-ai-portal.jp/sitemap-index.xml",
  };
}
