/**
 * 横断検索インデックスの構築（柱C-2-1）。
 *
 * 条文・通達・判例・標識・主要機能・教育資格DB・化学物質・事故事例を 1 本の
 * CrossSearchItem[] に集約する。重い純データを動的 import で並列ロードし、初回のみ
 * 構築してモジュールキャッシュに保持（キー入力ごとの再構築を避ける）。
 *
 * URL は実在ルートのみを指す（幽霊URL禁止）:
 *  - 条文 → /law-search?q=…（LawSearchPanel が q を読む）
 *  - 通達 → /resources?q=…
 *  - 判例 → /court-cases/[id]
 *  - 標識 → /safety-signs/sign/[id]
 *  - 機能 → feature.href（カタログの実ページ）
 *  - 教育資格 → /education-certification#sec-…（区分アンカー）
 *  - 化学物質 → /chemical-database?q=…
 *  - 事故 → /accidents
 */
import type { CrossSearchItem } from './types';

const CERT_TYPE_LABEL = {
  special_education: '特別教育',
  skill_training: '技能講習',
  job_chief: '職長教育',
  license: '免許',
} as const;

const CERT_TYPE_ANCHOR = {
  special_education: 'sec-special',
  skill_training: 'sec-skill',
  job_chief: 'sec-chief',
  license: 'sec-license',
} as const;

interface CompactChemicalEntry {
  name: string;
  cas: string;
  category: string;
  categoryLabel: string;
}

let cachedIndex: CrossSearchItem[] | null = null;

/**
 * テスト用にキャッシュを破棄。本番フローでは使わない。
 * @internal
 */
export function __resetCrossSearchIndexCache(): void {
  cachedIndex = null;
}

export async function buildCrossSearchIndex(): Promise<CrossSearchItem[]> {
  if (cachedIndex) return cachedIndex;

  const items: CrossSearchItem[] = [];

  await Promise.allSettled([
    // 主要機能・ページ（横断検索の最重要導線＝最初に追加して優先度を担保）
    import('@/data/features-catalog').then(({ FEATURES }) => {
      for (const f of FEATURES) {
        items.push({
          id: `feature-${f.slug}`,
          title: f.title,
          subtitle: f.summary,
          keywords: [...(f.tags ?? []), f.category, f.slug],
          category: 'feature',
          url: f.href,
        });
      }
    }),

    // 教育資格DB（特別教育・技能講習・職長・免許）＝完了条件の到達先
    import('@/data/education-rules').then(({ ALL_CERTS }) => {
      for (const c of ALL_CERTS) {
        const label = CERT_TYPE_LABEL[c.certType];
        items.push({
          id: `edu-cert-${c.id}`,
          title: c.name,
          subtitle: `${label}　${c.relatedLaw}`,
          // 区分ラベル（「特別教育」等）を keyword に含め、複数語クエリで AND マッチさせる
          keywords: [...c.keywords, label, c.relatedLaw, c.targetWork],
          category: 'education',
          url: `/education-certification#${CERT_TYPE_ANCHOR[c.certType]}`,
        });
      }
    }),

    // 条文（安衛法・関連政令・省令）
    import('@/data/laws').then(({ allLawArticles }) => {
      for (const a of allLawArticles) {
        items.push({
          id: `law-${a.lawShort}-${a.articleNum}`,
          title: a.articleTitle || `${a.lawShort}${a.articleNum}`,
          subtitle: `${a.lawShort}　${a.articleNum}`,
          keywords: [...a.keywords, a.articleTitle, a.law, a.lawShort, a.articleNum],
          category: 'law',
          url: `/law-search?q=${encodeURIComponent(`${a.lawShort} ${a.articleNum}`)}`,
        });
      }
    }),

    // 通達・告示・指針
    import('@/data/mhlw-notices').then(({ mhlwNotices }) => {
      for (const n of mhlwNotices) {
        items.push({
          id: `notice-${n.id}`,
          title: n.title,
          subtitle: `${n.noticeNumber ?? n.docType} ${n.issuedDateRaw ?? ''}`.trim(),
          keywords: [n.docType, n.noticeNumber ?? '', n.category, n.issuer ?? ''].filter(Boolean),
          category: 'notice',
          url: `/resources?q=${encodeURIComponent(n.title.slice(0, 50))}`,
        });
      }
    }),

    // 労災・労働判例
    import('@/data/court-cases').then(({ COURT_CASES }) => {
      for (const c of COURT_CASES) {
        items.push({
          id: `precedent-${c.id}`,
          title: c.name,
          subtitle: `${c.court}　${c.dateLabelJa}　${c.oneLine}`,
          keywords: [c.field, ...c.issues, c.court],
          category: 'precedent',
          url: `/court-cases/${c.id}`,
        });
      }
    }),

    // 安全標識
    import('@/data/safety-signs').then(({ SAFETY_SIGNS }) => {
      for (const s of SAFETY_SIGNS) {
        items.push({
          id: `sign-${s.id}`,
          title: s.name,
          subtitle: s.meaning,
          keywords: [s.nameEn, s.category, s.meaning],
          category: 'sign',
          url: `/safety-signs/sign/${s.id}`,
        });
      }
    }),

    // 化学物質（詳細モック 50 種）
    import('@/data/mock/chemical-substances-db').then(({ chemicalSubstances }) => {
      for (const c of chemicalSubstances) {
        items.push({
          id: `chem-mock-${c.id}`,
          title: c.name,
          subtitle: `CAS ${c.cas}${c.name_en ? ` / ${c.name_en}` : ''}`,
          keywords: [c.cas, c.name_en ?? ''].filter(Boolean),
          category: 'chemical',
          url: `/chemical-database?q=${encodeURIComponent(c.name)}`,
        });
      }
    }),

    // 化学物質（MHLW コンパクト索引 約 919 種）
    import('@/data/chemicals-mhlw/compact.json').then((mod) => {
      const data = mod as unknown as {
        entries?: CompactChemicalEntry[];
        default?: { entries?: CompactChemicalEntry[] };
      };
      const entries: CompactChemicalEntry[] = data.entries ?? data.default?.entries ?? [];
      const seen = new Set<string>();
      for (const e of entries) {
        if (e.name && !seen.has(e.name)) {
          seen.add(e.name);
          items.push({
            id: `chem-mhlw-${e.cas}-${e.category}`,
            title: e.name,
            subtitle: `CAS ${e.cas} / ${e.categoryLabel}`,
            keywords: [e.cas, e.categoryLabel],
            category: 'chemical',
            url: `/chemical-database?q=${encodeURIComponent(e.name)}`,
          });
        }
      }
    }),

    // 事故事例（複数モックファイル）
    Promise.all([
      import('@/data/mock/real-accident-cases'),
      import('@/data/mock/real-accident-cases-extra'),
      import('@/data/mock/real-accident-cases-extra2'),
      import('@/data/mock/real-accident-cases-extra3'),
      import('@/data/mock/real-accident-cases-diverse-industries'),
    ]).then((mods) => {
      const seen = new Set<string>();
      for (const mod of mods) {
        const cases = mod as {
          realAccidentCases?: unknown[];
          realAccidentCasesExtra?: unknown[];
          realAccidentCasesExtra2?: unknown[];
          realAccidentCasesExtra3?: unknown[];
          realAccidentCasesDiverseIndustries?: unknown[];
        };
        const arr = (cases.realAccidentCases ??
          cases.realAccidentCasesExtra ??
          cases.realAccidentCasesExtra2 ??
          cases.realAccidentCasesExtra3 ??
          cases.realAccidentCasesDiverseIndustries ??
          []) as Array<{ id: string; title: string; workCategory: string; type: string }>;
        for (const a of arr) {
          if (!seen.has(a.id)) {
            seen.add(a.id);
            items.push({
              id: `accident-${a.id}`,
              title: a.title,
              subtitle: `${a.workCategory} / ${a.type}`,
              keywords: [a.workCategory, a.type],
              category: 'accident',
              url: `/accidents`,
            });
          }
        }
      }
    }),
  ]);

  cachedIndex = items;
  return items;
}
