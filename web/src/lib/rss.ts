/**
 * P1-3: RSS 2.0 生成（news-completion 2026-05-29）
 *
 * 自サイトが生成した事実サマリ＋公式誘導リンクで構成する。
 * 厚労省RSS等の本文転載はしない（doc11 コンプラ）。出典は各 item の <link>。
 */

import type { NewsHubItem } from "@/lib/news-hub-types";
import { NEWS_HUB_CATEGORY_LABEL } from "@/lib/news-hub-types";

const SITE = "https://www.anzen-ai-portal.jp";

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** YYYY-MM-DD → RFC822 (RSS pubDate)。不正なら現在時刻。 */
export function toRfc822(date: string): string {
  const m = /(\d{4})-(\d{2})-(\d{2})/.exec(date);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date();
  return d.toUTCString();
}

export type RssChannelMeta = {
  title: string;
  description: string;
  /** チャンネルが指す人間向けページ（/whats-new 等） */
  selfPath: string;
  /** このフィード自身のパス（/feed/news.xml 等） */
  feedPath: string;
};

export function buildRssXml(items: readonly NewsHubItem[], meta: RssChannelMeta): string {
  const now = new Date().toUTCString();
  const channelLink = `${SITE}${meta.selfPath}`;
  const itemsXml = items
    .map((i) => {
      const badge = i.badge ? `［${i.badge}］` : "";
      const desc = `${NEWS_HUB_CATEGORY_LABEL[i.category]}${badge}: ${i.summary}（出典は本項目のリンク先公式情報をご確認ください）`;
      return [
        "    <item>",
        `      <title>${escapeXml(i.title)}</title>`,
        `      <link>${escapeXml(i.url)}</link>`,
        `      <description>${escapeXml(desc)}</description>`,
        `      <category>${escapeXml(NEWS_HUB_CATEGORY_LABEL[i.category])}</category>`,
        `      <pubDate>${toRfc822(i.date)}</pubDate>`,
        `      <guid isPermaLink="false">${escapeXml(i.id)}</guid>`,
        "    </item>",
      ].join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${escapeXml(meta.title)}</title>`,
    `    <link>${channelLink}</link>`,
    `    <description>${escapeXml(meta.description)}</description>`,
    "    <language>ja</language>",
    `    <lastBuildDate>${now}</lastBuildDate>`,
    `    <atom:link href="${SITE}${meta.feedPath}" rel="self" type="application/rss+xml" />`,
    itemsXml,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}

export const RSS_HEADERS = {
  "Content-Type": "application/rss+xml; charset=utf-8",
  "Cache-Control": "public, max-age=3600, s-maxage=86400",
} as const;
