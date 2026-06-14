import { normalizeSearchText } from './fuzzy-search';

export type SearchCategory = 'notice' | 'chemical' | 'education' | 'accident' | 'precedent' | 'glossary';

export interface SearchItem {
  id: string;
  title: string;
  subtitle: string;
  category: SearchCategory;
  url: string;
}

export const CATEGORY_META: Record<
  SearchCategory,
  { label: string; bgColor: string; textColor: string }
> = {
  notice:    { label: '通達',    bgColor: 'bg-blue-100',   textColor: 'text-blue-700' },
  chemical:  { label: '化学物質', bgColor: 'bg-orange-100', textColor: 'text-orange-700' },
  education: { label: '教育',    bgColor: 'bg-green-100',  textColor: 'text-green-700' },
  accident:  { label: '事故',    bgColor: 'bg-red-100',    textColor: 'text-red-700' },
  precedent: { label: '判例',    bgColor: 'bg-emerald-100', textColor: 'text-emerald-700' },
  glossary:  { label: '用語',    bgColor: 'bg-indigo-100', textColor: 'text-indigo-700' },
};

/**
 * インデックスをクエリで絞り込みスコア順に返す。
 * @param limit 返却上限。コマンドパレット(⌘K)は既定10、/search 結果ページは全件表示のため大きめを渡す。
 */
export function searchItems(
  items: SearchItem[],
  query: string,
  category: 'all' | SearchCategory,
  limit = 10,
): SearchItem[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const nq = normalizeSearchText(trimmed);
  const pool = category === 'all' ? items : items.filter((i) => i.category === category);

  return pool
    .map((item) => {
      const nt = normalizeSearchText(item.title);
      const ns = normalizeSearchText(item.subtitle);
      let score = 0;
      if (nt === nq) score = 100;
      else if (nt.startsWith(nq)) score = 80;
      else if (nt.includes(nq)) score = 60;
      else if (ns.includes(nq)) score = 30;
      return { item, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item }) => item);
}

/** カテゴリ別に件数を集計する（/search 結果ページのタブ件数バッジ用）。 */
export function countByCategory(
  items: SearchItem[],
  query: string,
): Record<'all' | SearchCategory, number> {
  const counts: Record<'all' | SearchCategory, number> = {
    all: 0, notice: 0, chemical: 0, education: 0, accident: 0, precedent: 0, glossary: 0,
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
    // 労災・労働判例（争点・分野で横断検索できるよう全件をインデックス化）
    import('@/data/court-cases').then(({ COURT_CASES }) => {
      for (const c of COURT_CASES) {
        items.push({
          id: `precedent-${c.id}`,
          title: c.name,
          subtitle: `${c.court}　${c.dateLabelJa}　${c.oneLine}`,
          category: 'precedent',
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
            url: `/chemical-database?q=${encodeURIComponent(e.name)}`,
          });
        }
      }
    }),

    // 1,158 MHLW notices
    import('@/data/mhlw-notices').then(({ mhlwNotices }) => {
      for (const n of mhlwNotices) {
        items.push({
          id: `notice-${n.id}`,
          title: n.title,
          subtitle: `${n.noticeNumber ?? n.docType} ${n.issuedDateRaw ?? ''}`.trim(),
          category: 'notice',
          url: `/resources?q=${encodeURIComponent(n.title.slice(0, 50))}`,
        });
      }
    }),

    // Education themes
    import('@/data/mock/elearning-themes-data').then(({ elearningThemesCatalog }) => {
      for (const theme of elearningThemesCatalog) {
        items.push({
          id: `edu-${theme.id}`,
          title: theme.title,
          subtitle: theme.description.slice(0, 60),
          category: 'education',
          url: `/e-learning`,
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
          url: `/glossary`,
        });
      }
    }),
  ]);

  cachedIndex = items;
  return items;
}
