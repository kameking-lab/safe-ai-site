import { buildNewsHubItems } from "@/lib/news-hub";
import { buildRssXml, RSS_HEADERS } from "@/lib/rss";

// 日次ISR（既存ETLの更新頻度に合わせる）
export const revalidate = 86400;

export function GET() {
  const items = buildNewsHubItems().slice(0, 50);
  const xml = buildRssXml(items, {
    title: "安全AIポータル 新着情報（法改正・事故速報・通達・報道）",
    description: "労働安全衛生の法改正・労災速報・通達・報道の新着。出典リンク付き・無料・登録不要。",
    selfPath: "/whats-new",
    feedPath: "/feed/news.xml",
  });
  return new Response(xml, { headers: RSS_HEADERS });
}
