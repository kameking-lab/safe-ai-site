import { buildNewsHubItems } from "@/lib/news-hub";
import { buildRssXml, RSS_HEADERS } from "@/lib/rss";

export const revalidate = 86400;

export function GET() {
  const items = buildNewsHubItems({ mediaLimit: 30 })
    .filter((i) => i.category === "accident" || i.category === "media")
    .slice(0, 50);
  const xml = buildRssXml(items, {
    title: "安全AIポータル 事故速報・労災ニュース",
    description: "労働災害の月次速報と関連報道。厚労省・公式出典リンク付き。無料・登録不要。",
    selfPath: "/accidents-reports",
    feedPath: "/feed/accident-reports.xml",
  });
  return new Response(xml, { headers: RSS_HEADERS });
}
