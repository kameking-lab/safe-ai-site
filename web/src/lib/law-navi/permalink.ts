/**
 * 法令ナビ 条文パーマリンク（/law-navi/[lawId]/[artSlug]）の変換・解決層。
 *
 * 設計（docs/horei-navi-foundation-2026-07-11/01-diagnosis-and-design.md §2-1、
 * 原案 docs/fable-diagnosis-2026-07-02/T6-law-permalink-bundle-design.md 案A）:
 * - lawId = e-Gov 法令番号（`LAW_METADATA.egovLawId`）。ASCII安定・e-Gov原文と1:1・
 *   法令改称に不変。egovLawId を持たない法令（指針・ガイドライン等）はページを作らない
 *   （捏造URLゼロ）。
 * - artSlug = 条番号の機械規則スラグ。`第61条`→`61`、`第151条の67`→`151-67`、
 *   `第7条第2項`→`7-p2`（コーパスに項単位の採録が6件あるため）。
 * - 逆写像はコーパス実データ（curated `allLawArticles`、mhlw補完バンドル除外＝
 *   search-index.ts / O18 と同一方針）を正本にし、slug→条文が一意に解決できることを
 *   permalink.test.ts で機械固定する（幽霊URL 0）。
 */
import { LAW_METADATA } from "@/data/law-metadata";
import { allLawArticles, mhlwLawArticles, type LawArticle } from "@/data/laws";
import { parseArticleNum, type ArticleRef } from "@/lib/article-number-normalize";

/** curated 条文（mhlw 補完バンドル除外＝内部深リンクが着地する集合）。 */
const CURATED: readonly LawArticle[] = (() => {
  const mhlwSet = new Set<unknown>(mhlwLawArticles);
  return allLawArticles.filter((a) => !mhlwSet.has(a));
})();

/** 正式名称 → egovLawId（egovLawId を持つ法令のみ）。 */
const FULL_NAME_TO_EGOV_ID: ReadonlyMap<string, string> = (() => {
  const map = new Map<string, string>();
  for (const meta of Object.values(LAW_METADATA)) {
    if (meta.egovLawId && meta.fullName) map.set(meta.fullName, meta.egovLawId);
  }
  return map;
})();

/**
 * 条番号 → artSlug。パース不能（「第1」など条マーカー無しの指針節番号等）は null。
 * 号レベルはURLにしない（条・枝番・項まで）。
 */
export function articleNumToSlug(articleNum: string): string | null {
  const ref = parseArticleNum(articleNum);
  if (!ref) return null;
  return refToSlug(ref);
}

function refToSlug(ref: ArticleRef): string {
  let slug = String(ref.article);
  if (ref.branch !== undefined) slug += `-${ref.branch}`;
  if (ref.paragraph !== undefined) slug += `-p${ref.paragraph}`;
  return slug;
}

/** 法令ナビの1条文エントリ（生成集合の1要素）。 */
export type LawNaviEntry = {
  readonly article: LawArticle;
  readonly egovLawId: string;
  readonly artSlug: string;
  /** /law-navi/... の内部パス */
  readonly path: string;
};

/**
 * 生成集合（egovLawId 保有法令の curated 条文のうち slug 化できるもの）。
 * コーパス収録順（＝法令内の条文順に人手収録されている順）を保持する。
 * 同一 (law, articleNum) の重複収録は初出を採用（search-index.ts の seen 方針と同型）。
 */
export const LAW_NAVI_ENTRIES: readonly LawNaviEntry[] = (() => {
  const out: LawNaviEntry[] = [];
  const seen = new Set<string>();
  for (const article of CURATED) {
    const egovLawId = FULL_NAME_TO_EGOV_ID.get(article.law);
    if (!egovLawId) continue;
    const artSlug = articleNumToSlug(article.articleNum);
    if (!artSlug) continue;
    const key = `${egovLawId}/${artSlug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ article, egovLawId, artSlug, path: `/law-navi/${egovLawId}/${artSlug}` });
  }
  return out;
})();

/** `${egovLawId}/${artSlug}` → エントリ。 */
const ENTRY_BY_KEY: ReadonlyMap<string, LawNaviEntry> = new Map(
  LAW_NAVI_ENTRIES.map((e) => [`${e.egovLawId}/${e.artSlug}`, e])
);

/** `${正式名称}|${条番号}` → エントリ（law-search 形式からの逆引き用）。 */
const ENTRY_BY_LAW_ART: ReadonlyMap<string, LawNaviEntry> = (() => {
  const map = new Map<string, LawNaviEntry>();
  for (const e of LAW_NAVI_ENTRIES) {
    const key = `${e.article.law}|${e.article.articleNum}`;
    if (!map.has(key)) map.set(key, e);
  }
  return map;
})();

/** ルート解決: /law-navi/[lawId]/[artSlug] → 条文。生成集合外は undefined（404）。 */
export function resolveLawNaviEntry(lawId: string, artSlug: string): LawNaviEntry | undefined {
  return ENTRY_BY_KEY.get(`${lawId}/${artSlug}`);
}

/** 条文 → パーマリンクパス。生成集合外（egovLawId 無し等）は null。 */
export function articlePermalink(article: Pick<LawArticle, "law" | "articleNum">): string | null {
  return ENTRY_BY_LAW_ART.get(`${article.law}|${article.articleNum}`)?.path ?? null;
}

/** `${lawShort}|${条番号}` → エントリ（分野インデックス topics.ts の参照解決用）。 */
const ENTRY_BY_SHORT_ART: ReadonlyMap<string, LawNaviEntry> = (() => {
  const map = new Map<string, LawNaviEntry>();
  for (const e of LAW_NAVI_ENTRIES) {
    const key = `${e.article.lawShort}|${e.article.articleNum}`;
    if (!map.has(key)) map.set(key, e);
  }
  return map;
})();

/** lawShort＋条番号からエントリを引く（topics.ts の参照解決）。 */
export function findEntryByShort(lawShort: string, articleNum: string): LawNaviEntry | undefined {
  return ENTRY_BY_SHORT_ART.get(`${lawShort}|${articleNum}`);
}

/**
 * O18 リンカ（article-ref-linkify）の内部 href（`/law-search?law=&art=`）を、
 * 対象条文が生成集合に在る場合のみ法令ナビのパーマリンクへ書き換える。
 * 在らない・形式が異なる href はそのまま返す（幽霊リンク 0。T6 §6 の方針＝
 * リンカ本体・既存テストは不変更で、新ページ側の薄い後処理として持つ）。
 */
export function rewriteLawSearchHrefToPermalink(href: string): string {
  if (!href.startsWith("/law-search?")) return href;
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(href.slice("/law-search?".length));
  } catch {
    return href;
  }
  const law = params.get("law");
  const art = params.get("art");
  if (!law || !art) return href;
  return ENTRY_BY_LAW_ART.get(`${law}|${art}`)?.path ?? href;
}

/** 同一法令内の前後条（コーパス収録順）。端は undefined。 */
export function adjacentEntries(entry: LawNaviEntry): {
  prev?: LawNaviEntry;
  next?: LawNaviEntry;
} {
  const sameLaw = LAW_NAVI_ENTRIES.filter((e) => e.article.law === entry.article.law);
  const idx = sameLaw.findIndex((e) => e === entry);
  if (idx === -1) return {};
  return {
    prev: idx > 0 ? sameLaw[idx - 1] : undefined,
    next: idx < sameLaw.length - 1 ? sameLaw[idx + 1] : undefined,
  };
}

/** e-Gov 原文リンク。基条は条アンカー付き、枝番・項付きは法令トップ（egov-fallback / O18 と同方針）。 */
export function egovUrlForEntry(entry: LawNaviEntry): string {
  const ref = parseArticleNum(entry.article.articleNum);
  const base = `https://laws.e-gov.go.jp/law/${entry.egovLawId}`;
  if (ref && ref.branch === undefined && ref.paragraph === undefined) {
    return `${base}#Mp-At_${ref.article}`;
  }
  return base;
}
