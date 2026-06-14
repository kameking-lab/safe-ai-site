import type { MetadataRoute } from "next";

// 一般向け非公開パス（UA:* と AI検索系の両方に適用）
const COMMON_DISALLOW = ["/admin/", "/api/", "/auth/", "/dev/", "/handover", "/lms", "/api-docs", "/dpa"];

// 学習用クローラ・大量スクレイパ: 全面遮断を維持
// （Vercel帯域/Function枠の浪費防止＋学習利用拒否。2026-06-11 オーナー決裁で「検索引用系」と分離）
// 注: FacebookBot（Meta の広告/インデックス用クローラ）は遮断を維持する。
//     ユーザーがリンクを貼った時だけ動く facebookexternalhit（OGP取得）とは別物。
//
// 末尾ブロック（*-Extended / 各社AI学習クローラ）は 2026-06-11 決裁の「学習系は遮断継続」
// 方針を、その後に各社が分離・新設した AI学習専用UA へ機械的に拡張したもの（新規方針判断ではない）。
//   - Google-Extended / Applebot-Extended は **AI学習(Gemini / Apple Intelligence)専用のオプトアウトUA**で、
//     Googlebot / Applebot（検索インデックス）とは別物。これを Disallow にしても検索順位・流入には一切影響しない。
//   - Meta-ExternalAgent は Meta の AI学習クローラ（FacebookBot とは別の新UA）。
//   - 検索引用系（OAI-SearchBot / PerplexityBot / Claude-SearchBot 等）は下の許可リストに置き、ここには入れない。
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
  // 各社が後発で分離・新設した AI学習専用UA（検索インデックスには影響しない学習オプトアウト）
  "Google-Extended", // Gemini / Vertex AI の学習。Googlebot（検索）とは別物
  "Applebot-Extended", // Apple Intelligence の学習。Applebot（Siri/Spotlight 検索）とは別物
  "Meta-ExternalAgent", // Meta の AI学習クローラ（FacebookBot とは別UA）
  "cohere-ai", // Cohere の学習クローラ
  "cohere-training-data-crawler",
  "PanguBot", // Huawei PanGu の学習
  "AI2Bot", // Allen Institute (OLMo/Dolma) の学習
  "Timpibot", // Timpi の学習
  "Webzio-Extended", // Webz.io の AI学習用フィード
  "FriendlyCrawler", // AI学習データ収集
  "ImagesiftBot", // The Hive 画像データセット収集
  "img2dataset", // 画像データセット大量取得
  "Kangaroo Bot", // AI学習データ収集
];

// AI検索・引用系（回答に出典リンクを付けるボット／ユーザー操作起点のフェッチ）: 許可
// 一般UAと同じ非公開パスのみ除外。許可UAはクロール量が増えるため、帯域逼迫時はここを見直す。
const AI_SEARCH_CITATION_BOTS = [
  "OAI-SearchBot", // ChatGPT search のインデックス
  "ChatGPT-User", // ChatGPT ユーザー操作起点のフェッチ
  "PerplexityBot", // Perplexity のインデックス
  "Claude-Web", // Anthropic ユーザー操作起点（旧称・後方互換のため残置）
  "Claude-User", // Anthropic ユーザー操作起点（現UA。学習用 ClaudeBot とは別物）
  "Claude-SearchBot", // Anthropic 検索インデックス（学習用 ClaudeBot とは別物）
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
