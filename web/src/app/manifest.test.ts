import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import manifest from "./manifest";

/**
 * PWA マニフェスト回帰テスト。
 *
 * 主眼はショートカット（ホーム画面ロングタップのクイックアクション）が
 * すべて**実在ルート**を指すことの固定＝幽霊ショートカット防止。ショートカット URL は
 * リンク切れになっても PWA インストール時にしか露見せず気づきにくいため、
 * page.tsx の実在をビルド外でも機械突合しておく（sitemap の孤立ページ突合と同方針）。
 *
 * 注: /search は noindex（クエリ毎の薄い重複ページのため）だが、ショートカットは
 * インストール済みユーザー向けの導線でありクローラ向けの indexability とは無関係のため
 * 収載してよい。ここでは「実在するか」だけを検証し「indexable か」は問わない。
 */
describe("manifest.ts（PWA ショートカット実在ガード）", () => {
  const m = manifest();

  /** URL パス（クエリ/ハッシュ除去）に対応する page.tsx が app ルートに実在するか。 */
  function routeExists(urlPath: string): boolean {
    const clean = urlPath.replace(/[?#].*$/, "").replace(/^\/+|\/+$/g, "");
    // ルート "/" はトップページ、それ以外は (main) 配下 → app 直下の順で探す。
    const candidates = clean === ""
      ? ["src/app/(main)/page.tsx", "src/app/page.tsx"]
      : [
          `src/app/(main)/${clean}/page.tsx`,
          `src/app/${clean}/page.tsx`,
        ];
    return candidates.some((rel) => existsSync(resolve(process.cwd(), rel)));
  }

  it("shortcuts が存在し、必須フィールドを備える", () => {
    expect(Array.isArray(m.shortcuts)).toBe(true);
    expect(m.shortcuts!.length).toBeGreaterThanOrEqual(3);
    for (const s of m.shortcuts!) {
      expect(s.name).toBeTruthy();
      expect(s.url).toMatch(/^\//); // 内部絶対パス
    }
  });

  it("全ショートカット URL が実在ルート（page.tsx）へ解決する＝幽霊ショートカット0", () => {
    for (const s of m.shortcuts!) {
      expect(routeExists(s.url), `ショートカット「${s.name}」の ${s.url} が実在しない`).toBe(true);
    }
  });

  it("ショートカット URL に重複がない", () => {
    const urls = m.shortcuts!.map((s) => s.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("発見性の入口（横断検索 /search・AI質問 /chatbot）をショートカットに含む", () => {
    const urls = new Set(m.shortcuts!.map((s) => s.url));
    expect(urls.has("/search")).toBe(true);
    expect(urls.has("/chatbot")).toBe(true);
  });

  it("start_url もアプリ内の実在ルートを指す", () => {
    expect(m.start_url).toBeTruthy();
    expect(routeExists(m.start_url!)).toBe(true);
  });
});
