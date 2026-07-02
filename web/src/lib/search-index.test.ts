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

  // T1: cross-search エンジン（AND＋シノニム＋keywords）への載せ替え規約。
  // 旧実装はクエリ全体を 1 つの部分文字列として扱い、2 語クエリが全滅していた。
  it('複数語クエリは全語 AND（全語がどこかに当たった項目のみ採用）', () => {
    const items: SearchItem[] = [
      { id: 'x', title: '足場の作業床', subtitle: '安衛則563条', category: 'law', url: '/x', keywords: ['足場', '作業床'] },
      { id: 'y', title: '足場の組立て', subtitle: '特別教育', category: 'law', url: '/y', keywords: ['足場'] },
      { id: 'z', title: '天井クレーン', subtitle: '作業床のない設備', category: 'law', url: '/z', keywords: ['作業床'] },
    ];
    // 「足場 作業床」は両語を満たす x のみ（y=作業床なし・z=足場なし は除外）
    expect(searchItems(items, '足場 作業床', 'all').map((r) => r.id)).toEqual(['x']);
  });

  it('keywords に当たる語でもヒットする（title/subtitle に出ない別名）', () => {
    const items: SearchItem[] = [
      { id: 'k', title: '第563条', subtitle: '安衛則', category: 'law', url: '/k', keywords: ['作業床', '足場'] },
    ];
    // title/subtitle には無い「作業床」が keywords 経由でヒット
    expect(searchItems(items, '作業床', 'all').map((r) => r.id)).toContain('k');
  });

  it('シノニム展開が効く（アスベスト→石綿／石綿則）', () => {
    const items: SearchItem[] = [
      { id: 's', title: '石綿則 第3条', subtitle: '石綿障害予防規則 事前調査', category: 'law', url: '/s', keywords: ['石綿', '事前調査'] },
    ];
    // 口語「アスベスト」は query-expansion で「石綿」「石綿則」へ展開され条文に届く
    expect(searchItems(items, 'アスベスト', 'all').map((r) => r.id)).toContain('s');
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

describe('buildSearchIndex — 通達（notice）の個別詳細への深リンク', () => {
  it('全 notice が /circulars/<id> へ深リンクし、裸 /resources?q= は使わない', async () => {
    const index = await buildSearchIndex();
    const notices = index.filter((i) => i.category === 'notice');
    expect(notices.length).toBeGreaterThan(0);
    // 旧実装の /resources?q=（q を無視＝全件一覧へ落ちる）が残っていないこと
    expect(notices.every((i) => i.url.startsWith('/circulars/'))).toBe(true);
    expect(notices.some((i) => i.url.includes('/resources'))).toBe(false);
    // url の id と item.id（notice-<id>）が対応する
    expect(
      notices.every((i) => i.url === `/circulars/${i.id.replace(/^notice-/, '')}`),
    ).toBe(true);
  });

  it('深リンク先 id 集合が正本 mhlwNotices に解決する（幽霊URL 0）', async () => {
    const index = await buildSearchIndex();
    const { mhlwNotices } = await import('@/data/mhlw-notices');
    const canonical = new Set(mhlwNotices.map((n) => n.id));
    const linkedIds = index
      .filter((i) => i.category === 'notice')
      .map((i) => i.url.replace(/^\/circulars\//, ''));
    // 詳細 /circulars/[id] の generateStaticParams が解決する集合と一致＝soft404 ゼロ
    expect(linkedIds.every((id) => canonical.has(id))).toBe(true);
    expect(linkedIds.length).toBe(mhlwNotices.length);
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

describe('buildSearchIndex — 事故事例（accident）の収載', () => {
  it('正本 getAccidentCasesDataset と件数・ID集合が一致する（5/7ファイルだけ手import の欠落是正）', async () => {
    const { getAccidentCasesDataset } = await import('@/data/mock/accident-cases');
    const index = await buildSearchIndex();
    const accident = index.filter((i) => i.category === 'accident');

    // 正本のユニークID集合（detail ページ /accidents/[id] が解決する集合そのもの）。
    const datasetIds = new Set(getAccidentCasesDataset().map((c) => c.id));
    const indexIds = new Set(accident.map((i) => i.id.replace(/^accident-/, '')));
    expect(indexIds).toEqual(datasetIds);
  });

  it('各結果は一覧トップではなく個別詳細 /accidents/<id> へ深リンクする', async () => {
    const index = await buildSearchIndex();
    const accident = index.filter((i) => i.category === 'accident');
    expect(accident.length).toBeGreaterThan(0);
    expect(accident.every((i) => /^\/accidents\/.+/.test(i.url))).toBe(true);
    // 旧実装のバグ＝全件が裸の /accidents へリンク、を回帰で固定。
    expect(accident.some((i) => i.url === '/accidents')).toBe(false);
    // url の id と item.id が対応＝詳細ページが必ず解決する（幽霊URL なし）。
    expect(accident.every((i) => i.url === `/accidents/${i.id.replace(/^accident-/, '')}`)).toBe(true);
  });
});

// T1（診断書 05-search-egov.md）: /search・⌘K を cross-search エンジンへ載せ替えた後、
// 2 語クエリが目的条文へ収束することを本番インデックスで固定する。旧実装ではこれらが全滅していた。
describe('T1: 2語クエリが目的条文へ収束する（本番インデックス回帰）', () => {
  // 目的の条文（law カテゴリ・当該法令への深リンク）が上位 rank 位以内に出ることを検証。
  const CASES: { query: string; lawShort: string; artFragment: string; rank: number }[] = [
    { query: '石綿 事前調査', lawShort: '石綿則', artFragment: '第3条', rank: 3 },
    { query: 'クレーン 過負荷', lawShort: 'クレーン則', artFragment: '第23条', rank: 3 },
    { query: '足場 作業床', lawShort: '安衛則', artFragment: '第563条', rank: 3 },
    // T8 の意図（「就業制限」1位＝安衛法61条）も同エンジンで満たされることを併記。
    { query: '就業制限', lawShort: '安衛法', artFragment: '第61条', rank: 1 },
  ];

  it.each(CASES)('「$query」→ $lawShort $artFragment が $rank位以内・1件以上', async ({ query, lawShort, artFragment, rank }) => {
    const index = await buildSearchIndex();
    const results = searchItems(index, query, 'all', 10);
    expect(results.length).toBeGreaterThan(0);
    const top = results.slice(0, rank);
    const hit = top.find((r) => r.category === 'law' && r.title === `${lawShort} ${artFragment}`);
    expect(hit, `「${query}」上位${rank}件に ${lawShort} ${artFragment} が無い: ${top.map((r) => r.title).join(' / ')}`).toBeTruthy();
    // 目的条文へ深リンク（幽霊URL なし＝/law-search?law=&art=）
    expect(hit?.url).toContain('/law-search?law=');
    expect(hit?.url).toContain('&art=');
  });
});
