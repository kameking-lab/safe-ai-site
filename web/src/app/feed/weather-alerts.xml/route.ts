import { PREFECTURE_CENTROIDS } from "@/data/jma/prefecture-centroids";
import { getJmaWarningsRuntime } from "@/lib/jma/fetch-jma-runtime";
import { escapeXml, toRfc822 } from "@/lib/rss";

/**
 * 気象警報RSS（警報・特別警報が発表中の都道府県）。
 *
 * 鍵なし通知ライトの購読経路: SlackのRSSアプリ・Teams・RSSリーダー等に登録すれば
 * 「閉じている端末に届かない」制約をユーザー側のツールで補える（Path A の逃げ道）。
 * 本文は自サイト生成の事実サマリのみ・出典リンクは気象庁（既存 /feed/* と同じコンプラ方針）。
 * 注意報（advisory）はノイズになるため含めない（警報 warning / 特別警報 special のみ）。
 */

const SITE = "https://www.anzen-ai-portal.jp";
const PREF_NAME = new Map(PREFECTURE_CENTROIDS.map((p) => [p.iso, p.name]));

export const maxDuration = 60;

export async function GET() {
  const warnings = await getJmaWarningsRuntime();
  const now = new Date().toUTCString();

  const items: string[] = [];
  for (const [iso, entry] of Object.entries(warnings.byIso ?? {})) {
    const prefName = PREF_NAME.get(iso);
    if (!prefName) continue;
    for (const w of entry.entries ?? []) {
      if (w.level !== "warning" && w.level !== "special") continue;
      const levelLabel = w.level === "special" ? "特別警報" : "警報";
      const title = `${prefName}: ${levelLabel} 発表中${w.headline ? `｜${w.headline}` : ""}`;
      const guid = `jma-${iso}-${w.sourceCode}-${w.reportDatetime ?? "latest"}`;
      const pubDate = w.reportDatetime ? new Date(w.reportDatetime).toUTCString() : now;
      items.push(
        [
          "    <item>",
          `      <title>${escapeXml(title)}</title>`,
          `      <link>${escapeXml("https://www.jma.go.jp/bosai/warning/")}</link>`,
          `      <description>${escapeXml(
            `気象庁発表の${levelLabel}が${prefName}に発表されています。最新の対象市区町村・種別は気象庁の警報・注意報ページ（リンク先）で確認してください。`,
          )}</description>`,
          "      <category>気象警報</category>",
          `      <pubDate>${pubDate}</pubDate>`,
          `      <guid isPermaLink="false">${escapeXml(guid)}</guid>`,
          "    </item>",
        ].join("\n"),
      );
    }
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    "    <title>安全AIポータル 気象警報（発表中の都道府県）</title>",
    `    <link>${SITE}/notifications</link>`,
    "    <description>警報・特別警報が発表中の都道府県一覧（気象庁 防災情報JSONから生成・約30分毎更新）。注意報は含みません。出典: 気象庁。</description>",
    "    <language>ja</language>",
    `    <lastBuildDate>${now}</lastBuildDate>`,
    `    <atom:link href="${SITE}/feed/weather-alerts.xml" rel="self" type="application/rss+xml" />`,
    items.join("\n"),
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      // 気象は動く情報のため既存フィード（1h/1d）より短く。runtime側キャッシュは30分
      "Cache-Control": "public, max-age=300, s-maxage=1800",
    },
  });
}
