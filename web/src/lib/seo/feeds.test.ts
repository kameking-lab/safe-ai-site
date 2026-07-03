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

/** src/app/feed 配下の実在フィードルート（GET を持つ `<slug>.xml/route.ts`）を走査。 */
function actualFeedRoutePaths(): string[] {
  return readdirSync(FEED_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.endsWith(".xml"))
    .filter((d) => existsSync(resolve(FEED_DIR, d.name, "route.ts")))
    .map((d) => `/feed/${d.name}`);
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

  // 逆方向 drift ガード。上の「path→route」ガードは登録済みフィードの幽霊リンクを封じるが、
  // 「route→登録」の欠落＝app/feed に実ルートを足したのに SITE_FEEDS へ登録し忘れる穴は
  // 素通しだった。未登録フィードはクロール可（robots で /feed を Disallow していない）でも
  // どのページ <head> の rel="alternate" にも載らず**自動発見不能**になる（feeds.ts の
  // docstring が是正対象と明記した穴そのもの）。実ルート集合を走査し全件登録済みを機械固定。
  it("app/feed 配下の全 *.xml ルートが SITE_FEEDS に登録済み＝未広告フィード0（逆方向 drift ガード）", () => {
    const registered = new Set(SITE_FEEDS.map((f) => f.path));
    const actual = actualFeedRoutePaths();
    // サニティ: 走査が空振り（ディレクトリ移動等）していないこと。
    expect(actual.length).toBeGreaterThanOrEqual(2);
    const unadvertised = actual.filter((p) => !registered.has(p));
    expect(
      unadvertised,
      `SITE_FEEDS 未登録の実フィードルート＝どのページ head からも広告されず自動発見不能: ${unadvertised.join(", ")}`,
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
