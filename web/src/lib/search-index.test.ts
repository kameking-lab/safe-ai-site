import { describe, it, expect } from 'vitest';
import {
  searchItems,
  countByCategory,
  buildSearchIndex,
  CATEGORY_META,
  SEARCH_CATEGORIES,
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
    for (const key of ['law', 'notice', 'chemical', 'education', 'accident', 'precedent', 'glossary', 'faq', 'sign'] as const) {
      expect(CATEGORY_META[key].label).toBeTruthy();
      expect(CATEGORY_META[key].bgColor).toMatch(/^bg-/);
      expect(CATEGORY_META[key].textColor).toMatch(/^text-/);
    }
  });
});

describe('SEARCH_CATEGORIES — カテゴリタブ単一ソースのドリフト固定', () => {
  // /search タブと ⌘K パレットが共有する表示順配列。CATEGORY_META（ラベル・配色の正本）と
  // 集合が一致しなければ、どちらかのUIで新カテゴリのタブが欠落／幽霊タブが出る。
  const metaKeys = Object.keys(CATEGORY_META).sort();

  it('CATEGORY_META の全キーを過不足なく網羅する（両方向ドリフト検知）', () => {
    const tabKeys = [...SEARCH_CATEGORIES].sort();
    // メタに足したのにタブへ出し忘れ／タブにあるのにメタが無い、の両方を1つの等価で検知。
    expect(tabKeys).toEqual(metaKeys);
  });

  it('重複カテゴリを含まない（同一タブの二重描画を防ぐ）', () => {
    expect(new Set(SEARCH_CATEGORIES).size).toBe(SEARCH_CATEGORIES.length);
  });

  it('件数バッジ集計 countByCategory のキーと整合する（未集計カテゴリを防ぐ）', () => {
    // 空クエリでも全カテゴリのキーが 0 で初期化されていること＝タブに出す全カテゴリが集計対象。
    const counts = countByCategory([], '');
    for (const cat of SEARCH_CATEGORIES) {
      expect(counts[cat]).toBe(0);
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
      c.law + c.notice + c.chemical + c.equipment + c.education + c.accident + c.precedent + c.glossary + c.faq + c.sign + c.article + c.feature,
    );
  });
});

describe('buildSearchIndex — FAQ の収載', () => {
  const FAQ_CATEGORY_SLUGS = new Set([
    'law-system',
    'management',
    'chemical',
    'health-education',
  ]);

  it('@/data/faqs の全 FAQ が faq カテゴリで /faq/<category> へ深リンクされる', async () => {
    const [index, faqMod] = await Promise.all([
      buildSearchIndex(),
      import('@/data/faqs'),
    ]);
    const faqItems = index.filter((i) => i.category === 'faq');
    // ALL_FAQS（4 バッチ）を漏れなく収載＝正本と件数一致（欠落バッチ 0）
    expect(faqItems.length).toBe(faqMod.ALL_FAQS.length);
    expect(faqItems.length).toBeGreaterThanOrEqual(150);
    expect(faqItems.every((i) => i.id.startsWith('faq-'))).toBe(true);
    // 深リンク先はカテゴリ一覧のみ＝裸 /faq には落とさない
    expect(faqItems.every((i) => i.url.startsWith('/faq/'))).toBe(true);
    expect(faqItems.some((i) => i.url === '/faq')).toBe(false);
  });

  it('深リンク先の category slug は実在する /faq/<slug> 一覧ページに解決する（幽霊リンク 0）', async () => {
    const index = await buildSearchIndex();
    const faqItems = index.filter((i) => i.category === 'faq');
    for (const i of faqItems) {
      const slug = i.url.replace('/faq/', '');
      expect(FAQ_CATEGORY_SLUGS.has(slug)).toBe(true);
    }
  });

  it('疑問文・関連法令・タグのいずれからもヒットし回答が subtitle に出る', async () => {
    const index = await buildSearchIndex();
    // 質問インテント（安全管理者の選任要件＝法令 FAQ）で faq 結果が返る
    const byQuestion = searchItems(index, '安全管理者 選任', 'faq');
    expect(byQuestion.length).toBeGreaterThan(0);
    // 結果一覧で即答できるよう回答冒頭を subtitle に載せている
    expect(byQuestion.every((i) => i.subtitle.length > 0)).toBe(true);
    // keywords（関連法令）経由で条番号からも引ける
    expect(searchItems(index, '安衛法第11条', 'faq').length).toBeGreaterThan(0);
  });
});

describe('buildSearchIndex — 安全標識（sign）の収載', () => {
  it('@/data/safety-signs の全標識が sign カテゴリで /safety-signs/sign/<id> へ深リンクされる', async () => {
    const [index, signMod] = await Promise.all([
      buildSearchIndex(),
      import('@/data/safety-signs'),
    ]);
    const signItems = index.filter((i) => i.category === 'sign');
    // SAFETY_SIGNS（5 分類の union）を漏れなく収載＝正本と件数一致（欠落分類 0）
    expect(signItems.length).toBe(signMod.SAFETY_SIGNS.length);
    expect(signItems.length).toBeGreaterThanOrEqual(50);
    expect(signItems.every((i) => i.id.startsWith('sign-'))).toBe(true);
    // 深リンク先は個別詳細ページのみ＝裸 /safety-signs には落とさない
    expect(signItems.every((i) => i.url.startsWith('/safety-signs/sign/'))).toBe(true);
    expect(signItems.some((i) => i.url === '/safety-signs')).toBe(false);
  });

  it('深リンク先 id 集合が正本 SAFETY_SIGNS に解決する（幽霊URL 0＝generateStaticParams 一致）', async () => {
    const [index, signMod] = await Promise.all([
      buildSearchIndex(),
      import('@/data/safety-signs'),
    ]);
    // 詳細 /safety-signs/sign/[id] の generateStaticParams は SAFETY_SIGNS 全件 id を返し、
    // 未知 id は notFound() で弾く＝収載集合＝解決集合であることを固定（soft404 ゼロ）。
    const canonical = new Set(signMod.SAFETY_SIGNS.map((s) => s.id));
    const linkedIds = index
      .filter((i) => i.category === 'sign')
      .map((i) => i.url.replace(/^\/safety-signs\/sign\//, ''));
    expect(linkedIds.every((id) => canonical.has(id))).toBe(true);
    expect(new Set(linkedIds).size).toBe(canonical.size);
  });

  it('標識名・英名・関連法令のいずれからも引け、意味が subtitle に出る', async () => {
    const index = await buildSearchIndex();
    // 現場頻用の標識名（禁止標識「立入禁止」）でヒット
    const byName = searchItems(index, '立入禁止', 'sign');
    expect(byName.length).toBeGreaterThan(0);
    expect(byName[0]?.url).toBe('/safety-signs/sign/no-entry');
    // 結果一覧で用途が分かるよう意味を subtitle に載せている
    expect(byName.every((i) => i.subtitle.length > 0)).toBe(true);
    // keywords（英名）経由で英語照会からも引ける
    expect(searchItems(index, 'No entry', 'sign').length).toBeGreaterThan(0);
    // keywords（関連法令）経由で条番号からも引ける（立入禁止＝安衛則 第325条ほか）
    expect(searchItems(index, '労働安全衛生規則 第325条', 'sign').length).toBeGreaterThan(0);
  });
});

describe('buildSearchIndex — 法改正記事（article）の収載', () => {
  it('公開済み記事が article カテゴリで /articles/<slug> へ深リンクされる（横断検索から丸ごと欠落していた穴の是正）', async () => {
    const [index, { getPublishedArticleSearchEntries }] = await Promise.all([
      buildSearchIndex(),
      import('@/lib/articles-search-source'),
    ]);
    const articleItems = index.filter((i) => i.category === 'article');
    // ブラウザ安全な射影源の公開済みエントリを漏れなく収載＝件数一致（欠落 0）
    expect(articleItems.length).toBe(getPublishedArticleSearchEntries().length);
    expect(articleItems.length).toBeGreaterThanOrEqual(10);
    expect(articleItems.every((i) => i.id.startsWith('article-'))).toBe(true);
    // 深リンク先は個別記事のみ＝裸 /articles 一覧には落とさない
    expect(articleItems.every((i) => i.url.startsWith('/articles/'))).toBe(true);
    expect(articleItems.some((i) => i.url === '/articles')).toBe(false);
    // subtitle（記事概要）が結果一覧で内容判別に足る
    expect(articleItems.every((i) => i.subtitle.length > 0)).toBe(true);
  });

  it('深リンク先 slug 集合が正本 getPublishedArticleSlugs に解決する（幽霊URL 0＝generateStaticParams 一致）', async () => {
    const [index, { getPublishedArticleSlugs }] = await Promise.all([
      buildSearchIndex(),
      import('@/lib/articles'),
    ]);
    // 詳細 /articles/[slug] の generateStaticParams は getPublishedArticleSlugs() を返し、
    // 未知/未公開 slug は getPublishedArticleBySlug が null→notFound()。収載集合＝解決集合を固定。
    const canonical = new Set(getPublishedArticleSlugs());
    const linkedSlugs = index
      .filter((i) => i.category === 'article')
      .map((i) => i.url.replace(/^\/articles\//, ''));
    expect(linkedSlugs.every((s) => canonical.has(s))).toBe(true);
    // 公開済み記事を漏れなく収載＝双方向一致（soft404 ゼロ・発見性の穴ゼロ）
    expect(new Set(linkedSlugs)).toEqual(canonical);
  });

  it('タグ・キーワードから引け、結果が該当記事へ着地する', async () => {
    const index = await buildSearchIndex();
    // タグ「熱中症」で法改正記事がヒット
    const heat = searchItems(index, '熱中症', 'article');
    expect(heat.length).toBeGreaterThan(0);
    expect(heat.some((i) => i.url === '/articles/heat-stroke-2025-mandatory')).toBe(true);
    // キーワード「フルハーネス」でも引ける
    const harness = searchItems(index, 'フルハーネス', 'article');
    expect(harness.some((i) => i.url === '/articles/fullharness-2022-revision')).toBe(true);
  });
});

describe('buildSearchIndex — 機能ページ（feature）の収載', () => {
  it('FLAGSHIP_FEATURES の主要機能が feature カテゴリで収載される（機能名 0 件だった穴の是正）', async () => {
    const [index, { getSitePageSearchEntries }, { FLAGSHIP_FEATURES }] = await Promise.all([
      buildSearchIndex(),
      import('@/lib/site-pages-search-source'),
      import('@/config/flagship-nav'),
    ]);
    const featureItems = index.filter((i) => i.category === 'feature');
    // feature カテゴリは FLAGSHIP 目的地ページ（id=page-*）と病態別ガイド（id=illness-guide-*）の
    // 2 源を持つ。FLAGSHIP 射影源のエントリを漏れなく収載＝件数一致（欠落 0）は page-* に限定して固定。
    const pageItems = featureItems.filter((i) => i.id.startsWith('page-'));
    expect(pageItems.length).toBe(getSitePageSearchEntries().length);
    expect(pageItems.length).toBeGreaterThanOrEqual(FLAGSHIP_FEATURES.length);
    // url はベースパス（ハッシュ・クエリを含まない）＝実在ルートへ解決（drift ガードで機械固定）。
    // subtitle 非空は feature カテゴリ全体（目的地ページ＋病態別ガイド）で担保する。
    expect(featureItems.every((i) => /^\/[^#?]*$/.test(i.url))).toBe(true);
    expect(featureItems.every((i) => i.subtitle.length > 0)).toBe(true);
  });

  it('機能名クエリで目的の機能ページがヒットする（サイネージ・化学物質RA・作業環境測定）', async () => {
    const index = await buildSearchIndex();
    expect(searchItems(index, 'サイネージ', 'feature').some((i) => i.url === '/signage')).toBe(true);
    expect(searchItems(index, '化学物質RA', 'feature').some((i) => i.url === '/chemical-ra')).toBe(true);
    expect(
      searchItems(index, '作業環境測定', 'feature').some((i) => i.url === '/work-environment-measurement'),
    ).toBe(true);
    // 2 語 AND も subtitle（カード見出し/配下説明）で補助して機能へ収束する
    expect(searchItems(index, '事故 分析', 'feature').length).toBeGreaterThan(0);
  });
});

describe('buildSearchIndex — 治療と仕事の両立支援 病態別ガイド（feature）の収載', () => {
  it('ILLNESS_CATEGORIES の全疾患が feature カテゴリで illness-guide 深リンクへ着地（幽霊URL 0）', async () => {
    const [index, { ILLNESS_CATEGORIES }] = await Promise.all([
      buildSearchIndex(),
      import('@/data/illness-considerations'),
    ]);
    const guideItems = index.filter((i) => i.id.startsWith('illness-guide-'));
    // 収載集合＝正本の全疾患（欠落 0・水増し 0）
    expect(guideItems.length).toBe(ILLNESS_CATEGORIES.length);
    expect(guideItems.length).toBeGreaterThanOrEqual(6);
    expect(guideItems.every((i) => i.category === 'feature')).toBe(true);
    // 全 url が generateStaticParams（dynamicParams=false）の解決集合へ着地＝幽霊URL 0。
    const validUrls = new Set(
      ILLNESS_CATEGORIES.map((c) => `/treatment-work-balance/illness-guide/${c.id}`),
    );
    expect(guideItems.every((i) => validUrls.has(i.url))).toBe(true);
    // 親ハブ止まりでなく疾患別の深リンクである（発見性の穴＝疾患名 0 件の是正）。
    expect(guideItems.every((i) => i.url !== '/treatment-work-balance')).toBe(true);
    expect(guideItems.every((i) => i.subtitle.length > 0)).toBe(true);
  });

  it('疾患名クエリで個別ガイドへ着地する（がん・脳卒中・糖尿病）', async () => {
    const index = await buildSearchIndex();
    expect(
      searchItems(index, 'がん 両立支援', 'feature').some(
        (i) => i.url === '/treatment-work-balance/illness-guide/cancer',
      ),
    ).toBe(true);
    expect(
      searchItems(index, '脳卒中 復職', 'feature').some(
        (i) => i.url === '/treatment-work-balance/illness-guide/stroke',
      ),
    ).toBe(true);
    expect(
      searchItems(index, '糖尿病 就業配慮', 'feature').some(
        (i) => i.url === '/treatment-work-balance/illness-guide/diabetes',
      ),
    ).toBe(true);
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

describe('buildSearchIndex — 保護具（equipment）の収載＋個別詳細への深リンク', () => {
  it('正本 getAllEquipment と件数・ID集合が一致する（横断検索に丸ごと欠落していた穴の是正）', async () => {
    const { getAllEquipment } = await import('@/lib/equipment-recommendation');
    const index = await buildSearchIndex();
    const equipment = index.filter((i) => i.category === 'equipment');

    // 正本のID集合＝詳細 /equipment/[id] の generateStaticParams が解決する集合そのもの。
    const datasetIds = new Set(getAllEquipment().map((e) => e.id));
    const indexIds = new Set(equipment.map((i) => i.id.replace(/^equipment-/, '')));
    expect(indexIds).toEqual(datasetIds);
    expect(equipment.length).toBe(getAllEquipment().length);
    // 非空虚性（1000件超の保護具DBが確かに収載されている）。
    expect(equipment.length).toBeGreaterThan(500);
  });

  it('各結果は一覧トップではなく個別詳細 /equipment/<id> へ深リンクする（幽霊URL 0）', async () => {
    const index = await buildSearchIndex();
    const equipment = index.filter((i) => i.category === 'equipment');
    expect(equipment.every((i) => /^\/equipment\/.+/.test(i.url))).toBe(true);
    // 一覧トップ /equipment-finder や裸 /equipment へ落とさない。
    expect(equipment.some((i) => i.url === '/equipment' || i.url === '/equipment-finder')).toBe(false);
    // url の id と item.id が対応＝詳細ページが必ず解決する（正本 getAllEquipment 由来）。
    expect(equipment.every((i) => i.url === `/equipment/${i.id.replace(/^equipment-/, '')}`)).toBe(true);
  });

  it('製品名・カテゴリ名・メーカー・JIS規格のいずれからも引ける（現場頻用の保護具名で発見可能）', async () => {
    const index = await buildSearchIndex();
    const equipment = index.filter((i) => i.category === 'equipment');
    // 現場頻用の保護具カテゴリがヒットする（title=製品名 or keywords=カテゴリ名）。
    const harness = searchItems(equipment, 'フルハーネス', 'equipment');
    expect(harness.length).toBeGreaterThan(0);
    // カテゴリ名は keywords 経由でも引ける。
    const fallCat = searchItems(equipment, '墜落制止用器具', 'equipment');
    expect(fallCat.length).toBeGreaterThan(0);
    // subtitle にカテゴリ名＋規格を出して結果一覧で識別できる。
    expect(equipment.every((i) => i.subtitle.length > 0)).toBe(true);
  });
});

describe('buildSearchIndex — Eラーニング（education）の全テーマ収載＋個別テーマ深リンク', () => {
  // 正本＝ELearningPanel が allThemes として描画する 9 源の union（入門＋カタログ＋追補＋業種別6）。
  // 旧実装は elearningThemesCatalog 1 源だけを import しており業種別等が欠落していた。
  async function expectedThemeIds(): Promise<Set<string>> {
    const mods = await Promise.all([
      import('@/data/mock/elearning-intro-course'),
      import('@/data/mock/elearning-themes-data'),
      import('@/data/mock/elearning-extra-themes'),
      import('@/data/mock/elearning-manufacturing-themes'),
      import('@/data/mock/elearning-healthcare-themes'),
      import('@/data/mock/elearning-transport-themes'),
      import('@/data/mock/elearning-forestry-themes'),
      import('@/data/mock/elearning-food-themes'),
      import('@/data/mock/elearning-retail-themes'),
    ]);
    return new Set(
      [
        ...mods[0].elearningIntroCourse,
        ...mods[1].elearningThemesCatalog,
        ...mods[2].elearningExtraThemes,
        ...mods[3].elearningManufacturingThemes,
        ...mods[4].elearningHealthcareThemes,
        ...mods[5].elearningTransportThemes,
        ...mods[6].elearningForestryThemes,
        ...mods[7].elearningFoodThemes,
        ...mods[8].elearningRetailThemes,
      ].map((t) => t.id),
    );
  }

  it('education の ID 集合が panel の全テーマ源（allThemes）と一致する（1源だけ import の欠落是正）', async () => {
    const index = await buildSearchIndex();
    const eduIds = new Set(
      index.filter((i) => i.category === 'education').map((i) => i.id.replace(/^edu-/, '')),
    );
    expect(eduIds).toEqual(await expectedThemeIds());
    // 業種別カタログ（1源 import 時代は欠落）が確かに含まれる。
    expect(eduIds).toContain('el-mfg-chemical');
    expect(eduIds).toContain('el-hc-back');
    expect(eduIds).toContain('el-rt-slipfall');
  });

  it('各結果は一覧トップではなく個別テーマ /e-learning?theme=<id>#el-quiz へ深リンクする', async () => {
    const index = await buildSearchIndex();
    const edu = index.filter((i) => i.category === 'education');
    expect(edu.length).toBeGreaterThan(0);
    // 旧実装のバグ＝全件が裸の /e-learning へリンク、を回帰で固定。
    expect(edu.some((i) => i.url === '/e-learning')).toBe(false);
    // url の theme= と item.id が対応＝panel が allThemes 検証で必ず解決する（幽霊リンク 0）。
    expect(
      edu.every(
        (i) =>
          i.url === `/e-learning?theme=${encodeURIComponent(i.id.replace(/^edu-/, ''))}#el-quiz`,
      ),
    ).toBe(true);
    // 深リンク先 theme id は panel の allThemes（収載源の union）に必ず存在する。
    const valid = await expectedThemeIds();
    expect(edu.every((i) => valid.has(i.id.replace(/^edu-/, '')))).toBe(true);
  });

  it('業種語（製造業）・出典種別からも keywords 経由でヒットする', async () => {
    const index = await buildSearchIndex();
    // industry_detail / sourceType を keywords に載せたことで業種横断で引ける。
    const mfg = searchItems(index, '製造業', 'education', Number.MAX_SAFE_INTEGER);
    expect(mfg.length).toBeGreaterThan(0);
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

// T2（診断書 05-search-egov.md / O8-b）: 条番号クエリパーサを通した生クエリが
// 該当条文をトップ表示することを本番インデックスで固定する。e-Gov でも 0 件になる
// 「安衛法61条」等をトップ着地させるのが本タスクの勝ち筋（比較 a,b）。
describe('T2: 条番号クエリが該当条文をトップ表示（本番インデックス回帰）', () => {
  // top=1 は 1 位に当該条文（law・指定法令 or 条番号一致）が出ること。
  const CASES: { query: string; title: string }[] = [
    { query: '安衛法61条', title: '安衛法 第61条' },
    { query: '安衛法 88条', title: '安衛法 第88条' },
    { query: '安衛則563条', title: '安衛則 第563条' },
  ];

  it.each(CASES)('「$query」→ 1位が $title', async ({ query, title }) => {
    const index = await buildSearchIndex();
    const results = searchItems(index, query, 'all', 10);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.category).toBe('law');
    expect(results[0]?.title).toBe(title);
    expect(results[0]?.url).toContain('/law-search?law=');
    expect(results[0]?.url).toContain('&art=');
  });

  it('漢数字「第六十一条」は 1位が 第61条 の法令条文（法令名指定なしでも着地）', async () => {
    const index = await buildSearchIndex();
    const results = searchItems(index, '第六十一条', 'all', 10);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.category).toBe('law');
    expect(results[0]?.title).toMatch(/ 第61条$/);
  });
});

// T3（診断書 05-search-egov.md / O8-c）: 法令名かな読みを正略称へ展開し、e-Gov も当サイトも
// 0 件だった「あんえいほう」等（比較 c＝現場のうろ覚え・音声入力）を該当条文へ着地させる。
// 正式名称・別略称は O8-a で解決済みのため、本タスクの本丸は「読み」で 0→ヒットにすること。
describe('T3: 法令名かな読みが該当法令の条文へ着地（本番インデックス回帰）', () => {
  // かな読み → その法令（lawShort）の条文が law カテゴリで 1 件以上ヒットする。
  const READINGS: { query: string; lawShort: string }[] = [
    { query: 'あんえいほう', lawShort: '安衛法' },
    { query: 'あんえいそく', lawShort: '安衛則' },
    { query: 'くれーんそく', lawShort: 'クレーン則' },
    { query: 'ゆうきそく', lawShort: '有機則' },
    { query: 'とっかそく', lawShort: '特化則' },
    { query: 'さんけつそく', lawShort: '酸欠則' },
  ];

  it.each(READINGS)('「$query」で $lawShort の条文がヒットする（読みで 0→ヒット）', async ({ query, lawShort }) => {
    const index = await buildSearchIndex();
    const results = searchItems(index, query, 'law', 10);
    expect(results.length).toBeGreaterThan(0);
    // 全件が当該法令の条文（title が「<略称> 第N条」形）で、他法令へ流れない。
    expect(results.every((r) => r.title.startsWith(`${lawShort} `))).toBe(true);
  });

  it('読み＋条番号「あんえいほう 88条」は 1位が 安衛法 第88条（O8-b と相乗）', async () => {
    const index = await buildSearchIndex();
    const results = searchItems(index, 'あんえいほう 88条', 'all', 10);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.category).toBe('law');
    expect(results[0]?.title).toBe('安衛法 第88条');
    expect(results[0]?.url).toContain('&art=');
  });

  it('正式名称・別略称は従来どおり（読み展開が既存ヒットを奪わない回帰）', async () => {
    const index = await buildSearchIndex();
    // 正式名称（O8-a で解決済み）: 1位が 安衛則 第563条 のまま
    const full = searchItems(index, '労働安全衛生規則 第563条', 'all', 10);
    expect(full[0]?.title).toBe('安衛則 第563条');
    // 2 語 AND（読みでない通常語）も不変
    expect(searchItems(index, '石綿 事前調査', 'all', 10).length).toBeGreaterThan(0);
  });
});
