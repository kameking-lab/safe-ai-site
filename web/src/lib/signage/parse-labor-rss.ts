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
  let inner = m[1].trim();
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

export async function fetchLaborTrendItems(maxTotal: number): Promise<LaborRssItem[]> {
  const urls = [
    "https://news.google.com/rss/search?q=%E5%8A%B4%E5%83%8D%E7%81%BD%E5%AE%B3&hl=ja&gl=JP&ceid=JP%3Aja",
    "https://news.google.com/rss/search?q=%E5%BB%BA%E8%A8%AD%E7%8F%BE%E5%A0%B4+%E4%BA%8B%E6%95%85&hl=ja&gl=JP&ceid=JP%3Aja",
  ];
  const headers = { "User-Agent": "safe-ai-site-signage/1.0 (labor-trend; +https://github.com/kameking-lab/safe-ai-site)" };
  const merged: LaborRssItem[] = [];
  const seen = new Set<string>();
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers, next: { revalidate: 3600 } });
      if (!res.ok) continue;
      const xml = await res.text();
      for (const item of parseLaborRssItems(xml, 12)) {
        if (seen.has(item.link)) continue;
        seen.add(item.link);
        merged.push(item);
        if (merged.length >= maxTotal) return merged;
      }
    } catch {
      continue;
    }
  }
  return merged;
}
