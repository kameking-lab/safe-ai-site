/**
 * condex（条番号インデックス）— 全文層由来の「条番号＋見出しのみ」の軽量索引と、
 * その上で動く純粋な着地解決器（FT-D4 検索統合）。
 *
 * 設計正本: docs/corpus-fulltext-architecture-2026-07-12.md §2-4・§5-2。
 *
 * 役割: curated に無い条番号（例「安衛則630条」）を /search・⌘K から該当の全文条ページ
 * （/law-navi/{egovLawId}/{artSlug}）へ着地させる。**全文本文はクライアントに載せない**——
 * condex は条番号（articleNum）・見出し（caption）・スラグ（artSlug）だけの軽量索引で、
 * サーバー API（/api/law-fulltext-condex）が committed 全文 JSON から射影して配信する
 * （生成物のチェックインなし・クライアントバンドル不可侵）。本モジュールは:
 *   - 型定義（{@link CondexLaw} / {@link CondexArticle} / {@link CondexLanding}）
 *   - **純関数の解決器**（{@link resolveCondexLanding}）——クライアント/サーバー両用・
 *     全文ローダー非依存（server-only を import しない）。
 * のみを持つ。射影の生成は condex-build.ts（server-only）。
 *
 * 【スコア序列不可侵】condex は横断検索の索引（buildSearchIndex）にもスコアリングにも
 * 一切触れない。0 件だったときの救済経路として、別解決で着地リンクを1本足すだけ
 * （§5-2「condex 追加でスコア序列が変わらない＝0件救済にのみ効く重み設計」）。
 */
import { normalizeArticleQuery, expandLawAliases } from "@/lib/cross-search";
import { normalizeFullwidthAlnum, normalizeKanjiNumbers } from "@/lib/article-number-normalize";

/** condex の1条（条番号＋見出しのみ・本文なし）。 */
export type CondexArticle = {
  /** 当サイト正規表記（"第630条" / "第34条の2の3"）。 */
  articleNum: string;
  /** artSlug（sortKey.join("-")＝ "630" / "34-2-3"）。全文条ページの URL スラグと一致。 */
  artSlug: string;
  /** 条見出し（"（食堂及び炊事場）"）。無い条は ""。 */
  caption: string;
  /** 「削除」条か。 */
  isDeleted: boolean;
};

/** condex の1法令（全文収載法令＝FULLTEXT_LAW_IDS の各法令）。 */
export type CondexLaw = {
  /** e-Gov 法令番号（URL の lawId）。 */
  egovLawId: string;
  /** 略称（安衛則）。 */
  lawShort: string;
  /** 正式名称（労働安全衛生規則）。 */
  fullName: string;
  /** e-Gov 履歴 ID（出典表示用）。 */
  revisionId: string;
  /** 全文由来の着地可能な条（curated と slug 占有を除いたギャップ条＝生成ページと同集合）。 */
  articles: CondexArticle[];
};

/** condex API のペイロード。 */
export type CondexPayload = { laws: CondexLaw[] };

/** 条番号クエリの着地先（内部の全文条ページ）。 */
export type CondexLanding = {
  /** /law-navi/{egovLawId}/{artSlug} の内部パス。 */
  path: string;
  /** 略称（安衛則）。 */
  lawShort: string;
  /** 正式名称（労働安全衛生規則）。 */
  fullName: string;
  /** 条番号ラベル（第630条）。 */
  articleLabel: string;
  /** 条見出し（"（食堂及び炊事場）"）。 */
  caption: string;
  /** 「削除」条か。 */
  isDeleted: boolean;
  /** e-Gov 履歴 ID（出典表示用）。 */
  revisionId: string;
};

/**
 * クエリに「第N条」相当の条番号表現が含まれるかの軽量判定（フェッチ前の門番）。
 * 漢数字・全角も拾えるよう正規化してから見る。裸の数字・日付範囲を誤検出しないよう「条」必須。
 */
export function looksLikeArticleQuery(query: string): boolean {
  if (!query) return false;
  const norm = normalizeKanjiNumbers(normalizeFullwidthAlnum(query));
  return /第?\s*[0-9]+\s*条/.test(norm);
}

/**
 * クエリ中の「第N条(のM)*」を全階層の枝番付きで抽出し、artSlug 形（"630" / "34-2-3"）の
 * キーへ畳み込む。項・号は捨てる（全文条ページは条・枝番単位）。
 * 共有の parseArticleNum は枝を1段しか持たないため、多段枝番を保持できる専用実装を使う
 * （loader.ts / fulltext-navi.ts の keyOf・fulltextArtSlug と同一規約）。
 */
function articleKeyOf(text: string): string | null {
  const norm = normalizeKanjiNumbers(normalizeFullwidthAlnum(text));
  const m = /第?\s*([0-9]+)\s*条((?:\s*の\s*[0-9]+)*)/.exec(norm);
  if (!m) return null;
  const parts = [m[1]];
  if (m[2]) {
    for (const b of m[2].split(/\s*の\s*/).filter(Boolean)) parts.push(b);
  }
  return parts.join("-");
}

/**
 * 条番号クエリ（"安衛則630条"・"労働安全衛生規則第六百三十条"・"あんえいそく 630条" 等）を
 * 全文条ページの着地先へ解決する。**純関数**（condex を引数で受ける＝クライアント/サーバー両用）。
 *
 * 規律（誤誘導ゼロ・幽霊 URL ゼロ）:
 *   - 全文収載法令の名前（略称/正式名称/かな読み）がクエリに明示されていること。
 *     裸の条番号から法令を推測しない（egov-fallback と同方針）。
 *   - 条番号が condex（＝実在する生成ページと同集合）に在ることを確認してから着地先を返す。
 *     在らなければ null（curated 収録済み・slug 占有・存在しない条は e-Gov フォールバックへ委ねる）。
 */
export function resolveCondexLanding(query: string, payload: CondexPayload | null): CondexLanding | null {
  if (!query || !query.trim() || !payload || payload.laws.length === 0) return null;

  const key = articleKeyOf(query);
  if (!key) return null;

  // 法令名の検出: かな読み・地続き条番号を吸収した正規形と、素の正規化文字列の双方で見る。
  const expanded = expandLawAliases(normalizeArticleQuery(query));
  const rawNorm = normalizeKanjiNumbers(normalizeFullwidthAlnum(query));
  // 正式名称→略称の順（長い名前を優先＝「労働安全衛生規則」を「労働安全衛生法」より先に）。
  const laws = [...payload.laws].sort(
    (a, b) => Math.max(b.fullName.length, b.lawShort.length) - Math.max(a.fullName.length, a.lawShort.length),
  );
  const law = laws.find((l) => {
    const names = [l.fullName, l.lawShort].filter(Boolean);
    return names.some((n) => expanded.includes(n) || rawNorm.includes(n));
  });
  if (!law) return null;

  const art = law.articles.find((a) => a.artSlug === key);
  if (!art) return null;

  return {
    path: `/law-navi/${law.egovLawId}/${art.artSlug}`,
    lawShort: law.lawShort,
    fullName: law.fullName,
    articleLabel: art.articleNum,
    caption: art.caption,
    isDeleted: art.isDeleted,
    revisionId: law.revisionId,
  };
}
