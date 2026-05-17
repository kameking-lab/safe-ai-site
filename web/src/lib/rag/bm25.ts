import type { LawArticle } from "@/data/laws";

/**
 * BM25 (Best Matching 25) スパース検索の最小実装。
 *
 * 既存の calcScore（キーワード/タイトル/法令名マッチによるデンス的スコア）と
 * 並走させ、`final = α * dense + (1-α) * bm25` でハイブリッド化することで、
 * 同義語辞書/PIN ではカバーできない自由文クエリへのロバスト性を上げる。
 *
 * 設計:
 * - **トークン**は既存 tokenize と同じ（normalizeSearchText 適用、助詞分割）で揃え、
 *   デンス側との語彙整合を保つ。
 * - **文書**は `title + ' ' + keywords.join(' ') + ' ' + text`。タイトルとキーワードは
 *   2回繰り返して重みを与える（簡易フィールド重み）。
 * - **IDF** は標準的な `log((N - df + 0.5)/(df + 0.5) + 1)` を採用。
 * - **k1 = 1.2, b = 0.5**。日本語の条文は短いので b（長さ補正）を控えめにする。
 * - インデックスはモジュールスコープで遅延構築する（テストでも一度だけ）。
 */

const K1 = 1.2;
const B = 0.5;

type BM25Index = {
  /** 各文書のトークン頻度マップ */
  tf: Map<string, Map<string, number>>;
  /** トークン → 出現文書数 */
  df: Map<string, number>;
  /** 各文書の長さ（トークン数） */
  docLen: Map<string, number>;
  /** 文書平均長 */
  avgdl: number;
  /** 文書総数 */
  n: number;
  /** IDF キャッシュ */
  idf: Map<string, number>;
};

function articleId(a: LawArticle): string {
  // law + articleNum で一意（label 単独だと改正版が衝突する可能性があるため）
  return `${a.law}::${a.articleNum}`;
}

function buildDocText(a: LawArticle): string {
  // タイトルとキーワードを2回繰り返して重み付け
  const title = (a.articleTitle ?? "").repeat(2);
  const keywords = (a.keywords ?? []).join(" ").repeat(2);
  return `${title} ${keywords} ${a.text}`;
}

let cachedIndex: BM25Index | null = null;
let cachedCorpusKey = "";

/**
 * BM25 インデックスを構築する。`tokenize` 関数を依存性注入することで、
 * 既存トークナイザ（rag-search.ts の内部 tokenize 同等）と整合させる。
 */
export function buildBM25Index(
  articles: LawArticle[],
  tokenize: (s: string) => string[],
): BM25Index {
  const tf = new Map<string, Map<string, number>>();
  const df = new Map<string, number>();
  const docLen = new Map<string, number>();
  let totalLen = 0;

  for (const a of articles) {
    const id = articleId(a);
    const tokens = tokenize(buildDocText(a));
    const counts = new Map<string, number>();
    for (const t of tokens) counts.set(t, (counts.get(t) ?? 0) + 1);
    tf.set(id, counts);
    docLen.set(id, tokens.length);
    totalLen += tokens.length;
    for (const t of counts.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  }

  const n = articles.length;
  const avgdl = n === 0 ? 1 : totalLen / n;

  const idf = new Map<string, number>();
  for (const [t, dfi] of df) {
    idf.set(t, Math.log((n - dfi + 0.5) / (dfi + 0.5) + 1));
  }

  return { tf, df, docLen, avgdl, n, idf };
}

export function getOrBuildIndex(
  articles: LawArticle[],
  tokenize: (s: string) => string[],
): BM25Index {
  // コーパスサイズで簡易に変化検出（コーパス置換時にキャッシュを破棄）
  const key = `${articles.length}|${articles[0]?.law ?? ""}|${articles.at(-1)?.law ?? ""}`;
  if (cachedIndex && cachedCorpusKey === key) return cachedIndex;
  cachedIndex = buildBM25Index(articles, tokenize);
  cachedCorpusKey = key;
  return cachedIndex;
}

/** 単一文書に対する BM25 スコアを返す。 */
export function bm25Score(
  index: BM25Index,
  article: LawArticle,
  queryTokens: string[],
): number {
  const id = articleId(article);
  const docTf = index.tf.get(id);
  const dl = index.docLen.get(id) ?? 0;
  if (!docTf || dl === 0) return 0;

  let score = 0;
  for (const q of queryTokens) {
    const idf = index.idf.get(q);
    if (!idf) continue;
    const f = docTf.get(q) ?? 0;
    if (f === 0) continue;
    const numerator = f * (K1 + 1);
    const denominator = f + K1 * (1 - B + (B * dl) / index.avgdl);
    score += idf * (numerator / denominator);
  }
  return score;
}

/** テスト/デバッグ用に内部状態のサマリを返す。 */
export function describeIndex(index: BM25Index): {
  docs: number;
  vocab: number;
  avgdl: number;
} {
  return {
    docs: index.n,
    vocab: index.df.size,
    avgdl: Number.parseFloat(index.avgdl.toFixed(2)),
  };
}

/** 主にテスト時、インデックスをクリアする */
export function resetBM25CacheForTests(): void {
  cachedIndex = null;
  cachedCorpusKey = "";
}
