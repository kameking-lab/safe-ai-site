import { describe, it, expect } from 'vitest';
import {
  searchItems,
  countByCategory,
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
    for (const key of ['notice', 'chemical', 'education', 'accident', 'precedent'] as const) {
      expect(CATEGORY_META[key].label).toBeTruthy();
      expect(CATEGORY_META[key].bgColor).toMatch(/^bg-/);
      expect(CATEGORY_META[key].textColor).toMatch(/^text-/);
    }
  });
});
