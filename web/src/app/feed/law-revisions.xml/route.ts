import { buildNewsHubItems } from "@/lib/news-hub";
import { buildRssXml, RSS_HEADERS } from "@/lib/rss";

export const revalidate = 86400;

export function GET() {
  const items = buildNewsHubItems({ lawLimit: 60 })
    .filter((i) => i.category === "law-revision")
    .slice(0, 50);
  const xml = buildRssXml(items, {
    title: "安全AIポータル 法改正情報（施行前/施行済）",
    description: "労働安全衛生関連の法改正。施行前/施行済バッジ・e-Gov出典付き。無料・登録不要。",
    selfPath: "/laws",
    feedPath: "/feed/law-revisions.xml",
  });
  return new Response(xml, { headers: RSS_HEADERS });
}
