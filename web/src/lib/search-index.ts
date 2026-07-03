import { searchCrossIndex, normalizeArticleQuery, expandLawAliases } from './cross-search';

export type SearchCategory = 'law' | 'notice' | 'chemical' | 'education' | 'accident' | 'precedent' | 'glossary' | 'faq';

export interface SearchItem {
  id: string;
  title: string;
  subtitle: string;
  category: SearchCategory;
  url: string;
  /**
   * 追加のマッチ用キーワード（title/subtitle に出ない別名・分類ラベル・関連語）。
   * 複数語 AND クエリ「石綿 事前調査」「クレーン 過負荷」を条文へ収束させるために使う。
   */
  keywords?: string[];
}

/**
 * 同点時のカテゴリ優先度（先頭ほど上位）。目的条文・教育導線を上位に寄せる。
 * cross-search の searchCrossIndex に渡す（このリストに無いカテゴリは末尾扱い）。
 */
const SEARCH_CATEGORY_PRIORITY: readonly SearchCategory[] = [
  'law',
  'education',
  // FAQ は高意図の疑問（「衛生管理者は何人？」「SDS交付は義務？」）へ即答を返すため、
  // 同点時は判例・通達より上位に寄せる（条文・教育の次点）。
  'faq',
  'precedent',
  'notice',
  'glossary',
  'chemical',
  'accident',
];

export const CATEGORY_META: Record<
  SearchCategory,
  { label: string; bgColor: string; textColor: string }
> = {
  law:       { label: '法令',    bgColor: 'bg-teal-100',   textColor: 'text-teal-700' },
  notice:    { label: '通達',    bgColor: 'bg-blue-100',   textColor: 'text-blue-700' },
  chemical:  { label: '化学物質', bgColor: 'bg-orange-100', textColor: 'text-orange-700' },
  education: { label: '教育',    bgColor: 'bg-green-100',  textColor: 'text-green-700' },
  accident:  { label: '事故',    bgColor: 'bg-red-100',    textColor: 'text-red-700' },
  precedent: { label: '判例',    bgColor: 'bg-emerald-100', textColor: 'text-emerald-700' },
  glossary:  { label: '用語',    bgColor: 'bg-indigo-100', textColor: 'text-indigo-700' },
  faq:       { label: 'FAQ',     bgColor: 'bg-sky-100',    textColor: 'text-sky-700' },
};

/**
 * インデックスをクエリで絞り込みスコア順に返す。
 *
 * マッチ規約は cross-search エンジン（{@link searchCrossIndex}）に一本化している:
 * 空白区切りの各語を AND で扱い（全語がどこかに当たった項目のみ採用）、シノニム展開
 * （アスベスト→石綿則 等）と keywords 重み付けを行う。これにより「石綿 事前調査」
 * 「クレーン 過負荷」「足場 作業床」のような 2 語クエリが目的条文へ収束する
 * （従来はクエリ全体を 1 つの部分文字列として扱い、2 語クエリが全滅していた）。
 *
 * さらに条番号クエリ（{@link normalizeArticleQuery}）を前処理で正規化し、地続きの
 * 「安衛法61条」を「安衛法 第61条」へ、漢数字「第六十一条」を「第61条」へ、枝番
 * 「61-2条」を「第61条の2」へ書き換えてから AND エンジンへ渡す。これにより e-Gov でも
 * 0 件になる生クエリが該当条文をトップ表示できる（診断書 05-search-egov.md 比較 a,b）。
 *
 * 加えて法令名のかな読み・別表記（{@link expandLawAliases}）を正略称へ展開する＝条番号
 * 分解の後段で「あんえいほう 第88条」→「安衛法 第88条」へ、「じんぱいほう」→「じん肺法」へ。
 * かな読みはインデックスにもコンテンツにも現れず 0 件だった取り逃し（比較 c）を、既存ヒットを
 * 一切奪わずに拾う（正式名称・別略称は O8-a で解決済みのため対象外）。
 *
 * @param limit 返却上限。コマンドパレット(⌘K)は既定10、/search 結果ページは全件表示のため大きめを渡す。
 */
export function searchItems(
  items: SearchItem[],
  query: string,
  category: 'all' | SearchCategory,
  limit = 10,
): SearchItem[] {
  return searchCrossIndex(items, expandLawAliases(normalizeArticleQuery(query)), {
    category,
    limit,
    categoryPriority: SEARCH_CATEGORY_PRIORITY,
  });
}

/** カテゴリ別に件数を集計する（/search 結果ページのタブ件数バッジ用）。 */
export function countByCategory(
  items: SearchItem[],
  query: string,
): Record<'all' | SearchCategory, number> {
  const counts: Record<'all' | SearchCategory, number> = {
    all: 0, law: 0, notice: 0, chemical: 0, education: 0, accident: 0, precedent: 0, glossary: 0, faq: 0,
  };
  if (!query.trim()) return counts;
  // 上限なしで全件マッチを採り、カテゴリ別に集計する。
  const all = searchItems(items, query, 'all', Number.MAX_SAFE_INTEGER);
  counts.all = all.length;
  for (const item of all) counts[item.category] += 1;
  return counts;
}

// Module-level cache — built once, reused on every keystroke
let cachedIndex: SearchItem[] | null = null;

interface CompactEntry {
  name: string;
  cas: string;
  category: string;
  categoryLabel: string;
}

export async function buildSearchIndex(): Promise<SearchItem[]> {
  if (cachedIndex) return cachedIndex;

  const items: SearchItem[] = [];

  await Promise.allSettled([
    // 法令・規則・指針の条文（curated 中核＝最高意図クエリ「安衛則 第○条」「足場 規則」を
    // 横断検索／⌘K から直接引けるよう収載）。これまで法令本文は 0 件ヒットで、検索手段は
    // 専用ページ /law-search のみだった。各結果は /law-search?law=&art= で当該条文へ深リンク。
    // 厚労省PDF抽出の補完ソース（mhlwLawArticles）は law 値が文書バンドル名で条文単位の
    // 深リンク UX に合わないため除外する（law/index.ts の LAW_SOURCE_COUNT と同じ方針）。
    import('@/data/laws').then(({ allLawArticles, mhlwLawArticles }) => {
      const mhlwSet = new Set<unknown>(mhlwLawArticles);
      const seen = new Set<string>();
      for (const a of allLawArticles) {
        if (mhlwSet.has(a)) continue;
        const key = `${a.law}|${a.articleNum}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const heading = [a.articleTitle, a.text]
          .map((s) => (s ?? '').trim())
          .filter(Boolean)
          .join('　');
        items.push({
          id: `law-${key}`,
          title: a.articleNum ? `${a.lawShort} ${a.articleNum}` : a.lawShort,
          subtitle: `${a.law}　${heading}`.slice(0, 90),
          category: 'law',
          // 略称・正式名称・条番号・見出し・条文キーワードのいずれの語でも AND マッチさせる
          // （例: 「石綿 事前調査」「クレーン 過負荷」「足場 作業床」が目的条文へ収束）。
          keywords: [...a.keywords, a.articleTitle, a.law, a.lawShort, a.articleNum].filter(Boolean),
          url: a.articleNum
            ? `/law-search?law=${encodeURIComponent(a.law)}&art=${encodeURIComponent(a.articleNum)}`
            : `/law-search?law=${encodeURIComponent(a.law)}`,
        });
      }
    }),
    // 労災・労働判例（争点・分野で横断検索できるよう全件をインデックス化）
    import('@/data/court-cases').then(({ COURT_CASES }) => {
      for (const c of COURT_CASES) {
        items.push({
          id: `precedent-${c.id}`,
          title: c.name,
          subtitle: `${c.court}　${c.dateLabelJa}　${c.oneLine}`,
          category: 'precedent',
          keywords: [c.field, ...c.issues, c.court],
          url: `/court-cases/${c.id}`,
        });
      }
    }),
    // 事故事例（労働災害DB）。正本 getAccidentCasesDataset() を単一ソースに使う。
    // 旧実装は 7 データファイル中 5 つだけを手で import しており、2024-2026 確定事例と
    // 速報事例の 2 ファイルが横断検索から欠落していた（近年の事故が引けない発見性の穴）。
    // さらに全件が一覧トップ /accidents へリンクし、検索した個別事故へ到達できなかった。
    // 正本＝/accidents/[id] が findAccident() で解決する集合そのものなので、
    // ここから引けば「検索結果→詳細ページ」が必ず解決し（幽霊URL 0）、データ追加にも追従する。
    import('@/data/mock/accident-cases').then(({ getAccidentCasesDataset }) => {
      const seen = new Set<string>();
      for (const a of getAccidentCasesDataset()) {
        if (seen.has(a.id)) continue;
        seen.add(a.id);
        items.push({
          id: `accident-${a.id}`,
          title: a.title,
          subtitle: `${a.workCategory} / ${a.type} / ${a.severity}（${a.occurredOn}）`,
          category: 'accident',
          keywords: [a.workCategory, a.type, a.severity, a.industry_detail ?? ''].filter(Boolean),
          url: `/accidents/${a.id}`,
        });
      }
    }),

    // 50 mock chemical substances with full detail
    import('@/data/mock/chemical-substances-db').then(({ chemicalSubstances }) => {
      for (const c of chemicalSubstances) {
        items.push({
          id: `chem-mock-${c.id}`,
          title: c.name,
          subtitle: `CAS ${c.cas}${c.name_en ? ` / ${c.name_en}` : ''}`,
          category: 'chemical',
          keywords: [c.cas, c.name_en ?? ''].filter(Boolean),
          url: `/chemical-database?q=${encodeURIComponent(c.name)}`,
        });
      }
    }),

    // ~919 MHLW chemical substances from compact index
    import('@/data/chemicals-mhlw/compact.json').then((mod) => {
      const data = mod as unknown as { entries?: CompactEntry[]; default?: { entries?: CompactEntry[] } };
      const entries: CompactEntry[] = data.entries ?? data.default?.entries ?? [];
      const seen = new Set<string>();
      for (const e of entries) {
        if (e.name && !seen.has(e.name)) {
          seen.add(e.name);
          items.push({
            id: `chem-mhlw-${e.cas}-${e.category}`,
            title: e.name,
            subtitle: `CAS ${e.cas} / ${e.categoryLabel}`,
            category: 'chemical',
            keywords: [e.cas, e.categoryLabel].filter(Boolean),
            url: `/chemical-database?q=${encodeURIComponent(e.name)}`,
          });
        }
      }
    }),

    // MHLW 通達/告示/指針（正本 mhlwNotices）。詳細 /circulars/[id] は
    // generateStaticParams が mhlwNotices 全件の id を解決するため、検索結果から
    // 個別通達へ深リンクできる（旧 /resources?q= は q を無視＝全件一覧へ落ちていた）。
    import('@/data/mhlw-notices').then(({ mhlwNotices }) => {
      for (const n of mhlwNotices) {
        items.push({
          id: `notice-${n.id}`,
          title: n.title,
          subtitle: `${n.noticeNumber ?? n.docType} ${n.issuedDateRaw ?? ''}`.trim(),
          category: 'notice',
          keywords: [n.docType, n.noticeNumber ?? '', n.category, n.issuer ?? ''].filter(Boolean),
          url: `/circulars/${n.id}`,
        });
      }
    }),

    // Eラーニング テーマ。正本＝ELearningPanel が `allThemes` として実際に描画する
    // 全テーマ源（入門コース＋汎用カタログ＋追補＋業種別6分野）を単一ソースにする。
    // 旧実装は 9 源のうち elearningThemesCatalog 1 つだけを import しており、業種別
    // （製造/医療福祉/運輸/林業/食品/小売）・入門・追補テーマが横断検索から丸ごと
    // 欠落していた（近年追加分が引けない発見性の穴＝#561 の accident と同型）。さらに
    // 全件が一覧トップ /e-learning へリンクし、検索したテーマへ到達できなかった。
    // url は panel が受け取る深リンク `/e-learning?theme=<id>#el-quiz`（panel 側で
    // allThemes に対し id 検証済み＝収載源が allThemes と一致するため必ず解決。未知idは
    // panel が無視して先頭テーマ表示＝幽霊リンク 0）。theme.id をキーに重複除去する。
    Promise.all([
      import('@/data/mock/elearning-intro-course'),
      import('@/data/mock/elearning-themes-data'),
      import('@/data/mock/elearning-extra-themes'),
      import('@/data/mock/elearning-manufacturing-themes'),
      import('@/data/mock/elearning-healthcare-themes'),
      import('@/data/mock/elearning-transport-themes'),
      import('@/data/mock/elearning-forestry-themes'),
      import('@/data/mock/elearning-food-themes'),
      import('@/data/mock/elearning-retail-themes'),
    ]).then((mods) => {
      const themes = [
        ...mods[0].elearningIntroCourse,
        ...mods[1].elearningThemesCatalog,
        ...mods[2].elearningExtraThemes,
        ...mods[3].elearningManufacturingThemes,
        ...mods[4].elearningHealthcareThemes,
        ...mods[5].elearningTransportThemes,
        ...mods[6].elearningForestryThemes,
        ...mods[7].elearningFoodThemes,
        ...mods[8].elearningRetailThemes,
      ];
      const seen = new Set<string>();
      for (const theme of themes) {
        if (seen.has(theme.id)) continue;
        seen.add(theme.id);
        items.push({
          id: `edu-${theme.id}`,
          title: theme.title,
          subtitle: theme.description.slice(0, 60),
          category: 'education',
          // 業種・出典種別・レベルからも引けるよう keywords に補う（例「製造業 化学」）。
          keywords: [theme.sourceType, theme.level, theme.industry_detail ?? ''].filter(Boolean),
          url: `/e-learning?theme=${encodeURIComponent(theme.id)}#el-quiz`,
        });
      }
    }),

    // 用語集（@/data/glossary の 4 バッチ＝高意図の「○○とは」語を横断検索へ収載）。
    // ※ /glossary 本体に直書きされた基礎語は当班所有外のため対象外。読み・定義冒頭も
    //   subtitle に載せ、読み（かな）や定義語からのヒットと結果一覧での即答を可能にする。
    import('@/data/glossary').then(({ EXTRA_TERMS }) => {
      for (const t of EXTRA_TERMS) {
        items.push({
          id: `glossary-${t.term}`,
          title: t.term,
          subtitle: `${t.reading}　${t.definition.slice(0, 60)}`,
          category: 'glossary',
          keywords: [t.reading].filter(Boolean),
          url: `/glossary`,
        });
      }
    }),

    // FAQ（@/data/faqs の 4 バッチ＝高意図の疑問文クエリ「衛生管理者 何人」「SDS 交付 義務」
    // 「特別教育 オンライン」等を横断検索へ収載）。これまで FAQ 200問は /faq/[category] に
    // しか無く ⌘K・/search から 0 件で、用語(glossary=「○○とは」)とも別軸の質問インテント
    // が丸ごと欠落していた。各結果は回答冒頭を subtitle に載せ検索結果一覧で即答し、リンクは
    // カテゴリ一覧 /faq/<category>（sitemap 収載・自己canonical の実在ページ）へ寄せる＝
    // faq.category は law-system/management/chemical/health-education のいずれかで必ず解決
    // （幽霊リンク 0）。keywords に tags・関連法令を補い分類語・条番号からも引ける。
    // 個別 FAQ への深リンク（/faq/<category>#<id>）は FAQItem にアンカー＋hashオープンが要る＝
    // /faq ページ本文所有の UI 班マター（要・他班）のため今回はカテゴリ一覧へ寄せる（glossary と同方針）。
    import('@/data/faqs').then(({ ALL_FAQS }) => {
      for (const f of ALL_FAQS) {
        items.push({
          id: `faq-${f.id}`,
          // 質問文の頭に「Q. 」を付す（FAQ 結果である旨の慣用表記）。表示上の意味に加えて
          // ランキング上の意味も持つ＝概念名で始まる質問（例「就業制限（安衛法第61条）は…」）が
          // タイトル前方一致(65点)で当該条文のキーワード完全一致(55点＝articleTitle=就業制限)を
          // 上回り、bare な法令概念クエリの1位を FAQ が奪う退行（O8-a/T8 の locked 不変条件
          // 「就業制限」1位=安衛法61条）を防ぐ。頭に「Q. 」が入ると概念名は前方一致(65)ではなく
          // 部分一致(45)になり、権威ある条文本文が上位を保つ（FAQ は下位で引き続き発見可能）。
          title: `Q. ${f.question}`,
          subtitle: f.answer.slice(0, 80),
          category: 'faq',
          keywords: [...(f.tags ?? []), ...(f.relatedLaws ?? [])].filter(Boolean),
          url: `/faq/${f.category}`,
        });
      }
    }),
  ]);

  cachedIndex = items;
  return items;
}
