import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { SITE_FEEDS, rssAlternateTypes } from "./feeds";

// このテストの起点（src/lib/seo）から app/feed への相対解決
const HERE = dirname(fileURLToPath(import.meta.url));
const APP_DIR = resolve(HERE, "../../app");
const FEED_DIR = resolve(APP_DIR, "feed");

/** "/feed/news.xml" -> src/app/feed/news.xml/route.ts */
function routeFileForPath(feedPath: string): string {
  return resolve(APP_DIR, `.${feedPath}`, "route.ts");
}

/**
 * src/app/feed 直下を走査し、GET ハンドラを持つ `<slug>.xml/route.ts` を
 * 全て `/feed/<slug>.xml` パスへ射影する（実在する公開フィードの真の集合）。
 * これが SITE_FEEDS 登録簿と一致すべき「あるべき集合」。
 */
function discoverFeedRoutePaths(): string[] {
  if (!existsSync(FEED_DIR)) return [];
  const paths: string[] = [];
  for (const entry of readdirSync(FEED_DIR, { withFileTypes: true })) {
    // route group `(x)` / private `_x` は公開フィードではないので除外
    if (!entry.isDirectory() || entry.name.startsWith("(") || entry.name.startsWith("_")) continue;
    const routeFile = resolve(FEED_DIR, entry.name, "route.ts");
    if (!existsSync(routeFile)) continue;
    const src = readFileSync(routeFile, "utf8");
    if (!/export\s+(async\s+)?function\s+GET|export\s+const\s+GET/.test(src)) continue;
    paths.push(`/feed/${entry.name}`);
  }
  return paths.sort();
}

describe("SITE_FEEDS 登録簿", () => {
  it("2本以上・path/title 必須・path は /feed/*.xml", () => {
    expect(SITE_FEEDS.length).toBeGreaterThanOrEqual(2);
    for (const f of SITE_FEEDS) {
      expect(f.path).toMatch(/^\/feed\/[a-z-]+\.xml$/);
      expect(f.title.length).toBeGreaterThan(0);
    }
  });

  it("path 重複なし", () => {
    const paths = SITE_FEEDS.map((f) => f.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("全 path が実在フィードルート(route.ts)に解決＝幽霊フィードリンク0", () => {
    for (const f of SITE_FEEDS) {
      const routeFile = routeFileForPath(f.path);
      expect(existsSync(routeFile), `${f.path} → ${routeFile} が存在しない`).toBe(true);
      const src = readFileSync(routeFile, "utf8");
      // GET ハンドラを持つ実フィードであること
      expect(src).toMatch(/export\s+(async\s+)?function\s+GET|export\s+const\s+GET/);
    }
  });

  it("登録 title が各 route の RSS channel title と一致＝drift ガード", () => {
    for (const f of SITE_FEEDS) {
      const src = readFileSync(routeFileForPath(f.path), "utf8");
      expect(src.includes(f.title), `${f.path} の title が route と不一致: ${f.title}`).toBe(true);
    }
  });

  // 逆カバレッジガード：実在する全 /feed/*.xml ルートが SITE_FEEDS に登録されているか。
  // 上の「path→route」ガードは登録済みフィードの実在を守るが、逆向き「route→登録簿」
  //（実在フィードが登録漏れしていないか）が無いと、新フィードルートを追加したのに
  // SITE_FEEDS へ登録し忘れると、そのフィードはどのページ <head> の
  // <link rel="alternate" type="application/rss+xml"> にも出力されず＝RSSリーダー・
  // クローラから自動発見不能な孤立フィードのまま放置される（sitemap 逆カバレッジ #750 と同型の穴）。
  it("実在する全 /feed/*.xml ルートが SITE_FEEDS に登録済み＝自動発見漏れ0", () => {
    const discovered = discoverFeedRoutePaths();
    // 走査サニティ：既知4本以上を検出できていること（走査自体が壊れていない保証）
    expect(discovered.length).toBeGreaterThanOrEqual(4);
    const registered = new Set(SITE_FEEDS.map((f) => f.path));
    const unregistered = discovered.filter((p) => !registered.has(p));
    expect(
      unregistered,
      `実在するが SITE_FEEDS 未登録のフィード（<head> で広告されず自動発見不能）: ${unregistered.join(", ")}`,
    ).toEqual([]);
  });
});

describe("rssAlternateTypes()", () => {
  it("application/rss+xml に全フィードを url+title で敷く", () => {
    const types = rssAlternateTypes();
    const rss = types["application/rss+xml"];
    expect(rss).toBeDefined();
    expect(rss).toHaveLength(SITE_FEEDS.length);
    for (const f of SITE_FEEDS) {
      expect(rss).toContainEqual({ url: f.path, title: f.title });
    }
  });
});
