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

/** RSS pubDate（RFC822等）をパースしたミリ秒。パース不能は null */
export function parsePubDateMs(pubDate: string): number | null {
  if (!pubDate) return null;
  const t = Date.parse(pubDate);
  return Number.isFinite(t) ? t : null;
}

/**
 * Google Newsは同一記事でもクエリ・媒体ごとに別URLを返すため、リンク完全一致dedupeだけでは
 * 重複記事（媒体違いURL）が素通りする。見出し末尾の「 - 媒体名」を落とし、空白を除去して比較する。
 */
export function normalizeTitleForDedupe(title: string): string {
  return title
    .replace(/\s*[-–—]\s*[^-–—]{1,30}$/u, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

/**
 * 重大度スコアに鮮度加点を足した並べ替え用スコア。0日で最大+40、14日で0まで線形減衰、
 * それ以降は加点なし（重大度のみ）。中央値50日前だった掲示記事を14日以内優先へ寄せる。
 */
export function freshnessWeightedScore(title: string, pubDate: string, nowMs: number): number {
  const seriousness = scoreLaborNewsSeriousness(title);
  const publishedMs = parsePubDateMs(pubDate);
  if (publishedMs === null) return seriousness;
  const ageDays = Math.max(0, (nowMs - publishedMs) / 86_400_000);
  const FRESHNESS_WINDOW_DAYS = 14;
  const FRESHNESS_MAX_BONUS = 40;
  const freshnessBonus = Math.max(0, FRESHNESS_MAX_BONUS - (ageDays * FRESHNESS_MAX_BONUS) / FRESHNESS_WINDOW_DAYS);
  return seriousness + freshnessBonus;
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

/**
 * 取得済みRSS記事から表示用リストを組み立てる純関数（テスト用に fetch から分離）。
 * 1) タイトル正規化ベースでdedupe（同一記事の媒体違いURLを除去）
 * 2) 14日以内優先の鮮度フィルタ（不足時のみ古い記事で補完）
 * 3) 鮮度加重スコアで並べ替え
 */
export function selectLaborTrendItems(items: LaborRssItem[], maxTotal: number, nowMs: number): LaborRssItem[] {
  const deduped: LaborRssItem[] = [];
  const seenLinks = new Set<string>();
  const seenTitles = new Set<string>();
  for (const item of items) {
    if (seenLinks.has(item.link)) continue;
    const normalizedTitle = normalizeTitleForDedupe(item.title);
    if (normalizedTitle && seenTitles.has(normalizedTitle)) continue;
    seenLinks.add(item.link);
    if (normalizedTitle) seenTitles.add(normalizedTitle);
    deduped.push(item);
  }

  const FRESHNESS_WINDOW_DAYS = 14;
  const isFresh = (item: LaborRssItem) => {
    const publishedMs = parsePubDateMs(item.pubDate);
    return publishedMs !== null && (nowMs - publishedMs) / 86_400_000 <= FRESHNESS_WINDOW_DAYS;
  };
  const byFreshnessScore = (a: LaborRssItem, b: LaborRssItem) =>
    freshnessWeightedScore(b.title, b.pubDate, nowMs) - freshnessWeightedScore(a.title, a.pubDate, nowMs);

  const fresh = deduped.filter(isFresh).sort(byFreshnessScore);
  const stale = deduped.filter((item) => !isFresh(item)).sort(byFreshnessScore);

  // 鮮度優先。件数が足りない場合のみ、鮮度加重スコア順で古い記事を補完する。
  return [...fresh, ...stale].slice(0, maxTotal);
}

export async function fetchLaborTrendItems(maxTotal: number, nowMs: number = Date.now()): Promise<LaborRssItem[]> {
  const urls = RSS_QUERIES.map((q) => googleNewsRssUrl(encodeURIComponent(q)));
  const headers = {
    "User-Agent": "safe-ai-site-signage/1.0 (labor-trend; +https://github.com/kameking-lab/safe-ai-site)",
  };
  const merged: LaborRssItem[] = [];
  for (const url of urls) {
    try {
      // 6h: トレンド表示用 news (docs/perf/isr-followup.md)
      const res = await fetch(url, { headers, next: { revalidate: 21600 } });
      if (!res.ok) continue;
      const xml = await res.text();
      merged.push(...parseLaborRssItems(xml, 14));
    } catch {
      continue;
    }
  }

  return selectLaborTrendItems(merged, maxTotal, nowMs);
}
