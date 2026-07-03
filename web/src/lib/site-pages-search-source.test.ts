import { describe, it, expect } from 'vitest';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSitePageSearchEntries } from './site-pages-search-source';
import { FLAGSHIP_FEATURES } from '@/config/flagship-nav';
import { INDUSTRY_CONTENT_SLUGS } from '@/data/industries-content';

/**
 * 機能ページ横断検索の drift ガード（コンテンツと同じ「発見性の穴を CI で塞ぐ」方針）。
 *
 * FLAGSHIP_FEATURES（サイドバー/トップ機能ナビの正本）を射影して横断検索へ機能ページを収載する。
 * ここでは (1) 全 url が実在ルートへ解決＝幽霊URL 0、(2) 主要機能が漏れなく収載、(3) 重複除去、
 * (4) 非空 を機械固定する。機能追加時に検索へ結線し忘れる／削除でデッドURLが残る穴を検知する。
 */
describe('site-pages-search-source（機能ページ射影の drift ガード）', () => {
  const entries = getSitePageSearchEntries();

  // src/app 配下を走査し、page.* を持つルートのセグメント列（route group 除去・動的[x]保持）を集める。
  // 本テストは src/lib 配下にあるため app ディレクトリは相対解決する（sitemap ghost ガードと同方針）。
  const APP_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'app');

  function collectRoutePatterns(dir: string = APP_DIR, segs: string[] = []): string[][] {
    const dirEntries = readdirSync(dir, { withFileTypes: true });
    const patterns: string[][] = [];
    if (dirEntries.some((e) => e.isFile() && e.name.startsWith('page.'))) {
      patterns.push(segs);
    }
    for (const e of dirEntries) {
      if (!e.isDirectory()) continue;
      const name = e.name;
      if (name.startsWith('@') || name.startsWith('_')) continue;
      const isGroup = name.startsWith('(') && name.endsWith(')');
      patterns.push(...collectRoutePatterns(join(dir, name), isGroup ? segs : [...segs, name]));
    }
    return patterns;
  }

  function resolvesToRoute(pathname: string, patterns: string[][]): boolean {
    const segs = pathname.split('/').filter(Boolean);
    return patterns.some(
      (pat) =>
        pat.length === segs.length &&
        pat.every((p, i) => p === segs[i] || (p.startsWith('[') && p.endsWith(']'))),
    );
  }

  const patterns = collectRoutePatterns();

  it('主要機能ページを射影できている（非空・走査サニティ）', () => {
    // FLAGSHIP_FEATURES は 12 機能。subItems を含め目的地は 12 を優に超える。
    expect(entries.length).toBeGreaterThanOrEqual(FLAGSHIP_FEATURES.length);
    expect(patterns.length).toBeGreaterThan(150); // app 走査の失敗を早期検知
  });

  it('全 url が実在ルートへ解決する＝幽霊URL 0', () => {
    const unresolved = entries.map((e) => e.url).filter((url) => !resolvesToRoute(url, patterns));
    expect(unresolved, `実在ルートへ解決しない url: ${unresolved.join(', ')}`).toEqual([]);
  });

  it('/industries/<slug> は generateStaticParams（INDUSTRY_CONTENT_SLUGS）へ解決する', () => {
    const slugs = new Set<string>(INDUSTRY_CONTENT_SLUGS);
    const industryUrls = entries
      .map((e) => e.url)
      .filter((url) => url.startsWith('/industries/'));
    // 構造解決だけでは動的スラッグの実在まで保証できないため、明示的に台帳一致を固定する。
    expect(industryUrls.length).toBeGreaterThan(0);
    for (const url of industryUrls) {
      const slug = url.slice('/industries/'.length);
      expect(slugs.has(slug), `未収載の業種スラッグ: ${slug}`).toBe(true);
    }
  });

  it('全 FLAGSHIP 主要機能のトップ href が収載されている（収載漏れ 0）', () => {
    const covered = new Set(entries.map((e) => e.url));
    const missing = FLAGSHIP_FEATURES.map((f) => f.href.replace(/[#?].*$/, '')).filter(
      (href) => !covered.has(href),
    );
    expect(missing, `検索未収載の主要機能: ${missing.join(', ')}`).toEqual([]);
  });

  it('url に重複が無い（同一ページの二重描画を防止）', () => {
    const urls = entries.map((e) => e.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('各エントリは title/subtitle/url を備え url は絶対パス', () => {
    for (const e of entries) {
      expect(e.title.trim().length, `title of ${e.id}`).toBeGreaterThan(0);
      expect(e.subtitle.trim().length, `subtitle of ${e.id}`).toBeGreaterThan(0);
      expect(e.url, `url of ${e.id}`).toMatch(/^\//);
    }
  });
});
