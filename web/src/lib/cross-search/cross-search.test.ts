import { describe, expect, it, beforeAll } from 'vitest';
import { searchCrossIndex } from './score';
import { buildCrossSearchIndex, __resetCrossSearchIndexCache } from './build';
import type { CrossSearchItem } from './types';

/** 合成データ＝データ更新に左右されないスコアリング規約の固定。 */
const SYNTH: CrossSearchItem[] = [
  {
    id: 'edu-arc',
    title: 'アーク溶接等の業務',
    subtitle: '特別教育　安衛則第36条第3号',
    keywords: ['アーク溶接', '溶接', '溶断', '特別教育'],
    category: 'education',
    url: '/education-certification#sec-special',
  },
  {
    id: 'law-36',
    title: '特別教育を必要とする業務',
    subtitle: '安衛則　第36条',
    keywords: ['特別教育', 'アーク溶接', '研削'],
    category: 'law',
    url: '/law-search?q=%E5%AE%89%E8%A1%9B%E5%89%87',
  },
  {
    id: 'feature-elearn',
    title: 'Eラーニング',
    subtitle: '特別教育の受講管理',
    keywords: ['特別教育', '教育'],
    category: 'feature',
    url: '/e-learning',
  },
  {
    id: 'accident-weld',
    title: 'アーク溶接作業中の感電',
    subtitle: '製造業 / 感電',
    keywords: ['アーク溶接', '感電'],
    category: 'accident',
    url: '/accidents',
  },
];

describe('searchCrossIndex（スコアリング規約）', () => {
  it('空クエリは空配列', () => {
    expect(searchCrossIndex(SYNTH, '')).toEqual([]);
    expect(searchCrossIndex(SYNTH, '   ')).toEqual([]);
  });

  it('全語 AND マッチ＝複数語クエリで両語に当たる項目のみ採用', () => {
    // 「特別教育」だけ持つ accident-weld(アーク溶接のみ) や feature(特別教育のみ) は両語を満たさない
    const r = searchCrossIndex(SYNTH, 'アーク溶接 特別教育');
    const ids = r.map((x) => x.id);
    expect(ids).toContain('edu-arc');
    expect(ids).toContain('law-36');
    expect(ids).not.toContain('accident-weld'); // 特別教育を含まない
    expect(ids).not.toContain('feature-elearn'); // アーク溶接を含まない
  });

  it('「アーク溶接 特別教育」は教育資格DB（タイトル前方一致）を最上位にする', () => {
    const r = searchCrossIndex(SYNTH, 'アーク溶接 特別教育');
    expect(r[0].id).toBe('edu-arc');
    expect(r[0].category).toBe('education');
  });

  it('単語クエリはタイトル一致を優先する', () => {
    const r = searchCrossIndex(SYNTH, 'アーク溶接');
    // タイトルに含む edu-arc / accident-weld が、keyword のみの law-36 より上位
    expect(r[0].id === 'edu-arc' || r[0].id === 'accident-weld').toBe(true);
    expect(r.map((x) => x.id)).toContain('law-36');
  });

  it('カテゴリ絞り込みが効く', () => {
    const r = searchCrossIndex(SYNTH, '特別教育', { category: 'law' });
    expect(r.every((x) => x.category === 'law')).toBe(true);
    expect(r.map((x) => x.id)).toContain('law-36');
  });

  it('limit 指定で件数を制限する', () => {
    const r = searchCrossIndex(SYNTH, '特別教育', { limit: 1 });
    expect(r.length).toBe(1);
  });
});

describe('buildCrossSearchIndex（実データ統合）', () => {
  let index: CrossSearchItem[];

  beforeAll(async () => {
    __resetCrossSearchIndexCache();
    index = await buildCrossSearchIndex();
  });

  it('主要カテゴリが全て 1 件以上インデックスされる', () => {
    const cats = new Set(index.map((i) => i.category));
    for (const c of ['feature', 'education', 'law', 'notice', 'precedent', 'sign'] as const) {
      expect(cats.has(c), `category ${c} should be present`).toBe(true);
    }
  });

  it('全 URL が "/" 始まりの実在ルート形式（幽霊URL/空URL禁止）', () => {
    for (const i of index) {
      expect(i.url.startsWith('/'), `${i.id} url=${i.url}`).toBe(true);
      expect(i.title.length).toBeGreaterThan(0);
    }
  });

  it('完了条件: 「アーク溶接 特別教育」が教育資格DBに到達（最上位＝教育・タイトルにアーク溶接）', () => {
    const r = searchCrossIndex(index, 'アーク溶接 特別教育');
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].category).toBe('education');
    expect(r[0].title).toContain('アーク溶接');
    expect(r[0].url).toContain('/education-certification');
  });

  it('代表クエリ「玉掛け」で教育資格DBが上位に出る', () => {
    const r = searchCrossIndex(index, '玉掛け');
    const top5 = r.slice(0, 5);
    expect(top5.some((x) => x.category === 'education' && x.title.includes('玉掛け'))).toBe(true);
  });

  it('キャッシュ: 2 回目の build は同一参照を返す', async () => {
    const again = await buildCrossSearchIndex();
    expect(again).toBe(index);
  });
});
