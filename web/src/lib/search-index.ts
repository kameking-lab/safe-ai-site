import { normalizeSearchText } from './fuzzy-search';

export type SearchCategory = 'notice' | 'chemical' | 'quiz' | 'education' | 'accident';

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
  quiz:      { label: '問題',    bgColor: 'bg-purple-100', textColor: 'text-purple-700' },
  education: { label: '教育',    bgColor: 'bg-green-100',  textColor: 'text-green-700' },
  accident:  { label: '事故',    bgColor: 'bg-red-100',    textColor: 'text-red-700' },
};

export function searchItems(
  items: SearchItem[],
  query: string,
  category: 'all' | SearchCategory,
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
    .slice(0, 10)
    .map(({ item }) => item);
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
    // 1,000 quiz questions across 10 certifications
    import('@/data/mock/quiz/cert-quiz').then(({ CERT_QUIZZES }) => {
      for (const quiz of CERT_QUIZZES) {
        for (const q of quiz.questions) {
          items.push({
            id: `quiz-${q.id}`,
            title: q.q.length > 80 ? q.q.slice(0, 80) + '…' : q.q,
            subtitle: `${quiz.shortName} / ${q.topic}`,
            category: 'quiz',
            url: `/exam-quiz?cert=${quiz.id}`,
          });
        }
      }
    }),

    // Accident cases (multiple files)
    Promise.all([
      import('@/data/mock/real-accident-cases'),
      import('@/data/mock/real-accident-cases-extra'),
      import('@/data/mock/real-accident-cases-extra2'),
      import('@/data/mock/real-accident-cases-extra3'),
      import('@/data/mock/real-accident-cases-diverse-industries'),
    ]).then((mods) => {
      const seen = new Set<string>();
      for (const mod of mods) {
        const cases = (mod as { realAccidentCases?: unknown[]; realAccidentCasesExtra?: unknown[]; realAccidentCasesExtra2?: unknown[]; realAccidentCasesExtra3?: unknown[]; realAccidentCasesDiverseIndustries?: unknown[] });
        const arr = (
          cases.realAccidentCases ??
          cases.realAccidentCasesExtra ??
          cases.realAccidentCasesExtra2 ??
          cases.realAccidentCasesExtra3 ??
          cases.realAccidentCasesDiverseIndustries ??
          []
        ) as Array<{ id: string; title: string; workCategory: string; type: string }>;
        for (const a of arr) {
          if (!seen.has(a.id)) {
            seen.add(a.id);
            items.push({
              id: `accident-${a.id}`,
              title: a.title,
              subtitle: `${a.workCategory} / ${a.type}`,
              category: 'accident',
              url: `/accidents`,
            });
          }
        }
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
  ]);

  cachedIndex = items;
  return items;
}
