/**
 * 横断検索のスコアリング（純関数）。
 *
 * 設計方針:
 * - チャットボット既存の正規化（normalizeSearchText）とシノニム展開（expandQuery）を流用。
 * - 空白区切りの各語を AND 条件で扱う（全語がどこかにマッチした項目のみ採用＝精度優先）。
 *   これにより複数語クエリ「アーク溶接 特別教育」が、両語に当たる教育資格DBへ収束する。
 * - 1 語のスコアは field 重み（title > keywords > subtitle）の最大値。シノニム一致は減点。
 * - 同点は カテゴリ優先度 → タイトル短さ → id で決定（テスト安定のための決定的タイブレーク）。
 */
import { normalizeSearchText } from '../fuzzy-search';
import { expandQuery } from '../query-expansion';
import { expandFieldTermsForSearch } from '../rag/field-terms';

/**
 * スコアリングが必要とする最小構造。cross-search の {@link CrossSearchItem} だけでなく、
 * 同形の横断検索インデックス（lib/search-index の SearchItem 等）も受け付けられるよう
 * 汎化した契約。keywords は任意（無い実装でも title/subtitle だけで動く）。
 */
export interface ScorableItem {
  id: string;
  title: string;
  subtitle: string;
  keywords?: string[];
  category: string;
  url: string;
}

/**
 * 同点時のカテゴリ優先度（先頭ほど上位）。機能・教育資格を導線として優先。
 * cross-search 標準の並び。呼び出し側が {@link CrossSearchOptions.categoryPriority} で
 * 独自の並びを渡した場合はそちらを使う（例: 用語集を持つ search-index）。
 */
const DEFAULT_CATEGORY_PRIORITY: readonly string[] = [
  'feature',
  'education',
  'law',
  'notice',
  'precedent',
  'sign',
  'chemical',
  'accident',
];

/** field 重み。 */
const W_TITLE_EXACT = 100;
const W_TITLE_PREFIX = 65;
const W_TITLE_INCLUDES = 45;
const W_KEYWORD_EXACT = 55;
const W_KEYWORD_PARTIAL = 30;
const W_SUBTITLE_INCLUDES = 18;
/** シノニム（リテラル以外）一致への減点係数。 */
const SYNONYM_FACTOR = 0.6;

interface Scorable<T extends ScorableItem> {
  item: T;
  nTitle: string;
  nSubtitle: string;
  nKeywords: string[];
}

/** 配列の同一性をキーに正規化済みフィールドをメモ化（キー入力ごとの再計算を避ける）。 */
const scorableCache = new WeakMap<object, Scorable<ScorableItem>[]>();

function getScorables<T extends ScorableItem>(items: T[]): Scorable<T>[] {
  const cached = scorableCache.get(items);
  if (cached) return cached as Scorable<T>[];
  const built: Scorable<T>[] = items.map((item) => ({
    item,
    // 実データに null/undefined が混じってもクラッシュしないよう coerce
    nTitle: normalizeSearchText(item.title ?? ''),
    nSubtitle: normalizeSearchText(item.subtitle ?? ''),
    nKeywords: (item.keywords ?? []).map((k) => normalizeSearchText(k ?? '')).filter(Boolean),
  }));
  scorableCache.set(items, built as Scorable<ScorableItem>[]);
  return built;
}

/** クエリを AND 用の語に分割（空白区切り・空要素除去）。 */
function queryTerms(query: string): string[] {
  return query.trim().split(/\s+/).filter(Boolean);
}

interface TermSpec {
  /** 正規化したリテラル語。 */
  literal: string;
  /** シノニム展開（リテラルを除いた正規化済み・重複除去）。 */
  synonyms: string[];
  /**
   * 数量・疑問の口語（「何分」「何日前」「1年」「いつまで」…）。
   * タイトル/キーワード索引に対して検索シグナルを持たないため、どこにも
   * マッチしない場合は AND 失敗にせず読み飛ばす（ソフト語）。
   * マッチする場合（例:「1年」がキーワードに実在）は通常どおり加点する。
   */
  soft: boolean;
}

/**
 * 数量・疑問の口語判定。「クビ 何日前」「休憩 何分」「クレーン 点検 1年」の
 * 数量・疑問部分が AND 全滅を招いていた（現場口語ベンチ 2026-07-11 before実測）。
 * 語そのものは概念を持たないため、未マッチ時のみ無視する。
 */
const SOFT_TERM_RE =
  /^(何[分日人回年円歳条件個台時間キロメートルセンチトンｍmMkKgG]*(前|後|まで|ごと|以内)?|いくら|いくつ|いつ(から|まで)?|どこ(で|に|まで)?|誰が?|だれ|なぜ|どう(する|やって|なる|すれば)?|[0-9０-９]+(年|ヶ月|か月|カ月|日|回|人|歳|センチ|メートル|キロ|トン|分|時間)(ごと|以上|以下|以内|未満)?|ルール|決まり|きまり|やり方|方法|日数|回数|人数)$/;

function buildTermSpec(term: string): TermSpec | null {
  const literal = normalizeSearchText(term);
  if (!literal) return null;
  // 正規表現ルール（query-expansion）＋現場語彙辞書（rag/field-terms＝RAGと共有）
  // の二段でシノニムを集める。後者は 2026-07-11 に配線＝「ユンボ」「残業」「有給」等の
  // TERM_EXPANSIONS 側の語彙が横断検索でも効くようにする（コーパス非依存モジュール）。
  const expanded = [
    ...expandQuery(term).split(/\s+/),
    ...expandFieldTermsForSearch(term),
  ]
    .map((p) => normalizeSearchText(p))
    .filter((p) => p && p !== literal);
  return { literal, synonyms: Array.from(new Set(expanded)), soft: SOFT_TERM_RE.test(literal) };
}

/** 1 つの語（正規化済み variant 群のうちのひとつ）に対する field 重みの最大値。 */
function variantScore(variant: string, s: Scorable<ScorableItem>): number {
  if (!variant) return 0;
  let best = 0;
  if (s.nTitle === variant) best = Math.max(best, W_TITLE_EXACT);
  else if (s.nTitle.startsWith(variant)) best = Math.max(best, W_TITLE_PREFIX);
  else if (s.nTitle.includes(variant)) best = Math.max(best, W_TITLE_INCLUDES);
  for (const k of s.nKeywords) {
    if (k === variant) {
      best = Math.max(best, W_KEYWORD_EXACT);
      break; // 完全一致が最高なので打ち切り
    }
    if (k.includes(variant) || variant.includes(k)) best = Math.max(best, W_KEYWORD_PARTIAL);
  }
  if (s.nSubtitle.includes(variant)) best = Math.max(best, W_SUBTITLE_INCLUDES);
  return best;
}

/** 1 語（リテラル＋シノニム）の合成スコア。シノニムは減点して採用。 */
function termScore(spec: TermSpec, s: Scorable<ScorableItem>): number {
  const literalScore = variantScore(spec.literal, s);
  let synonymBest = 0;
  for (const syn of spec.synonyms) {
    synonymBest = Math.max(synonymBest, variantScore(syn, s));
  }
  return Math.max(literalScore, synonymBest * SYNONYM_FACTOR);
}

export interface CrossSearchOptions {
  /** カテゴリ絞り込み。既定は全カテゴリ横断。 */
  category?: string;
  /** 返却上限。既定 12。 */
  limit?: number;
  /**
   * 同点時のカテゴリ優先度（先頭ほど上位）。省略時は cross-search 標準
   * ({@link DEFAULT_CATEGORY_PRIORITY})。ここに無いカテゴリは末尾扱い。
   */
  categoryPriority?: readonly string[];
}

/**
 * 横断検索。全語（AND）にマッチした項目のみを、合成スコア降順で返す。
 * クエリが空なら空配列（候補は呼び出し側で別途用意）。
 */
export function searchCrossIndex<T extends ScorableItem>(
  items: T[],
  query: string,
  options: CrossSearchOptions = {},
): T[] {
  const { category = 'all', limit = 12, categoryPriority = DEFAULT_CATEGORY_PRIORITY } = options;
  const terms = queryTerms(query);
  if (terms.length === 0) return [];

  const specs = terms.map(buildTermSpec).filter((s): s is TermSpec => s !== null);
  if (specs.length === 0) return [];

  const scorables = getScorables(items);
  const pool = category === 'all' ? scorables : scorables.filter((s) => s.item.category === category);

  // 優先度配列に無いカテゴリは末尾（length）へ寄せ、決定的な順序を保つ。
  const priorityOf = (cat: string): number => {
    const idx = categoryPriority.indexOf(cat);
    return idx === -1 ? categoryPriority.length : idx;
  };

  const scored: { s: Scorable<T>; total: number }[] = [];
  for (const s of pool) {
    let total = 0;
    let allMatched = true;
    let matchedCount = 0;
    for (const spec of specs) {
      const score = termScore(spec, s);
      if (score <= 0) {
        // ソフト語（数量・疑問の口語）は未マッチでも AND 失敗にしない。
        if (spec.soft) continue;
        allMatched = false;
        break;
      }
      total += score;
      matchedCount += 1;
    }
    // 全語がソフト語で1語もマッチしない場合は不採用（全件マッチ化の防止）。
    if (allMatched && matchedCount > 0) scored.push({ s, total });
  }

  scored.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    const pa = priorityOf(a.s.item.category);
    const pb = priorityOf(b.s.item.category);
    if (pa !== pb) return pa - pb;
    if (a.s.nTitle.length !== b.s.nTitle.length) return a.s.nTitle.length - b.s.nTitle.length;
    return a.s.item.id < b.s.item.id ? -1 : 1;
  });

  return scored.slice(0, limit).map((x) => x.s.item);
}
