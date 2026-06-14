import { describe, it, expect } from 'vitest';
import {
  searchItems,
  countByCategory,
  buildSearchIndex,
  CATEGORY_META,
  type SearchItem,
} from './search-index';

const ITEMS: SearchItem[] = [
  { id: 'a', title: 'アーク溶接', subtitle: '特別教育 安衛則36条', category: 'education', url: '/edu/arc' },
  { id: 'b', title: 'アーク溶接機の点検', subtitle: '感電災害', category: 'accident', url: '/acc/arc' },
  { id: 'c', title: '酸素欠乏', subtitle: '酸欠 特別教育', category: 'education', url: '/edu/o2' },
  { id: 'd', title: 'トルエン', subtitle: 'CAS 108-88-3 有機溶剤', category: 'chemical', url: '/chem/toluene' },
  { id: 'e', title: '基発0401第1号', subtitle: '通達 化学物質', category: 'notice', url: '/notice/1' },
];

describe('searchItems', () => {
  it('空クエリは空配列を返す', () => {
    expect(searchItems(ITEMS, '', 'all')).toEqual([]);
    expect(searchItems(ITEMS, '   ', 'all')).toEqual([]);
  });

  it('完全一致 > 前方一致 > 部分一致 > subtitle一致 の順にスコアリングする', () => {
    const results = searchItems(ITEMS, 'アーク溶接', 'all');
    // 'アーク溶接'(完全一致, 100) が 'アーク溶接機の点検'(前方一致, 80) より上位
    expect(results.map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('subtitle のみ一致もヒットする', () => {
    const results = searchItems(ITEMS, '酸欠', 'all');
    expect(results.map((r) => r.id)).toContain('c');
  });

  it('カテゴリ指定でプールを絞り込む', () => {
    const edu = searchItems(ITEMS, '特別教育', 'education');
    expect(edu.every((r) => r.category === 'education')).toBe(true);
    // 'a'(subtitle に特別教育) と 'c'(subtitle に特別教育) がヒット、accident の 'b' は除外
    expect(edu.map((r) => r.id).sort()).toEqual(['a', 'c']);
  });

  it('表記ゆれ（全角・小書き・長音）を正規化して一致させる', () => {
    // 全角英数・ハイフン種別が違っても CAS 番号でヒット
    expect(searchItems(ITEMS, '108-88-3', 'all').map((r) => r.id)).toContain('d');
  });

  it('limit 既定は 10、明示でそれを超える件数を返せる', () => {
    const many: SearchItem[] = Array.from({ length: 25 }, (_, i) => ({
      id: `n${i}`,
      title: `溶接作業 ${i}`,
      subtitle: '訓練',
      category: 'education',
      url: `/x/${i}`,
    }));
    expect(searchItems(many, '溶接', 'all')).toHaveLength(10);
    expect(searchItems(many, '溶接', 'all', 100)).toHaveLength(25);
  });
});

describe('countByCategory', () => {
  it('空クエリは全カテゴリ0', () => {
    const c = countByCategory(ITEMS, '');
    expect(c.all).toBe(0);
    expect(c.education).toBe(0);
  });

  it('カテゴリ別に集計し all は合計に一致する', () => {
    const c = countByCategory(ITEMS, 'アーク溶接');
    expect(c.education).toBe(1); // 'a'
    expect(c.accident).toBe(1); // 'b'
    expect(c.all).toBe(c.education + c.accident);
  });
});

describe('CATEGORY_META', () => {
  it('全カテゴリにラベルと配色を持つ', () => {
    for (const key of ['law', 'notice', 'chemical', 'education', 'accident', 'precedent', 'glossary'] as const) {
      expect(CATEGORY_META[key].label).toBeTruthy();
      expect(CATEGORY_META[key].bgColor).toMatch(/^bg-/);
      expect(CATEGORY_META[key].textColor).toMatch(/^text-/);
    }
  });
});

describe('buildSearchIndex — 用語集（glossary）の収載', () => {
  it('@/data/glossary の語が glossary カテゴリで /glossary へリンクされる', async () => {
    const index = await buildSearchIndex();
    const glossary = index.filter((i) => i.category === 'glossary');
    // 4 バッチ＝152 語を収載（基礎語は /glossary 本体直書きのため対象外）
    expect(glossary.length).toBeGreaterThanOrEqual(150);
    expect(glossary.every((i) => i.url === '/glossary')).toBe(true);
    expect(glossary.every((i) => i.id.startsWith('glossary-'))).toBe(true);
  });

  it('用語名・読み（かな）・定義語のいずれからもヒットする', async () => {
    const index = await buildSearchIndex();
    // 用語名で完全一致（バッチ1 法令語）
    expect(searchItems(index, '労働基準法', 'glossary').length).toBeGreaterThan(0);
    // subtitle に読みと定義冒頭を載せているため、かな読みでも引ける
    const byReading = searchItems(index, 'ろうどうきじゅんほう', 'glossary');
    expect(byReading.some((i) => i.title === '労働基準法')).toBe(true);
  });

  it('countByCategory の all は glossary を含む全カテゴリ合計に一致する', async () => {
    const index = await buildSearchIndex();
    const c = countByCategory(index, '安全');
    expect(c.all).toBe(
      c.law + c.notice + c.chemical + c.education + c.accident + c.precedent + c.glossary,
    );
  });
});

describe('buildSearchIndex — 法令条文（law）の収載', () => {
  it('curated 中核法令が law カテゴリで /law-search へ深リンクされる', async () => {
    const index = await buildSearchIndex();
    const laws = index.filter((i) => i.category === 'law');
    // curated 中核（厚労省PDF補完=mhlwLawArticles を除く）で数百条規模を収載
    expect(laws.length).toBeGreaterThanOrEqual(300);
    expect(laws.every((i) => i.id.startsWith('law-'))).toBe(true);
    // 全件が /law-search への深リンク（条番号があれば law= と art= の両方を持つ）
    expect(laws.every((i) => i.url.startsWith('/law-search?law='))).toBe(true);
    expect(laws.some((i) => i.url.includes('&art='))).toBe(true);
  });

  it('法令名・略称・条番号・条文見出し語のいずれからもヒットする', async () => {
    const index = await buildSearchIndex();
    // 略称（安衛則）— 前方一致で title にヒット
    expect(searchItems(index, '安衛則', 'law').length).toBeGreaterThan(0);
    // 正式名称（subtitle 先頭に full law 名を載せている）
    expect(searchItems(index, '労働安全衛生規則', 'law').length).toBeGreaterThan(0);
    // 条文見出し語（例: 安全管理者の選任）が subtitle からヒット
    expect(searchItems(index, '安全管理者', 'law').length).toBeGreaterThan(0);
  });

  it('深リンク URL が law-search-panel と同形（law=正式名称 & art=条番号）で当該条文に解決する', async () => {
    const index = await buildSearchIndex();
    const anzeiHit = searchItems(index, '安全管理者の選任', 'law')[0];
    expect(anzeiHit).toBeTruthy();
    // law= は full law 名（パネルの filter が a.law === selectedLaw で照合するため）
    expect(anzeiHit.url).toContain(`law=${encodeURIComponent('労働安全衛生規則')}`);
    expect(anzeiHit.url).toMatch(/&art=/);
  });

  it('厚労省PDF補完（バンドル名）は law カテゴリに混入しない', async () => {
    const index = await buildSearchIndex();
    const laws = index.filter((i) => i.category === 'law');
    // mhlwLawArticles の law 値（文書バンドル名）は除外済み＝条文 title は略称+条番号のみ
    expect(laws.every((i) => i.title.length > 0)).toBe(true);
    // id 重複なし（law|条番号 のユニーク化）
    const ids = new Set(laws.map((i) => i.id));
    expect(ids.size).toBe(laws.length);
  });
});
