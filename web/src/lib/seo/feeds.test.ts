import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { SITE_FEEDS, rssAlternateTypes } from "./feeds";

// このテストの起点（src/lib/seo）から app/feed への相対解決
const HERE = dirname(fileURLToPath(import.meta.url));
const APP_DIR = resolve(HERE, "../../app");

/** "/feed/news.xml" -> src/app/feed/news.xml/route.ts */
function routeFileForPath(feedPath: string): string {
  return resolve(APP_DIR, `.${feedPath}`, "route.ts");
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
