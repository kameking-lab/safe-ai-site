/**
 * サイトの RSS フィード登録簿（発見性の単一ソース）。
 *
 * `src/app/feed/<slug>.xml/route.ts` に実在する公開フィード（無料・登録不要・
 * 出典リンク付き）を一覧化する。ルート layout.tsx の `alternates.types`
 * （`application/rss+xml`）がこの配列を敷いて全ページ `<head>` に
 * `<link rel="alternate" type="application/rss+xml">` を出力し、RSS リーダー・
 * ブラウザ・クローラからのフィード自動発見を可能にする。
 *
 * これまで 4 本のフィードは実在・クロール可（robots で /feed を Disallow して
 * いない）だったが、どのページ `<head>` からも広告されておらず**自動発見不能**
 * だった穴を是正する。`path` は必ず実在ルートに解決し（幽霊リンク0）、`title`
 * は各 route の channel title と一致することを `feeds.test.ts` で機械固定する。
 */
export type SiteFeed = {
  /** サイト相対パス。metadataBase により絶対URLへ解決される。 */
  readonly path: string;
  /** RSS channel の title と一致させる（drift ガードで固定）。 */
  readonly title: string;
};

export const SITE_FEEDS: readonly SiteFeed[] = [
  {
    path: "/feed/news.xml",
    title: "安全AIポータル 新着情報（法改正・事故速報・通達・報道）",
  },
  {
    path: "/feed/law-revisions.xml",
    title: "安全AIポータル 法改正情報（施行前/施行済）",
  },
  {
    path: "/feed/accident-reports.xml",
    title: "安全AIポータル 事故速報・労災ニュース",
  },
  {
    path: "/feed/serious-cases.xml",
    title: "安全AIポータル 重大災害事例（匿名・公表事実）",
  },
  {
    path: "/feed/weather-alerts.xml",
    title: "安全AIポータル 気象警報（発表中の都道府県）",
  },
] as const;

/**
 * Next.js Metadata の `alternates.types` へ渡す `application/rss+xml` 配列を組む。
 * ルート layout.tsx が全ページ共通で敷く。
 */
export function rssAlternateTypes(): Record<string, { url: string; title: string }[]> {
  return {
    "application/rss+xml": SITE_FEEDS.map((f) => ({ url: f.path, title: f.title })),
  };
}
