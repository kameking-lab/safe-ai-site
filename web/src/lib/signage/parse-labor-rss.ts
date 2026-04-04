export type LaborRssItem = {
  title: string;
  link: string;
  pubDate: string;
};

function decodeXmlEntities(s: string) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractTag(block: string, tag: string): string | null {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i");
  const m = block.match(re);
  if (!m?.[1]) return null;
  let inner = m[1]!.trim();
  const cdata = inner.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  if (cdata) inner = cdata[1]!.trim();
  return decodeXmlEntities(inner);
}

export function parseLaborRssItems(xml: string, limit: number): LaborRssItem[] {
  const out: LaborRssItem[] = [];
  const itemRe = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) !== null && out.length < limit) {
    const block = m[1]!;
    const title = extractTag(block, "title");
    const link = extractTag(block, "link");
    const pubDate = extractTag(block, "pubDate") ?? "";
    if (title && link) {
      out.push({ title, link, pubDate });
    }
  }
  return out;
}

/** 死亡・重傷・重機転倒など、サイネージ向けの重大ニュース優先度 */
export function scoreLaborNewsSeriousness(title: string): number {
  let s = 0;
  const death = /死亡|心肺停止|搬送後死亡|死亡確認|犠牲|犠牲者|没|逝去/;
  const injury = /重傷|重体|意識不明|生命の危機|重症|全治|後遺症/;
  const machine = /クレーン|重機|ショベル|はしご車|フォークリフト|転倒|横転|転落|崩落|崩壊|挟ま|巻き込|激突|衝突|爆発|火災|感電/;
  const site = /建設|工事|現場|工場|倉庫|解体|土木/;

  if (death.test(title)) s += 120;
  if (injury.test(title)) s += 70;
  if (machine.test(title)) s += 55;
  if (site.test(title)) s += 18;
  if (/労災|労働災害|業務上|災害/.test(title)) s += 25;

  return s;
}

const RSS_QUERIES = [
  "労働災害+死亡",
  "建設+事故+死亡",
  "クレーン+転倒+事故",
  "重機+事故+建設",
  "労働災害+重傷",
  "工事+現場+死亡",
  "フォークリフト+事故+死亡",
  "解体+事故+死亡",
];

function googleNewsRssUrl(encodedQuery: string) {
  return `https://news.google.com/rss/search?q=${encodedQuery}&hl=ja&gl=JP&ceid=JP%3Aja`;
}

export async function fetchLaborTrendItems(maxTotal: number): Promise<LaborRssItem[]> {
  const urls = RSS_QUERIES.map((q) => googleNewsRssUrl(encodeURIComponent(q)));
  const headers = {
    "User-Agent": "safe-ai-site-signage/1.0 (labor-trend; +https://github.com/kameking-lab/safe-ai-site)",
  };
  const merged: LaborRssItem[] = [];
  const seen = new Set<string>();
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers, next: { revalidate: 3600 } });
      if (!res.ok) continue;
      const xml = await res.text();
      for (const item of parseLaborRssItems(xml, 14)) {
        if (seen.has(item.link)) continue;
        seen.add(item.link);
        merged.push(item);
      }
    } catch {
      continue;
    }
  }

  merged.sort((a, b) => scoreLaborNewsSeriousness(b.title) - scoreLaborNewsSeriousness(a.title));

  const out: LaborRssItem[] = [];
  for (const item of merged) {
    if (scoreLaborNewsSeriousness(item.title) < 30 && out.length >= 4) {
      continue;
    }
    out.push(item);
    if (out.length >= maxTotal) break;
  }

  if (out.length < maxTotal) {
    for (const item of merged) {
      if (out.includes(item)) continue;
      out.push(item);
      if (out.length >= maxTotal) break;
    }
  }

  return out.slice(0, maxTotal);
}
