/**
 * チャットボット RAG の全文フォールバック（FT-D4 検索統合・**server 専用**）。
 *
 * 設計正本: docs/corpus-fulltext-architecture-2026-07-12.md §2-4・§5-2・§6。
 *
 * 【母集団不変が第一の防衛線】RAG の検索母集団（BM25/デンス）は curated のまま一切変えない
 * （全文の BM25 投入は §6 で禁止・別途 eval ガード付き実験タスクのみ）。本モジュールがやるのは
 * ただ 1 つ——**クエリが条番号を直指定していて、その条が curated に無く、全文層に在る**ときに、
 * その1条だけをサーバー側で読み出し、文脈注入用の LawArticle として返す（PIN と同型の追加）。
 *
 * これにより「安衛則630条は？」のような curated 未収録条の直指定質問で、従来 no-hit だった
 * チャットボットが全文条を根拠に回答できる。条番号を直指定しない通常質問（eval 51問はすべて
 * これ）では 1 件も発火しない＝eval:chatbot-gen は構造的に非劣化。
 *
 * 【クライアントバンドル不可侵】loader.ts（server-only・dynamic import）経由でのみ全文を読む。
 * Route Handler からのみ import すること（`server-only` 未導入のため規約で担保＝loader.ts と同方針）。
 */
import { LAW_METADATA } from "@/data/law-metadata";
import { allLawArticles, mhlwLawArticles, type LawArticle } from "@/data/laws";
import { normalizeFullwidthAlnum, normalizeKanjiNumbers } from "@/lib/article-number-normalize";
import { normalizeArticleQuery, expandLawAliases } from "@/lib/cross-search";
import { FULLTEXT_LAW_IDS, resolveFulltextArticle } from "@/lib/laws-fulltext/loader";

/** 全文収載法令（FULLTEXT_LAW_IDS）の名前索引（略称・正式名称→egovLawId）。 */
type FulltextLawName = { egovLawId: string; lawShort: string; fullName: string };

const FULLTEXT_LAW_NAMES: readonly FulltextLawName[] = (() => {
  const idSet = new Set<string>(FULLTEXT_LAW_IDS as readonly string[]);
  const out: FulltextLawName[] = [];
  for (const meta of Object.values(LAW_METADATA)) {
    if (meta.egovLawId && idSet.has(meta.egovLawId)) {
      out.push({ egovLawId: meta.egovLawId, lawShort: meta.lawShort, fullName: meta.fullName });
    }
  }
  return out;
})();

/** curated（mhlw 補完除外）に (lawShort|fullName, articleNum) が在るか。 */
const CURATED_KEY_SET: ReadonlySet<string> = (() => {
  const mhlw = new Set<unknown>(mhlwLawArticles);
  const set = new Set<string>();
  for (const a of allLawArticles) {
    if (mhlw.has(a)) continue;
    set.add(`${a.lawShort}|${a.articleNum}`);
    set.add(`${a.law}|${a.articleNum}`);
  }
  return set;
})();

/** caption（"（見出し）"）の外側全角括弧を外して curated の articleTitle 表記へ合わせる。 */
function captionToTitle(caption: string): string {
  const t = caption.trim();
  const m = /^（([\s\S]*)）$/.exec(t);
  return m ? m[1] : t;
}

/**
 * クエリ中の「第N条(のM)*」を全階層の枝番付きで抽出し、当サイト正規表記の条番号
 * （"第630条" / "第34条の2の3"）へ復元して列挙する。項・号は落とす（条・枝番単位）。
 */
function extractArticleNums(text: string): string[] {
  const norm = normalizeKanjiNumbers(normalizeFullwidthAlnum(text));
  const re = /第?\s*([0-9]+)\s*条((?:\s*の\s*[0-9]+)*)/g;
  const out: string[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(norm)) !== null) {
    const branches = m[2] ? m[2].split(/\s*の\s*/).filter(Boolean) : [];
    const canon = `第${m[1]}条${branches.map((b) => `の${b}`).join("")}`;
    if (!seen.has(canon)) {
      seen.add(canon);
      out.push(canon);
    }
  }
  return out;
}

/**
 * 条番号を直指定するクエリについて、curated に無く全文層に在る条を LawArticle として返す。
 * 発火条件（誤注入ゼロ）:
 *   - クエリに全文収載法令の名前（略称/正式名称/かな読み）が明示、または lawCategory が
 *     全文収載法令に一致していること（裸の条番号から法令を推測しない）。
 *   - 抽出した条番号が curated に無いこと（curated に在れば通常 RAG が引くので触らない）。
 *   - その条が全文層に実在すること（削除条・存在しない条は返さない）。
 *   - 既に RAG がヒット済みの条は返さない（重複防止）。
 *
 * @param query        ユーザー質問文（生）。
 * @param lawCategory  RAG の法令カテゴリ絞り込み（"all" または lawShort）。
 * @param alreadyHit   既に RAG が引いた条（重複除外に使う）。
 */
export async function resolveFulltextRagArticles(
  query: string,
  lawCategory: string,
  alreadyHit: readonly LawArticle[],
): Promise<LawArticle[]> {
  if (!query || !query.trim()) return [];

  const articleNums = extractArticleNums(query);
  if (articleNums.length === 0) return [];

  // 候補法令の決定: クエリに名前が出ている全文法令 ∪（lawCategory が全文法令ならそれ）。
  const expanded = expandLawAliases(normalizeArticleQuery(query));
  const rawNorm = normalizeKanjiNumbers(normalizeFullwidthAlnum(query));
  const candidates = FULLTEXT_LAW_NAMES.filter((l) => {
    if (lawCategory !== "all" && lawCategory === l.lawShort) return true;
    return [l.fullName, l.lawShort].some((n) => expanded.includes(n) || rawNorm.includes(n));
  });
  if (candidates.length === 0) return [];

  const hitKeys = new Set<string>();
  for (const a of alreadyHit) {
    hitKeys.add(`${a.lawShort}|${a.articleNum}`);
    hitKeys.add(`${a.law}|${a.articleNum}`);
  }

  const out: LawArticle[] = [];
  const emitted = new Set<string>();
  for (const law of candidates) {
    for (const articleNum of articleNums) {
      // curated に在る・既ヒット・多重は触らない（curated 母集団に委ねる／重複防止）。
      if (CURATED_KEY_SET.has(`${law.lawShort}|${articleNum}`)) continue;
      if (CURATED_KEY_SET.has(`${law.fullName}|${articleNum}`)) continue;
      if (hitKeys.has(`${law.lawShort}|${articleNum}`)) continue;
      const emitKey = `${law.egovLawId}|${articleNum}`;
      if (emitted.has(emitKey)) continue;

      const fa = await resolveFulltextArticle(law.egovLawId, articleNum);
      if (!fa) continue;

      emitted.add(emitKey);
      out.push({
        law: law.fullName,
        lawShort: law.lawShort,
        articleNum: fa.articleNum,
        articleTitle: captionToTitle(fa.caption),
        text: fa.text,
        keywords: [],
      });
      if (out.length >= 4) return out; // 直指定条の注入は少数に留める（文脈の希釈防止）。
    }
  }
  return out;
}
