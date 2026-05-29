import { buildNewsHubItems } from "@/lib/news-hub";
import { buildRssXml, RSS_HEADERS } from "@/lib/rss";

export const revalidate = 86400;

export function GET() {
  const items = buildNewsHubItems({ seriousCaseLimit: 40 })
    .filter((i) => i.category === "serious-case")
    .slice(0, 40);
  const xml = buildRssXml(items, {
    title: "安全AIポータル 重大災害事例（匿名・公表事実）",
    description:
      "厚労省 死亡災害データベース（匿名・公表事実）の重大災害事例。業種・事故型・原因の類型把握に。会社名・氏名は扱いません。出典付き・無料・登録不要。",
    selfPath: "/accident-news",
    feedPath: "/feed/serious-cases.xml",
  });
  return new Response(xml, { headers: RSS_HEADERS });
}
